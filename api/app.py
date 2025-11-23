# api/app.py
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import sqlite3, json, hashlib, datetime, os
import numpy as np

app = FastAPI(title="Ethical AI Banking - Predict API")

# --- CORS configuration: allow your frontend dev origins here ---
# For Vite default: http://localhost:5173
# If you use another port (3000, 5173, etc.) add it to the list.
# In a production deployment, lock this down to your real frontend domain.
origins = [
    "http://localhost",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware ,
    allow_origins=origins,        # or ["*"] for quick local testing (less secure)
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# --- Load model & explainer ---
MODEL_PATH = os.path.join("model", "pipeline.joblib")
SHAP_PATH = os.path.join("model", "shap_explainer.joblib")
if not os.path.exists(MODEL_PATH):
    raise RuntimeError("Model not found. Run training first (train/train_model.py).")
pipeline = joblib.load(MODEL_PATH)
shap_blob = joblib.load(SHAP_PATH)
explainer = shap_blob["explainer"]
FEATURE_NAMES = shap_blob["feature_names"]

# --- SQLite audit DB ---
DB_PATH = "api_audit.db"
conn = sqlite3.connect(DB_PATH, check_same_thread=False)
c = conn.cursor()
c.execute("""
CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request_id TEXT,
    timestamp TEXT,
    input_json TEXT,
    consent_json TEXT,
    model_version TEXT,
    score REAL,
    label INTEGER,
    shap_json TEXT,
    explanation TEXT,
    hash TEXT
)
""")
conn.commit()

class PredictRequest(BaseModel):
    features: dict
    consent: dict = {"transactions": True, "bureau": True, "behavioral": True}
    request_id: str = None

def compute_hash(payload: dict) -> str:
    text = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(text).hexdigest()

def apply_consent_mask(features: dict, consent: dict):
    f = features.copy()
    defaults = {
        "txn_count_3m": 50,
        "monthly_spend_ratio": 0.4,
        "avg_daily_balance": 20000,
        "bureau_score": 650,
        "late_payments_6m": 0
    }
    if not consent.get("transactions", True):
        for k in ["txn_count_3m", "monthly_spend_ratio", "avg_daily_balance"]:
            if k in f:
                f[k] = defaults[k]
    if not consent.get("bureau", True):
        if "bureau_score" in f:
            f["bureau_score"] = defaults["bureau_score"]
    if not consent.get("behavioral", True):
        for k in ["txn_count_3m", "avg_daily_balance", "late_payments_6m"]:
            if k in f:
                f[k] = defaults[k]
    return f

def nl_from_shap(shap_vals, feature_names, top_k=5):
    arr = list(zip(feature_names, shap_vals))
    arr_sorted = sorted(arr, key=lambda x: -abs(x[1]))
    top = arr_sorted[:top_k]
    sentence = "Top factors: " + "; ".join([f"{n} ({'+' if v>0 else '-'}{abs(v):.3f})" for n,v in top]) + "."
    top_feats = [{"feature": n, "impact": float(v)} for n,v in top]
    return sentence, top_feats

def normalize_consent(consent):
    """
    Ensure consent dict has explicit booleans for keys: transactions, bureau, behavioral.
    Accepts bools, 'true'/'false' strings, '0'/'1', ints. Returns None for missing keys.
    """
    norm = {}
    for k in ("transactions", "bureau", "behavioral"):
        v = consent.get(k, None) if isinstance(consent, dict) else None
        if v is None:
            norm[k] = None
            continue
        if isinstance(v, str):
            v_lower = v.strip().lower()
            if v_lower in ("false", "0", "no", "n"):
                norm[k] = False
            elif v_lower in ("true", "1", "yes", "y"):
                norm[k] = True
            else:
                norm[k] = True
        else:
            norm[k] = bool(v)
    return norm

@app.post("/predict")
def predict(req: PredictRequest):
    # Normalize and log consent immediately
    raw_consent = req.consent if isinstance(req.consent, dict) else {}
    consent_norm = normalize_consent(raw_consent)
    print("DEBUG: incoming consent (normalized):", consent_norm)

    features = req.features if isinstance(req.features, dict) else {}
    request_id = req.request_id or hashlib.sha1(json.dumps(features, sort_keys=True).encode()).hexdigest()[:12]

    # Apply masking only when consent is explicitly False
    def apply_consent_mask_explicit(features, consent):
        f = features.copy()
        defaults = {
            "txn_count_3m": 50,
            "monthly_spend_ratio": 0.4,
            "avg_daily_balance": 20000,
            "bureau_score": 650,
            "late_payments_6m": 0
        }
        if consent.get("transactions") is False:
            for k in ["txn_count_3m", "monthly_spend_ratio", "avg_daily_balance"]:
                if k in f:
                    f[k] = defaults[k]
        if consent.get("bureau") is False:
            if "bureau_score" in f:
                f["bureau_score"] = defaults["bureau_score"]
        if consent.get("behavioral") is False:
            for k in ["txn_count_3m", "avg_daily_balance", "late_payments_6m"]:
                if k in f:
                    f[k] = defaults[k]
        return f

    masked = apply_consent_mask_explicit(features, consent_norm)
    print("DEBUG: masked features used for prediction:", masked)

    df = pd.DataFrame([masked])

    try:
        proba = float(pipeline.predict_proba(df)[:,1][0])
        label = int(proba >= 0.5)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction error: {e}")

    # SHAP explanation (robust)
    try:
        transformed = pipeline.named_steps["preprocessor"].transform(df)
        shap_vals = explainer.shap_values(transformed)
        if isinstance(shap_vals, (list, tuple)):
            shap_arr = np.array(shap_vals)[0]
        else:
            shap_arr = np.array(shap_vals)
        shap_row = shap_arr[0]
    except Exception:
        shap_row = np.zeros(len(FEATURE_NAMES))

    explanation_text, top_feats = nl_from_shap(shap_row, FEATURE_NAMES, top_k=5)

    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    audit_payload = {
        "request_id": request_id,
        "timestamp": timestamp,
        "input": masked,
        "consent": consent_norm,
        "model_version": os.path.basename(MODEL_PATH),
        "score": proba,
        "label": label,
        "top_shap": top_feats,
        "explanation": explanation_text
    }
    audit_hash = compute_hash(audit_payload)

    c.execute("""
        INSERT INTO audit_log (request_id, timestamp, input_json, consent_json, model_version, score, label, shap_json, explanation, hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        request_id,
        timestamp,
        json.dumps(masked),
        json.dumps(consent_norm),
        os.path.basename(MODEL_PATH),
        proba,
        label,
        json.dumps(top_feats),
        explanation_text,
        audit_hash
    ))
    conn.commit()

    return {
        "request_id": request_id,
        "score": proba,
        "label": label,
        "explanation": explanation_text,
        "top_features": top_feats,
        "audit_hash": audit_hash,
        "consent_received": consent_norm
    }

@app.get("/audit/{request_id}")
def get_audit(request_id: str):
    c.execute("SELECT request_id, timestamp, input_json, consent_json, model_version, score, label, shap_json, explanation, hash FROM audit_log WHERE request_id = ?", (request_id,))
    row = c.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return {
        "request_id": row[0],
        "timestamp": row[1],
        "input_features": json.loads(row[2]),
        "consent": json.loads(row[3]),
        "model_version": row[4],
        "score": row[5],
        "label": row[6],
        "top_shap": json.loads(row[7]),
        "explanation": row[8],
        "hash": row[9]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

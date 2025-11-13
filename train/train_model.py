# train/train_model.py
import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
import xgboost as xgb
import shap
from sklearn.metrics import roc_auc_score, f1_score, accuracy_score

os.makedirs("model", exist_ok=True)

DATA_PATH = "data/synthetic_bank_data.csv"

def train_and_save():
    df = pd.read_csv(DATA_PATH)
    X = df.drop(columns=["label"])
    y = df["label"]

    cat_cols = ["purpose"]
    num_cols = [c for c in X.columns if c not in cat_cols]

    preprocessor = ColumnTransformer([
        ("ohe", OneHotEncoder(handle_unknown="ignore", sparse_output=False), cat_cols)
    ], remainder="passthrough")

    model = xgb.XGBClassifier(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42
    )

    pipeline = Pipeline([("preprocessor", preprocessor), ("model", model)])

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    pipeline.fit(X_train, y_train)

    joblib.dump(pipeline, "model/pipeline.joblib")
    print("Saved model/pipeline.joblib")

    # Build SHAP explainer
    # Build feature names: OHE names + remainder
    ohe = pipeline.named_steps["preprocessor"].named_transformers_["ohe"]
    ohe_cols = list(ohe.get_feature_names_out(["purpose"]))
    remainder_cols = [c for c in X_train.columns if c not in cat_cols]
    feature_names = ohe_cols + remainder_cols

    explainer = shap.TreeExplainer(pipeline.named_steps["model"])
    joblib.dump({"explainer": explainer, "feature_names": feature_names}, "model/shap_explainer.joblib")
    print("Saved model/shap_explainer.joblib")

    # Metrics
    preds = pipeline.predict_proba(X_test)[:,1]
    pred_labels = (preds >= 0.5).astype(int)
    metrics = {
        "roc_auc": float(roc_auc_score(y_test, preds)),
        "f1": float(f1_score(y_test, pred_labels)),
        "accuracy": float(accuracy_score(y_test, pred_labels))
    }
    joblib.dump(metrics, "model/metrics.joblib")
    print("Saved model/metrics.joblib:", metrics)

if __name__ == "__main__":
    train_and_save()

// frontend/src/App.jsx
import React, { useState } from "react";
import AuditList from "./components/AuditList.jsx"; // ensure file exists

// helper: save audit id to localStorage (keeps last 20). Fallback to audit_hash if request_id missing.
function saveAuditId(request_id, audit_hash) {
  const id = request_id || (audit_hash ? `hash:${audit_hash}` : null);
  if (!id) return;
  try {
    const raw = localStorage.getItem("audit_ids");
    const arr = raw ? JSON.parse(raw) : [];
    const dedup = [id].concat(arr.filter(x => x !== id)).slice(0, 20);
    localStorage.setItem("audit_ids", JSON.stringify(dedup));
  } catch (e) {
    // if corrupted, overwrite cleanly
    localStorage.setItem("audit_ids", JSON.stringify([id]));
  }
}

export default function App() {
  const [features, setFeatures] = useState({
    age: 30,
    employment_tenure: 2,
    avg_monthly_income: 20000,
    savings_balance: 15000,
    monthly_spend_ratio: 0.6,
    num_past_defaults: 0,
    late_payments_6m: 1,
    bureau_score: 620,
    avg_daily_balance: 12000,
    txn_count_3m: 45,
    loan_amount: 200000,
    loan_term: 24,
    purpose: "personal",
    household_size: 3
  });

  const [consent, setConsent] = useState({
    transactions: true,
    bureau: true,
    behavioral: true
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFeatureChange = (k, v) => setFeatures(s => ({ ...s, [k]: v }));
  const toggleConsent = (k) => setConsent(s => ({ ...s, [k]: !s[k] }));

    // replace the existing runDecision() with this function
    const runDecision = async () => {
    setLoading(true); setError(null); setResult(null);
    try {
      // Ensure the consent values are real booleans (not strings)
      const normalizedConsent = {
        transactions: !!consent.transactions,
        bureau: !!consent.bureau,
        behavioral: !!consent.behavioral
      };

      const payload = { features, consent: normalizedConsent };

      // DEBUG: log payload so you can inspect Network tab / console
      console.log("Sending /predict payload:", payload);

      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { throw new Error("Invalid JSON from server: " + text); }

      if (!res.ok) throw new Error(data.detail || data.error || JSON.stringify(data));

      console.log("PREDICT response:", data);
      setResult(data);

      // Save audit id (use request_id if present, else fallback to audit_hash)
      saveAuditId(data.request_id, data.audit_hash);

      // Optional: show server-interpreted consent in console
      if (data.consent_received) console.log("Server consent_received:", data.consent_received);
    } catch (err) {
      console.error("runDecision error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="container">
      <h1>Explainable Loan Decision</h1>
      <div className="grid" style={{ gridTemplateColumns: "1fr 420px", gap: 18 }}>
        <div>
          <div className="card">
            <h2>Applicant details</h2>

            <label>Age
              <input type="number" value={features.age} onChange={(e)=>handleFeatureChange('age', Number(e.target.value))} className="input" />
            </label>

            <label>Income (₹)
              <input type="number" value={features.avg_monthly_income} onChange={(e)=>handleFeatureChange('avg_monthly_income', Number(e.target.value))} className="input" />
            </label>

            <label>Employment tenure (yrs)
              <input type="number" value={features.employment_tenure} onChange={(e)=>handleFeatureChange('employment_tenure', Number(e.target.value))} className="input" />
            </label>

            <label>Late payments (6m)
              <input type="number" value={features.late_payments_6m} onChange={(e)=>handleFeatureChange('late_payments_6m', Number(e.target.value))} className="input" />
            </label>

            <label>Bureau score
              <input type="number" value={features.bureau_score} onChange={(e)=>handleFeatureChange('bureau_score', Number(e.target.value))} className="input" />
            </label>

            <label>Loan amount
              <input type="number" value={features.loan_amount} onChange={(e)=>handleFeatureChange('loan_amount', Number(e.target.value))} className="input" />
            </label>

            <div className="consent">
              <h3>Consent toggles</h3>
              <label><input type="checkbox" checked={consent.transactions} onChange={()=>toggleConsent('transactions')} /> Allow Transactions</label>
              <label><input type="checkbox" checked={consent.bureau} onChange={()=>toggleConsent('bureau')} /> Allow Credit Bureau</label>
              <label><input type="checkbox" checked={consent.behavioral} onChange={()=>toggleConsent('behavioral')} /> Allow Behavioral</label>
            </div>

            <button className="btn" onClick={runDecision} disabled={loading}>{loading ? "Running..." : "Run Decision"}</button>
            {error && <div style={{color:'#c53030', marginTop:8}}>Error: {error}</div>}
          </div>

          <div className="card" style={{ marginTop: 18 }}>
            <h2>Decision card</h2>
            {!result && <div className="muted">No decision run yet. Fill details and click Run Decision.</div>}
            {result && (
              <div>
                <div className="scoreRow">
                  <div className="score">{result.score.toFixed(3)}</div>
                  <div className={`badge ${result.label ? 'approved' : 'declined'}`}>{result.label ? 'Approved' : 'Declined'}</div>
                </div>
                <p>{result.explanation}</p>

                <h4>Top factors</h4>
                <div className="factors">
                  {result.top_features.map((f,i)=>(
                    <div key={i} className="factor">
                      <div className="fleft">{f.feature}</div>
                      <div className="fright">{f.impact.toFixed(3)}</div>
                      <div className="barWrap">
                        <div className="bar" style={{ width: `${Math.min(100, Math.abs(f.impact)*300)}%`}} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="audit">
                  <div className="muted">Audit hash</div>
                  <div className="hash">{result.audit_hash}</div>
                  <button className="link" onClick={()=>navigator.clipboard.writeText(result.audit_hash)}>Copy audit hash</button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Audit list */}
        <div>
          <AuditList />
        </div>
      </div>

      <footer className="footer">Tip: deny "Credit Bureau" consent and re-run to show consent-aware behavior.</footer>
    </div>
  );
}

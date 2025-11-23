// frontend/src/App.jsx
import React, { useState } from "react";
import AuditList from "./components/AuditList.jsx";

// helper: save audit id to localStorage
function saveAuditId(request_id, audit_hash) {
  const id = request_id || (audit_hash ? `hash:${audit_hash}` : null);
  if (!id) return;
  try {
    const raw = localStorage.getItem("audit_ids");
    const arr = raw ? JSON.parse(raw) : [];
    const dedup = [id].concat(arr.filter(x => x !== id)).slice(0, 20);
    localStorage.setItem("audit_ids", JSON.stringify(dedup));
  } catch (e) {
    localStorage.setItem("audit_ids", JSON.stringify([id]));
  }
}

// Human-readable reasons for negative impact
const NEGATIVE_REASONS = {
  bureau_score: "Your <b>bureau score</b> had a significant negative impact.",
  late_payments_6m: "The number of <b>late payments</b> in the last 6 months was a concern.",
  num_past_defaults: "A history of <b>past defaults</b> negatively impacted the decision.",
  monthly_spend_ratio: "Your <b>monthly spend ratio</b> (spending vs. income) was high.",
  default: (feature) => `The factor <b>${feature.replace(/_/g, ' ')}</b> had a negative impact.`
};

export default function App() {
  const [page, setPage] = useState("main");

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

  const handleFeatureChange = (k, v) =>
    setFeatures((s) => ({ ...s, [k]: v }));

  const toggleConsent = (k) =>
    setConsent((s) => ({ ...s, [k]: !s[k] }));

  // Run AI decision
  const runDecision = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const normalizedConsent = {
        transactions: !!consent.transactions,
        bureau: !!consent.bureau,
        behavioral: !!consent.behavioral
      };

      const payload = { features, consent: normalizedConsent };

      const res = await fetch("http://localhost:8000/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error("Invalid JSON from server: " + text);
      }

      if (!res.ok)
        throw new Error(data.detail || data.error || JSON.stringify(data));

      setResult(data);
      saveAuditId(data.request_id, data.audit_hash);
    } catch (err) {
      console.error("runDecision error:", err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Navbar
  const Navbar = () => (
    <nav className="navbar-main">
      <div className="navbar-container ">
        
        <ul className="navbar-links">
          <li>
            <a
              onClick={() => setPage("main")}
              className={page === "main" ? "active" : ""}
            >
              AI Decision
            </a>
          </li>
          <li>
            <a
              onClick={() => setPage("history")}
              className={page === "history" ? "active" : ""}
            >
              Governance & Audit
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );

  return (
    <>
      <Navbar />
      <div className="container">
        {page === "main" && (
          <div key="main" className="page-content">
            <h1>Ethical AI: Loan Decision Portal</h1>

            {/* INPUT CARD */}
            <div className="card">
              <h2>1. Applicant Details</h2>

              <label>
                Age
                <input
                  type="number"
                  value={features.age}
                  onChange={(e) =>
                    handleFeatureChange("age", Number(e.target.value))
                  }
                  className="input"
                />
              </label>

              <label>
                Income (₹)
                <input
                  type="number"
                  value={features.avg_monthly_income}
                  onChange={(e) =>
                    handleFeatureChange(
                      "avg_monthly_income",
                      Number(e.target.value)
                    )
                  }
                  className="input"
                />
              </label>

              <label>
                Employment tenure (yrs)
                <input
                  type="number"
                  value={features.employment_tenure}
                  onChange={(e) =>
                    handleFeatureChange(
                      "employment_tenure",
                      Number(e.target.value)
                    )
                  }
                  className="input"
                />
              </label>

              <label>
                Late payments (6m)
                <input
                  type="number"
                  value={features.late_payments_6m}
                  onChange={(e) =>
                    handleFeatureChange(
                      "late_payments_6m",
                      Number(e.target.value)
                    )
                  }
                  className="input"
                />
              </label>

              <label>
                Bureau score
                <input
                  type="number"
                  value={features.bureau_score}
                  onChange={(e) =>
                    handleFeatureChange("bureau_score", Number(e.target.value))
                  }
                  className="input"
                />
              </label>

              <label>
                Loan amount
                <input
                  type="number"
                  value={features.loan_amount}
                  onChange={(e) =>
                    handleFeatureChange("loan_amount", Number(e.target.value))
                  }
                  className="input"
                />
              </label>

              <h2 style={{ marginTop: "20px" }}>2. Data & Consent Control</h2>

              <p
                style={{
                  fontSize: "1.4rem",
                  color: "var(--text-secondary)",
                  marginTop: "-12px",
                  marginBottom: "12px"
                }}
              >
                I agree to let the AI use my data for the following purposes:
              </p>

              <div className="consent-group">
                <label>
                  <input
                    type="checkbox"
                    checked={consent.transactions}
                    onChange={() => toggleConsent("transactions")}
                  />
                  Use Transaction History
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={consent.bureau}
                    onChange={() => toggleConsent("bureau")}
                  />
                  Use Credit Bureau Score
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={consent.behavioral}
                    onChange={() => toggleConsent("behavioral")}
                  />
                  Use Behavioral Analytics
                </label>
              </div>

              <button className="btn" onClick={runDecision} disabled={loading}>
                {loading ? "Running..." : "Run Decision"}
              </button>

              {error && (
                <div
                  style={{
                    color: "var(--danger)",
                    marginTop: 12,
                    fontSize: "1.4rem"
                  }}
                >
                  {error}
                </div>
              )}
            </div>

            {/* AI DECISION CARD */}
            <div className="card" style={{ marginTop: 18 }}>
              <h2>3. AI Decision & Explanation</h2>

              {!result && (
                <div className="muted" style={{ fontSize: "1.4rem" }}>
                  No decision run yet. Fill details and click Run Decision.
                </div>
              )}

              {result && (
                <div>
                  <div className="scoreRow">
                    <div className="score">{result.score.toFixed(3)}</div>
                    <div
                      className={`badge ${
                        result.label ? "approved" : "declined"
                      }`}
                    >
                      {result.label ? "Approved" : "Declined"}
                    </div>
                  </div>

                  <p>{result.explanation}</p>

                  {/* NEGATIVE FACTORS */}
                  {!result.label && (
                    <>
                      <h4 style={{ color: "var(--danger)" }}>
                        What We Considered
                      </h4>
                      <ul className="failure-list">
                        {result.top_features
                          .filter((f) => f.impact < 0)
                          .map((f, i) => {
                            const reason =
                              NEGATIVE_REASONS[f.feature] ||
                              NEGATIVE_REASONS.default(f.feature);
                            return (
                              <li
                                key={i}
                                dangerouslySetInnerHTML={{ __html: reason }}
                              />
                            );
                          })}
                      </ul>
                    </>
                  )}

                  {/* ALL SHAP FACTORS */}
                  <h4>Top Factors Influencing This Decision</h4>
                  <div className="factors">
                    {result.top_features.map((f, i) => {
                      const isPositive = f.impact > 0;
                      const barWidth = Math.min(
                        100,
                        Math.abs(f.impact) * 400
                      );
                      return (
                        <div key={i} className="factor">
                          <div className="fleft">{f.feature}</div>
                          <div
                            className={`fright ${
                              isPositive ? "text-positive" : "text-negative"
                            }`}
                          >
                            {isPositive ? "+" : ""}
                            {f.impact.toFixed(3)}
                          </div>
                          <div className="barWrap">
                            <div
                              className={`bar ${
                                isPositive ? "bar-positive" : "bar-negative"
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Audit */}
                  <div className="audit">
                    <div className="muted" style={{ fontSize: "1.3rem" }}>
                      Audit hash
                    </div>
                    <div className="hash">{result.audit_hash}</div>
                    <button
                      className="link"
                      onClick={() =>
                        navigator.clipboard.writeText(result.audit_hash)
                      }
                    >
                      Copy audit hash
                    </button>
                  </div>
                </div>
              )}
            </div>

            <footer className="footer">
              This is a demo for the "Ethical AI in Banking" challenge.
            </footer>
          </div>
        )}

        {/* AUDIT HISTORY PAGE */}
        {page === "history" && (
          <div key="history" className="page-content">
            <h1>AI Governance & Audit Log</h1>
            <p
              style={{
                marginBottom: "16px",
                color: "var(--text-secondary)",
                fontSize: "1.5rem"
              }}
            >
              Review past decisions or search by Request ID or Hash.
            </p>
            <AuditList />
          </div>
        )}
      </div>
    </>
  );
}

// frontend/src/components/AuditList.jsx
import React, { useEffect, useState } from "react";

// --- NEW Human-Friendly JSON Viewer Component ---
function JsonPrettyView({ data }) {
  if (typeof data !== "object" || data === null) {
    return <div className="json-value">{String(data)}</div>;
  }

  const renderValue = (value) => {
    if (typeof value === "boolean") {
      return (
        <span className={value ? "json-bool-true" : "json-bool-false"}>
          {String(value)}
        </span>
      );
    }
    if (typeof value === "string") {
      return <span className="json-value-string">"{value}"</span>;
    }
    return String(value);
  };

  return (
    <div className="json-pretty">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="json-row">
          <div className="json-key">{key.replace(/_/g, " ")}</div>
          <div className="json-value">{renderValue(value)}</div>
        </div>
      ))}
    </div>
  );
}

export default function AuditList() {
  const [ids, setIds] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => refreshList(), []);

  function refreshList() {
    try {
      const raw = localStorage.getItem("audit_ids");
      if (!raw) {
        setIds([]);
        return;
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        setIds([]);
        return;
      }
      setIds(parsed.slice().reverse()); // newest first
    } catch (e) {
      console.error("Failed to read audit_ids", e);
      localStorage.removeItem("audit_ids");
      setIds([]);
    }
  }

  async function fetchAudit(idOrHash) {
    setErr(null);
    setAuditData(null);
    setLoading(true);

    try {
      let id = idOrHash;
      if (!id) throw new Error("Provide a request_id or select one.");

      if (id.startsWith("hash:")) {
        id = id.replace("hash:", "");
      }

      const res = await fetch(
        `http://localhost:8000/audit/${encodeURIComponent(id)}`
      );

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setAuditData(data);
      setSelectedId(idOrHash);
    } catch (e) {
      console.error("fetchAudit error", e);
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  function clearAll() {
    localStorage.removeItem("audit_ids");
    setIds([]);
    setSelectedId("");
    setAuditData(null);
  }

  function downloadJson() {
    if (!auditData) return;

    const blob = new Blob([JSON.stringify(auditData, null, 2)], {
      type: "application/json",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_${auditData.request_id || "unknown"}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="card">
      <h3>Recent Decisions</h3>

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <button className="btn btn-small" onClick={refreshList}>
          Refresh
        </button>
        <button className="btn btn-small btn-danger" onClick={clearAll}>
          Clear List
        </button>
      </div>

      <hr className="divider" />

      <div>
        <div
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            fontWeight: 600,
            marginBottom: 6,
          }}
        >
          Lookup by Request ID or Hash
        </div>

        <div className="lookup-group">
          <input
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            placeholder="request_id or hash:..."
            className="input"
          />
          <button className="btn" onClick={() => fetchAudit(selectedId)}>
            Lookup
          </button>
        </div>
      </div>

      <div style={{ maxHeight: 260, overflow: "auto", marginBottom: 8 }}>
        {ids.length === 0 && (
          <div className="muted" style={{ fontSize: "1.4rem" }}>
            No audits captured yet. Run a decision to create entries.
          </div>
        )}

        {ids.map((id) => (
          <div key={id} className="audit-list-item">
            <div className="audit-id">{id}</div>
            <button className="btn btn-small" onClick={() => fetchAudit(id)}>
              View
            </button>
          </div>
        ))}
      </div>

      {loading && (
        <div className="muted" style={{ fontSize: "1.4rem" }}>
          Loading audit...
        </div>
      )}

      {err && (
        <div className="error" style={{ color: "var(--danger)" }}>
          Error: {err}
        </div>
      )}

      {auditData && (
        <div style={{ marginTop: 10 }}>
          <hr className="divider" />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Request ID
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  marginBottom: 6,
                  fontSize: "1.4rem",
                }}
              >
                {auditData.request_id}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Timestamp
              </div>
              <div style={{ fontSize: "1.4rem" }}>
                {new Date(auditData.timestamp).toLocaleString()}
              </div>
            </div>

            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  fontWeight: 600,
                }}
              >
                Score
              </div>
              <div style={{ fontSize: "2.2rem", fontWeight: 700 }}>
                {Number(auditData.score).toFixed(3)}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button
              className="btn btn-small"
              onClick={() => navigator.clipboard.writeText(auditData.hash)}
            >
              Copy Hash
            </button>
            <button className="btn btn-small" onClick={downloadJson}>
              Download JSON
            </button>
          </div>

          <h4 style={{ marginTop: 16 }}>Inputs (Masked)</h4>
          <JsonPrettyView data={auditData.input_features} />

          <h4 style={{ marginTop: 16 }}>Consent Snapshot</h4>
          <JsonPrettyView data={auditData.consent} />

          <h4 style={{ marginTop: 16 }}>Top SHAP Features</h4>
          <ul style={{ paddingLeft: 4 }}>
            {auditData.top_shap?.map((f, i) => (
              <li
                key={i}
                style={{
                  fontSize: "1.4rem",
                  marginBottom: 4,
                  fontFamily: '"Fira Code", monospace',
                }}
              >
                {f.feature}:{" "}
                <span
                  style={{
                    color:
                      f.impact > 0
                        ? "var(--positive)"
                        : "var(--danger)",
                  }}
                >
                  {Number(f.impact).toFixed(4)}
                </span>
              </li>
            ))}
          </ul>

          <h4 style={{ marginTop: 16 }}>Explanation</h4>
          <div
            style={{
              background: "var(--bg-light)",
              padding: "12px 14px",
              borderRadius: 8,
              border: "1px solid var(--border-color)",
              fontSize: "1.4rem",
              lineHeight: 1.6,
            }}
          >
            {auditData.explanation}
          </div>
        </div>
      )}
    </div>
  );
}

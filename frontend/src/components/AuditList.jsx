// frontend/src/components/AuditList.jsx
import React, { useEffect, useState } from "react";

/**
 * Improved AuditList:
 * - Reads audit_ids from localStorage
 * - Allows manual lookup by request_id or audit_hash
 * - Robust JSON parsing and error messages
 */
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
      if (!raw) { setIds([]); return; }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) { setIds([]); return; }
      setIds(parsed.slice().reverse());
    } catch (e) {
      console.error("Failed to read audit_ids from localStorage", e);
      // clear corrupted key to recover
      localStorage.removeItem("audit_ids");
      setIds([]);
    }
  }

  async function fetchAudit(idOrHash) {
    setErr(null);
    setAuditData(null);
    setLoading(true);
    try {
      // support fallback entries like "hash:<hex>"
      let id = idOrHash;
      if (!id) throw new Error("Provide a request_id or select one from the list.");
      if (id.startsWith("hash:")) {
        // There is no dedicated endpoint for hash; try request_id endpoint anyway
        // If your backend stores only request_id keys, users should copy request_id not hash.
        // We'll still try to call /audit/{id} (it will likely 404). Show helpful message.
        id = id.replace("hash:", "");
      }
      const res = await fetch(`http://localhost:8000/audit/${encodeURIComponent(id)}`);
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
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: "application/json" });
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
      <h3>Audit History</h3>

      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <button className="btn" onClick={refreshList}>Refresh</button>
        <button className="btn" onClick={clearAll} style={{ background:'#ef4444' }}>Clear</button>
      </div>

      <div style={{ marginBottom:8 }}>
        <div style={{ fontSize:12, color:'#6b7280' }}>Quick lookup (paste request_id or "hash:..." for audit_hash)</div>
        <div style={{ display:'flex', gap:8, marginTop:6 }}>
          <input value={selectedId} onChange={e=>setSelectedId(e.target.value)} placeholder="request_id or hash:..." className="input" />
          <button className="btn" onClick={()=>fetchAudit(selectedId)}>Lookup</button>
        </div>
      </div>

      <div style={{ maxHeight:260, overflow:'auto', marginBottom:8 }}>
        {ids.length === 0 && <div className="muted">No audits captured yet. Run a decision to create audit entries.</div>}
        {ids.map(id => (
          <div key={id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:8, border:'1px solid #eef2f7', borderRadius:6, marginBottom:6 }}>
            <div style={{ fontFamily:'monospace', fontSize:13 }}>{id}</div>
            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" onClick={()=>fetchAudit(id)}>View</button>
            </div>
          </div>
        ))}
      </div>

      {loading && <div className="muted">Loading audit...</div>}
      {err && <div className="error">Error: {err}</div>}

      {auditData && (
        <div style={{ marginTop:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Request ID</div>
              <div style={{ fontFamily:'monospace', marginBottom:6 }}>{auditData.request_id}</div>
              <div style={{ fontSize:12, color:'#6b7280' }}>Timestamp</div>
              <div>{auditData.timestamp}</div>
            </div>

            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:12, color:'#6b7280' }}>Score</div>
              <div style={{ fontSize:20, fontWeight:600 }}>{Number(auditData.score).toFixed(3)}</div>
              <div style={{ marginTop:8 }}>
                <button className="btn" onClick={()=>navigator.clipboard.writeText(auditData.hash)} style={{ marginRight:8 }}>Copy Hash</button>
                <button className="btn" onClick={downloadJson}>Download JSON</button>
              </div>
            </div>
          </div>

          <h4 style={{ marginTop:12 }}>Inputs (masked)</h4>
          <pre style={{ background:'#f3f4f6', padding:8, borderRadius:6, maxHeight:150, overflow:'auto' }}>{JSON.stringify(auditData.input_features, null, 2)}</pre>

          <h4 style={{ marginTop:8 }}>Consent snapshot</h4>
          <pre style={{ background:'#f3f4f6', padding:8, borderRadius:6 }}>{JSON.stringify(auditData.consent, null, 2)}</pre>

          <h4 style={{ marginTop:8 }}>Top SHAP features</h4>
          <ul>
            {auditData.top_shap && auditData.top_shap.map((f,i)=> <li key={i}>{f.feature}: {Number(f.impact).toFixed(4)}</li>)}
          </ul>

          <h4 style={{ marginTop:8 }}>Explanation</h4>
          <div style={{ background:'#fff', padding:8, borderRadius:6 }}>{auditData.explanation}</div>
        </div>
      )}
    </div>
  );
}
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export default function EvidenceTab({ caseId }: { caseId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [custody, setCustody] = useState<any[]>([]);
  const [hashCheck, setHashCheck] = useState<any | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get(`/evidence/case/${caseId}`)
      .then(setItems)
      .catch((err: any) => {
        setError(err.message || "Failed to load evidence items");
      });
  }

  async function deleteEvidence(evidenceId: string) {
    setDeletingId(evidenceId);
    setError(null);
    try {
      await api.del(`/evidence/${evidenceId}`);
      if (selected?.id === evidenceId) {
        setSelected(null);
        setCustody([]);
        setHashCheck(null);
        setAnalysisResult(null);
      }
      load();
    } catch (err: any) {
      setError(err.message || "Failed to delete evidence");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }

  useEffect(() => {
    load();
  }, [caseId]);

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append("case_id", caseId);
    fd.append("file", file);
    if (source) fd.append("source", source);
    if (description) fd.append("description", description);
    try {
      const uploadedItem = await api.post("/evidence/upload", fd);
      setFile(null);
      setSource("");
      setDescription("");
      load();
      if (uploadedItem?.id) {
        openCustody(uploadedItem);
      }
    } catch (err: any) {
      setError(err.message || "Failed to upload evidence");
    } finally {
      setUploading(false);
    }
  }

  async function analyze(evidenceId: string) {
    setAnalyzing(evidenceId);
    setAnalysisResult(null);
    setError(null);
    try {
      const result = await api.post(`/analysis/document/${evidenceId}`);
      setAnalysisResult(result);
      load();
    } catch (err: any) {
      setError(err.message || "Failed to run AI analysis on evidence");
    } finally {
      setAnalyzing(null);
    }
  }

  async function verifyHash(item: any) {
    setVerifying(item.id);
    setError(null);
    try {
      const result = await api.get(`/evidence/${item.id}/hash`);
      setHashCheck(result);
      setSelected(item);
      // Reload custody since verify_hash logs a HASH_VERIFIED event
      const c = await api.get(`/evidence/${item.id}/chain-of-custody`);
      setCustody(c);
    } catch (err: any) {
      setError(err.message || "Failed to verify evidence integrity");
    } finally {
      setVerifying(null);
    }
  }

  async function openCustody(item: any) {
    setSelected(item);
    setHashCheck(null);
    setAnalysisResult(null);
    setError(null);
    try {
      const c = await api.get(`/evidence/${item.id}/chain-of-custody`);
      setCustody(c);
    } catch (err: any) {
      setError(err.message || "Failed to load chain of custody");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-danger/15 border border-danger/40 text-danger rounded-lg px-4 py-3 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold">⚠</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs font-mono opacity-70 hover:opacity-100 ml-4 px-2 py-0.5 rounded border border-danger/30"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-4">
          <form onSubmit={upload} className="panel rounded-lg p-4 space-y-2">
            <div className="text-xs font-mono text-muted mb-1">UPLOAD EVIDENCE</div>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-text file:bg-panel2 file:border file:hairline file:rounded file:px-3 file:py-1.5 file:text-xs file:text-cyan file:mr-3"
            />
            <div className="flex gap-2">
              <input
                placeholder="Source (e.g. Seized phone)"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex-1 bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
              />
              <input
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="flex-1 bg-panel2 border hairline rounded px-3 py-2 text-sm outline-none focus:border-cyan"
              />
            </div>
            <button
              disabled={!file || uploading}
              className="bg-cyan/15 border border-cyan/40 text-cyan rounded px-4 py-2 text-sm disabled:opacity-40 transition-colors hover:bg-cyan/25"
            >
              {uploading ? "Hashing & storing…" : "Upload + Hash Evidence"}
            </button>
          </form>

          <div className="panel rounded-lg divide-y divide-hairline">
            {items.map((it) => (
              <div
                key={it.id}
                className={`px-4 py-3 hover:bg-panel2 transition-colors cursor-pointer ${
                  selected?.id === it.id ? "bg-panel2/80 border-l-2 border-cyan" : ""
                }`}
                onClick={() => openCustody(it)}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-text">{it.original_filename}</div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-panel hairline text-muted">
                    {it.status}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-muted mt-1 truncate">
                  SHA-256: <span className="text-[#94A3B8]">{it.sha256_hash}</span>
                </div>
                <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      analyze(it.id);
                    }}
                    disabled={analyzing === it.id}
                    className="text-[11px] bg-panel2 border hairline rounded px-2.5 py-1 text-cyan hover:border-cyan disabled:opacity-50"
                  >
                    {analyzing === it.id ? "Analyzing…" : "Run AI Analysis"}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      verifyHash(it);
                    }}
                    disabled={verifying === it.id}
                    className="text-[11px] bg-panel2 border hairline rounded px-2.5 py-1 text-amber hover:border-amber disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {verifying === it.id && (
                      <span className="inline-block h-2 w-2 rounded-full border border-amber border-t-transparent animate-spin" />
                    )}
                    {verifying === it.id ? "Verifying…" : "Verify Integrity"}
                  </button>

                  {confirmDeleteId === it.id ? (
                    <div
                      className="flex items-center gap-1.5 bg-danger/10 border border-danger/40 rounded px-2 py-0.5 ml-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-danger font-mono font-medium">Delete?</span>
                      <button
                        onClick={() => deleteEvidence(it.id)}
                        disabled={deletingId === it.id}
                        className="text-[10px] font-mono bg-danger text-white hover:bg-danger/80 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                      >
                        {deletingId === it.id ? "Deleting…" : "Confirm"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deletingId === it.id}
                        className="text-[10px] font-mono text-muted hover:text-text px-1 py-0.5"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmDeleteId(it.id);
                      }}
                      className="text-[11px] bg-panel2 border hairline rounded px-2.5 py-1 text-danger/80 hover:text-danger hover:border-danger/50 transition-colors flex items-center gap-1 ml-auto"
                      title="Delete evidence"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {!items.length && (
              <div className="px-4 py-8 text-sm text-muted text-center">
                No evidence uploaded yet. Use the form above to ingest evidence.
              </div>
            )}
          </div>

          {analysisResult && (
            <div className="panel rounded-lg p-4 space-y-2">
              <div className="text-xs font-mono text-cyan tracking-wider">ANALYSIS RESULT</div>
              <div className="text-xs text-text font-mono">
                {analysisResult.entities_extracted} entities · {analysisResult.relationship_edges_created} relationship edges ·{" "}
                {analysisResult.timeline_events_created} timeline events · {analysisResult.rag_chunks_indexed} chunks indexed for AI assistant
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {analysisResult.entities?.slice(0, 30).map((e: any, i: number) => (
                  <span key={i} className="text-[11px] font-mono bg-panel2 border hairline rounded px-2 py-0.5 text-[#E2E8F0]">
                    <span className="text-cyan">{e.entity_type}:</span> {e.value}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {hashCheck && (
            <div className="panel rounded-lg p-4 space-y-2.5 border-t-2 border-t-cyan">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-muted">INTEGRITY CHECK</div>
                <span className="text-[10px] font-mono text-muted">
                  {hashCheck.checked_at ? new Date(hashCheck.checked_at).toLocaleTimeString() : ""}
                </span>
              </div>
              <div
                className={`text-xs font-mono p-2.5 rounded border ${
                  hashCheck.matches
                    ? "text-ok bg-ok/10 border-ok/30"
                    : "text-danger bg-danger/10 border-danger/30"
                }`}
              >
                {hashCheck.matches
                  ? "✓ Hash matches — evidence intact (no tampering detected)"
                  : "✗ TAMPER DETECTED — hash mismatch on re-verification"}
              </div>
              <div className="space-y-1.5 text-[11px] font-mono bg-panel2/60 p-2 rounded border hairline">
                <div>
                  <span className="text-muted">Original: </span>
                  <span className="text-[#94A3B8] break-all">{hashCheck.original_hash}</span>
                </div>
                <div>
                  <span className="text-muted">Current:  </span>
                  <span className={hashCheck.matches ? "text-ok break-all" : "text-danger break-all"}>
                    {hashCheck.current_hash}
                  </span>
                </div>
              </div>
            </div>
          )}

          {selected ? (
            <div className="panel rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-mono text-muted truncate pr-2">
                  CHAIN OF CUSTODY — <span className="text-text">{selected.original_filename}</span>
                </div>
                {confirmDeleteId === selected.id ? (
                  <div className="flex items-center gap-1.5 bg-danger/10 border border-danger/40 rounded px-2 py-0.5 shrink-0">
                    <button
                      onClick={() => deleteEvidence(selected.id)}
                      disabled={deletingId === selected.id}
                      className="text-[10px] font-mono bg-danger text-white hover:bg-danger/80 px-2 py-0.5 rounded transition-colors disabled:opacity-50"
                    >
                      {deletingId === selected.id ? "Deleting…" : "Confirm"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={deletingId === selected.id}
                      className="text-[10px] font-mono text-muted hover:text-text px-1 py-0.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(selected.id)}
                    className="text-[10px] font-mono text-danger/80 hover:text-danger hover:underline shrink-0"
                    title="Delete this evidence"
                  >
                    Delete file
                  </button>
                )}
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
                {custody.map((c) => (
                  <div key={c.id} className="text-xs border-b hairline pb-2.5 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan font-mono font-medium">{c.action}</span>
                      <span className="text-[10px] font-mono text-muted">
                        {new Date(c.timestamp).toLocaleString()}
                      </span>
                    </div>
                    {c.current_hash && (
                      <div className="text-[10px] font-mono text-[#94A3B8] truncate">
                        Hash: {c.current_hash}
                      </div>
                    )}
                    {c.notes && <div className="text-muted text-[11px]">{c.notes}</div>}
                  </div>
                ))}
                {!custody.length && <div className="text-xs text-muted">No custody records logged.</div>}
              </div>
            </div>
          ) : (
            <div className="panel rounded-lg p-4 text-center text-xs text-muted">
              Select an evidence file or click <span className="text-amber">Verify Integrity</span> to view its Chain of Custody trail.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

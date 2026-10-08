"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { ConfidenceBadge } from "@/components/Badges";

export default function TimelineTab({ caseId }: { caseId: string }) {
  const [events, setEvents] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  function load() {
    api.get(`/timeline/case/${caseId}`).then(setEvents).catch((e) => setError(e.message));
    api.get(`/analysis/anomaly/${caseId}`).then(setAnomalies).catch(() => {});
  }

  useEffect(() => {
    load();
  }, [caseId]);

  async function detectAnomalies() {
    setDetecting(true);
    setError("");
    try {
      const result = await api.post(`/analysis/anomaly/${caseId}`);
      setAnomalies(Array.isArray(result) ? result : []);
      // Reload timeline events in case anomaly detection seeded new timeline items
      api.get(`/timeline/case/${caseId}`).then(setEvents).catch(() => {});
    } catch (err: any) {
      setError(err.message || "Anomaly detection failed");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <div className="md:col-span-2 panel rounded-lg p-4">
        <div className="text-xs font-mono text-muted mb-3">UNIFIED FORENSIC TIMELINE</div>
        <div className="relative pl-4 border-l hairline space-y-4 max-h-[520px] overflow-y-auto scrollbar-thin">
          {events.map((e) => (
            <div key={e.id} className="relative">
              <div className="absolute -left-[21px] top-1 w-2 h-2 rounded-full bg-cyan" />
              <div className="text-[11px] font-mono text-muted">{new Date(e.event_timestamp).toLocaleString()}</div>
              <div className="text-sm text-text">{e.event_type.replaceAll("_", " ")}</div>
              {e.description && <div className="text-xs text-muted mt-0.5">{e.description}</div>}
              <div className="mt-1"><ConfidenceBadge label={e.confidence_label} /></div>
            </div>
          ))}
          {!events.length && <div className="text-sm text-muted">No timeline events yet — analyze evidence to populate the timeline.</div>}
        </div>
      </div>

      <div className="panel rounded-lg p-4">
        <div className="text-xs font-mono text-muted mb-3">ANOMALY DETECTION</div>
        <button onClick={detectAnomalies} disabled={detecting}
          className="bg-amber/15 border border-amber/40 text-amber rounded px-3 py-1.5 text-xs mb-3 disabled:opacity-40">
          {detecting ? "Running Isolation Forest…" : "Run anomaly detection"}
        </button>
        <div className="space-y-2 max-h-[440px] overflow-y-auto scrollbar-thin">
          {anomalies.map((a: any) => (
            <div key={a.id} className="text-xs border-b hairline pb-2">
              <div className="flex justify-between">
                <span className="text-danger font-mono">{a.anomaly_type}</span>
                <span className="text-muted font-mono">score {a.anomaly_score}</span>
              </div>
              <div className="text-muted mt-0.5">{a.reason}</div>
            </div>
          ))}
          {!anomalies.length && <div className="text-xs text-muted">No anomalies flagged yet. Needs enough timeline events to model against.</div>}
        </div>
      </div>
    </div>
  );
}

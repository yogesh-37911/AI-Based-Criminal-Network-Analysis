"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import { api } from "@/lib/api";
import { StatusBadge, PriorityDot } from "@/components/Badges";
import OverviewTab from "@/components/case/OverviewTab";
import EvidenceTab from "@/components/case/EvidenceTab";
import GraphTab from "@/components/case/GraphTab";
import TimelineTab from "@/components/case/TimelineTab";
import AssistantTab from "@/components/case/AssistantTab";
import ReportsTab from "@/components/case/ReportsTab";

const TABS = ["Overview", "Evidence Vault", "Investigation Graph", "Timeline", "AI Assistant", "Reports"];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<any>(null);
  const [tab, setTab] = useState("Overview");
  const [statusSaving, setStatusSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get(`/cases/${id}`).then(setCaseData).catch((e) => setError(e.message));
  }, [id]);

  async function updateStatus(status: string) {
    setStatusSaving(true);
    try {
      const updated = await api.put(`/cases/${id}`, { status });
      setCaseData(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStatusSaving(false);
    }
  }

  async function deleteCase() {
    setDeleting(true);
    try {
      await api.del(`/cases/${id}`);
      router.push("/cases");
    } catch (err: any) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (!caseData) return <Shell><div className="p-8 text-muted font-mono text-sm">Loading case…</div></Shell>;

  return (
    <Shell>
      <div className="p-8 max-w-6xl">
        {error && (
          <div className="text-danger text-sm font-mono mb-4 flex items-center justify-between bg-danger/10 border border-danger/30 rounded px-4 py-2">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-danger hover:text-text text-xs ml-4">✕</button>
          </div>
        )}

        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="text-[11px] font-mono text-muted">{caseData.case_number}</div>
            <h1 className="font-head text-2xl text-text">{caseData.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            <PriorityDot priority={caseData.priority} />
            <StatusBadge status={caseData.status} />
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-muted hover:text-danger transition-all p-2 rounded hover:bg-danger/10 border border-transparent hover:border-danger/30"
              title="Archive case"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        </div>
        <p className="text-sm text-muted mb-4 max-w-2xl">{caseData.description}</p>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] font-mono text-muted">SET STATUS:</span>
          {["OPEN", "UNDER_INVESTIGATION", "EVIDENCE_REVIEW", "SUSPECT_IDENTIFIED", "CLOSED"].map((s) => (
            <button
              key={s}
              disabled={statusSaving}
              onClick={() => updateStatus(s)}
              className={`text-[11px] font-mono px-2 py-1 rounded border transition-colors disabled:opacity-40 ${
                caseData.status === s ? "border-cyan text-cyan bg-cyan/10" : "border-hairline text-muted hover:text-text hover:border-cyan/40"
              }`}
            >
              {s.replaceAll("_", " ")}
            </button>
          ))}
        </div>

        <div className="flex gap-1 border-b hairline mb-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 ${
                tab === t ? "border-cyan text-cyan" : "border-transparent text-muted hover:text-text"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Overview" && <OverviewTab caseId={id} />}
        {tab === "Evidence Vault" && <EvidenceTab caseId={id} />}
        {tab === "Investigation Graph" && <GraphTab caseId={id} />}
        {tab === "Timeline" && <TimelineTab caseId={id} />}
        {tab === "AI Assistant" && <AssistantTab caseId={id} />}
        {tab === "Reports" && <ReportsTab caseId={id} />}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="panel rounded-lg p-6 max-w-sm w-full mx-4 shadow-2xl border border-danger/30">
            <div className="text-sm text-text mb-1 font-head">Archive "{caseData.title}"?</div>
            <p className="text-xs text-muted mb-4">
              This will archive the case and set its status to ARCHIVED. Case data and evidence will be preserved for integrity.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                className="border hairline rounded px-4 py-2 text-sm text-muted hover:text-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={deleteCase}
                disabled={deleting}
                className="bg-danger/15 border border-danger/40 text-danger rounded px-4 py-2 text-sm hover:bg-danger/25 transition-colors disabled:opacity-40"
              >
                {deleting ? "Archiving…" : "Archive Case"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}

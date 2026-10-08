"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

function generatePdfDossier(active: any, meta: any) {
  if (!active) return;

  const caseInfo = active["1_case_information"] || {};
  const evidenceSummary = active["3_evidence_summary"] || {};
  const entitiesIdentified = active["4_entities_identified"] || {};
  const aiAnalysis = active["12_ai_analysis"] || {};
  const timeline = active["8_timeline"] || [];
  const anomalies = active["9_anomalies"] || [];
  const findings = active["10_key_findings"] || {};
  const notes = active["13_investigator_notes"] || [];
  const custody = active["14_chain_of_custody"] || {};
  const disclaimer = active["15_disclaimer"] || "";

  const title = meta?.title || `Forensic Report - ${caseInfo.case_number || "Case"}`;
  const printDate = new Date().toLocaleString();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm 12mm 15mm 12mm;
      @bottom-right {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 9px;
        color: #64748b;
        font-family: monospace;
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 24px;
      font-size: 11px;
      line-height: 1.5;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .brand-title {
      font-size: 18px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 10px;
      color: #0284c7;
      font-family: monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .classification-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      font-family: monospace;
      font-size: 9px;
      font-weight: bold;
      color: #334155;
      text-transform: uppercase;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 20px;
    }
    .meta-item { display: flex; flex-direction: column; }
    .meta-label { font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; font-family: monospace; }
    .meta-val { font-size: 12px; font-weight: 600; color: #0f172a; margin-top: 2px; }
    
    h2.section-heading {
      font-size: 12px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-top: 22px;
      margin-bottom: 10px;
      font-family: monospace;
    }
    .ai-box {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-left: 4px solid #0284c7;
      border-radius: 4px;
      padding: 12px 14px;
      margin-bottom: 16px;
      font-size: 11px;
      line-height: 1.6;
      color: #0c4a6e;
      white-space: pre-line;
      page-break-inside: avoid;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      page-break-inside: avoid;
      font-size: 10px;
    }
    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
      text-transform: uppercase;
      font-family: monospace;
    }
    td {
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      color: #1e293b;
      vertical-align: top;
    }
    tr:nth-child(even) { background: #fafafa; }
    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 9px;
      font-weight: 600;
      background: #e0f2fe;
      color: #0369a1;
      margin-right: 4px;
      margin-bottom: 4px;
    }
    .disclaimer-box {
      margin-top: 28px;
      padding: 10px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 4px;
      font-size: 9px;
      color: #92400e;
      line-height: 1.5;
      font-style: italic;
      page-break-inside: avoid;
    }
    .signature-section {
      margin-top: 36px;
      display: flex;
      justify-content: space-between;
      page-break-inside: avoid;
    }
    .sig-block {
      width: 200px;
      border-top: 1px solid #475569;
      padding-top: 4px;
      text-align: center;
      font-size: 9px;
      color: #475569;
      font-family: monospace;
    }
    @media print {
      body { padding: 0; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1 class="brand-title">FORGE-AI FORENSIC DOSSIER</h1>
      <div class="brand-subtitle">Automated Digital Forensics & Case Intelligence System</div>
    </div>
    <div style="text-align: right;">
      <div class="classification-badge">CONFIDENTIAL / LAW ENFORCEMENT SENSITIVE</div>
      <div style="font-size: 9px; color: #64748b; font-family: monospace; margin-top: 4px;">
        Generated: ${printDate}
      </div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-item">
      <span class="meta-label">Case Number</span>
      <span class="meta-val">${caseInfo.case_number || "—"}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Classification</span>
      <span class="meta-val">${caseInfo.crime_type || "Cybercrime"}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Current Status</span>
      <span class="meta-val">${caseInfo.status || "OPEN"}</span>
    </div>
    <div class="meta-item">
      <span class="meta-label">Priority Level</span>
      <span class="meta-val">${caseInfo.priority || "MEDIUM"}</span>
    </div>
  </div>

  <h2 class="section-heading">§1. Executive Case Summary</h2>
  <p style="font-size: 11px; margin-bottom: 14px;">
    <strong>${caseInfo.title || "Investigation Report"}</strong><br>
    ${active["2_investigation_summary"]?.description || "Comprehensive forensic dossier compiled from indexed evidence, chain of custody logs, and multi-vector AI correlation analysis."}
  </p>

  ${
    aiAnalysis.answer
      ? `<h2 class="section-heading">§2. AI Forensic Narrative & Key Findings</h2>
         <div class="ai-box">
           <strong>AI Synthesis (${aiAnalysis.confidence_label || "EVIDENCE_SUPPORTED"}):</strong><br><br>
           ${aiAnalysis.answer}
         </div>`
      : ""
  }

  <h2 class="section-heading">§3. Evidence Items & Cryptographic Hashes (${evidenceSummary.total_evidence_items || 0})</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">File Name</th>
        <th style="width: 15%;">Type</th>
        <th style="width: 45%;">SHA-256 Hash</th>
        <th style="width: 15%;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${(evidenceSummary.items || [])
        .map(
          (it: any) => `
        <tr>
          <td><strong>${it.filename || "Unknown"}</strong></td>
          <td>${it.type || "FILE"}</td>
          <td style="font-family: monospace; font-size: 8.5px;">${it.sha256 || "—"}</td>
          <td>${it.status || "VERIFIED"}</td>
        </tr>`
        )
        .join("")}
    </tbody>
  </table>

  <h2 class="section-heading">§4. Key Extracted Entities & Indicators (${entitiesIdentified.total || 0})</h2>
  <div style="margin-bottom: 14px;">
    ${Object.entries(entitiesIdentified.by_type || {})
      .map(
        ([t, cnt]) => `
      <span class="tag">${t}: <strong>${String(cnt)}</strong></span>`
      )
      .join("")}
  </div>

  ${
    anomalies.length > 0
      ? `<h2 class="section-heading">§5. Flagged Behavioral & Artifact Anomalies (${anomalies.length})</h2>
         <table>
           <thead>
             <tr>
               <th style="width: 25%;">Anomaly Flag</th>
               <th style="width: 15%;">Score</th>
               <th style="width: 60%;">Forensic Observation / Reason</th>
             </tr>
           </thead>
           <tbody>
             ${anomalies
               .map(
                 (a: any) => `
               <tr>
                 <td><strong style="color: #b91c1c;">${a.type}</strong></td>
                 <td style="font-family: monospace;">${(a.score * 100).toFixed(0)}%</td>
                 <td>${a.reason}</td>
               </tr>`
               )
               .join("")}
           </tbody>
         </table>`
      : ""
  }

  ${
    timeline.length > 0
      ? `<h2 class="section-heading">§6. Unified Forensic Chronology (${timeline.length} Events)</h2>
         <table>
           <thead>
             <tr>
               <th style="width: 25%;">Timestamp</th>
               <th style="width: 25%;">Event Type</th>
               <th style="width: 50%;">Description</th>
             </tr>
           </thead>
           <tbody>
             ${timeline
               .slice(0, 15)
               .map(
                 (t: any) => `
               <tr>
                 <td style="font-family: monospace;">${new Date(t.timestamp).toLocaleString()}</td>
                 <td><strong>${t.event_type}</strong></td>
                 <td>${t.description}</td>
               </tr>`
               )
               .join("")}
           </tbody>
         </table>`
      : ""
  }

  <h2 class="section-heading">§7. Chain of Custody & Attestation</h2>
  <p style="font-size: 10px; color: #475569;">
    Total Chain of Custody Operations Logged: <strong>${custody.total_custody_events || 0}</strong>.<br>
    All cryptographic hashes and audit records are signed and preserved in compliance with forensic integrity standards.
  </p>

  <div class="disclaimer-box">
    <strong>LEGAL NOTICE:</strong> ${disclaimer || "This report was generated with AI assistance from indexed case evidence. All conclusions and findings must be independently reviewed and verified by an authorized forensic investigator before being introduced in legal proceedings."}
  </div>

  <div class="signature-section">
    <div class="sig-block">
      Lead Forensic Examiner Signature
    </div>
    <div class="sig-block">
      Supervising Agent / Reviewer
    </div>
    <div class="sig-block">
      Date & Official Seal
    </div>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=850,height=900");
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 350);
  } else {
    // Fallback if popup blocked: trigger direct HTML download
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default function ReportsTab({ caseId }: { caseId: string }) {
  const [reports, setReports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [active, setActive] = useState<any | null>(null);
  const [activeReportMeta, setActiveReportMeta] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"formatted" | "json">("formatted");

  function load() {
    api
      .get(`/reports/case/${caseId}`)
      .then((data: any) => {
        const list = Array.isArray(data) ? data : [];
        setReports(list);
        if (list.length > 0 && !activeReportMeta) {
          view(list[0]);
        }
      })
      .catch((err: any) => setError(err.message || "Failed to load reports"));
  }

  useEffect(() => {
    load();
  }, [caseId]);

  async function generate() {
    setGenerating(true);
    setError("");
    try {
      const rep = await api.post("/reports", { case_id: caseId, format: "JSON" });
      load();
      if (rep && rep.id) {
        view(rep);
      }
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(false);
    }
  }

  async function view(reportItem: any) {
    setActiveReportMeta(reportItem);
    try {
      const content = await api.get(`/reports/${reportItem.id}/content`);
      setActive(content);
    } catch (err: any) {
      setError(err.message || "Failed to load report content");
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="text-danger text-xs font-mono bg-danger/10 border border-danger/30 rounded-lg px-4 py-2.5 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="hover:text-text ml-3">✕</button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Reports Sidebar */}
        <div className="panel rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-cyan tracking-widest">
              15-SECTION REPORTS
            </span>
            <span className="text-[10px] font-mono text-muted">{reports.length} generated</span>
          </div>

          <button
            onClick={generate}
            disabled={generating}
            className="w-full bg-cyan/15 border border-cyan/40 text-cyan hover:bg-cyan/25 transition-all rounded-lg px-3 py-2 text-xs font-mono disabled:opacity-40 shadow-sm"
          >
            {generating ? "Synthesizing AI Forensic Report…" : "＋ Generate New Report"}
          </button>

          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {reports.map((r) => {
              const isSelected = activeReportMeta?.id === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => view(r)}
                  className={`w-full text-left rounded-lg p-3 transition-all border font-mono ${
                    isSelected
                      ? "bg-cyan/10 border-cyan/40 text-text shadow-sm"
                      : "bg-panel2/70 border-hairline text-muted hover:border-cyan/30 hover:text-text"
                  }`}
                >
                  <div className="text-xs font-bold text-text truncate mb-1">
                    {r.title}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted">
                    <span>{new Date(r.created_at).toLocaleDateString()}</span>
                    <span className="px-1.5 py-0.5 rounded bg-panel border hairline">
                      {r.format || "JSON"}
                    </span>
                  </div>
                </button>
              );
            })}
            {!reports.length && (
              <div className="text-xs font-mono text-muted py-6 text-center">
                No reports generated yet. Click above to generate the full forensic dossier.
              </div>
            )}
          </div>
        </div>

        {/* Report Content View */}
        <div className="lg:col-span-2 panel rounded-xl p-5 max-h-[640px] overflow-y-auto scrollbar-thin space-y-4">
          <div className="flex items-center justify-between border-b hairline pb-3 flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-mono text-cyan tracking-widest">
                DOSSIER VIEWER
              </div>
              <h2 className="text-sm font-head text-text font-bold">
                {activeReportMeta?.title || "Report Preview"}
              </h2>
            </div>
            {active && (
              <div className="flex items-center gap-2">
                {/* Export PDF Button */}
                <button
                  onClick={() => generatePdfDossier(active, activeReportMeta)}
                  className="flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-lg bg-cyan/20 hover:bg-cyan/30 text-cyan border border-cyan/40 shadow-sm transition-all"
                  title="Export official court-admissible PDF dossier"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                  <span>Export PDF</span>
                </button>

                <div className="flex items-center gap-1 bg-panel2 p-0.5 rounded-lg border hairline">
                  <button
                    onClick={() => setViewMode("formatted")}
                    className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                      viewMode === "formatted"
                        ? "bg-cyan/15 text-cyan border border-cyan/30"
                        : "text-muted hover:text-text border border-transparent"
                    }`}
                  >
                    Formatted
                  </button>
                  <button
                    onClick={() => setViewMode("json")}
                    className={`text-[10px] font-mono px-2 py-1 rounded transition-colors ${
                      viewMode === "json"
                        ? "bg-cyan/15 text-cyan border border-cyan/30"
                        : "text-muted hover:text-text border border-transparent"
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>
            )}
          </div>

          {active ? (
            viewMode === "json" ? (
              <pre className="text-[11px] text-text whitespace-pre-wrap font-mono leading-relaxed bg-black/40 p-4 rounded-lg border hairline">
                {JSON.stringify(active, null, 2)}
              </pre>
            ) : (
              <div className="space-y-4 font-mono text-xs">
                {/* 1. Case Info */}
                {active["1_case_information"] && (
                  <div className="bg-panel2/60 border hairline rounded-lg p-3.5 space-y-2">
                    <div className="text-[10px] text-cyan font-bold tracking-wider">
                      §1. CASE INFORMATION
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted text-[10px]">CASE #:</span>
                        <div className="text-text font-bold">{active["1_case_information"].case_number}</div>
                      </div>
                      <div>
                        <span className="text-muted text-[10px]">STATUS:</span>
                        <div className="text-cyan">{active["1_case_information"].status}</div>
                      </div>
                      <div>
                        <span className="text-muted text-[10px]">PRIORITY:</span>
                        <div className="text-amber">{active["1_case_information"].priority}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 12. AI Analysis Narrative */}
                {active["12_ai_analysis"] && (
                  <div className="bg-cyan/5 border border-cyan/20 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-cyan font-bold tracking-wider">
                        §2. AI FORENSIC NARRATIVE SYNTHESIS
                      </div>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan/10 text-cyan">
                        {active["12_ai_analysis"].confidence_label || "AI_GENERATED"}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#E2E8F0] leading-relaxed whitespace-pre-line">
                      {active["12_ai_analysis"].answer}
                    </div>
                  </div>
                )}

                {/* 3. Evidence Summary & 4. Entities */}
                <div className="grid md:grid-cols-2 gap-3">
                  {active["3_evidence_summary"] && (
                    <div className="bg-panel2/60 border hairline rounded-lg p-3.5 space-y-2">
                      <div className="text-[10px] text-muted font-bold tracking-wider">
                        §3. EVIDENCE ITEMS ({active["3_evidence_summary"].total_evidence_items})
                      </div>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {(active["3_evidence_summary"].items || []).map((it: any) => (
                          <div key={it.id} className="text-[10px] truncate text-muted">
                            📄 <span className="text-text">{it.filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {active["4_entities_identified"] && (
                    <div className="bg-panel2/60 border hairline rounded-lg p-3.5 space-y-2">
                      <div className="text-[10px] text-muted font-bold tracking-wider">
                        §4. IDENTIFIED ENTITIES ({active["4_entities_identified"].total})
                      </div>
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {Object.entries(active["4_entities_identified"].by_type || {}).map(([t, cnt]) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-panel border hairline text-cyan">
                            {t}: {String(cnt)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 15. Disclaimer */}
                {active["15_disclaimer"] && (
                  <div className="text-[10px] text-muted border-t hairline pt-3 leading-relaxed italic">
                    {active["15_disclaimer"]}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted text-xs font-mono">
              <div className="text-3xl mb-2">📑</div>
              <p>Select a report from the left or generate a new 15-section forensic dossier.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

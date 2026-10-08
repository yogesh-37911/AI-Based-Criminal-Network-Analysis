"use client";

import React, { useState } from "react";

interface NodeItem {
  id: string;
  label: string;
  type: "target" | "ip" | "phone" | "file" | "server";
  anomaly?: boolean;
  role: string;
  details: string;
  x: number;
  y: number;
}

const NODES: NodeItem[] = [
  { id: "1", label: "TARGET-JD-01", type: "target", role: "Primary Suspect (Admin)", details: "Compromised admin credentials used at 02:45 UTC", x: 50, y: 50 },
  { id: "2", label: "192.168.1.105", type: "ip", role: "Internal Workstation", details: "RDP connection initiated without VPN gateway", x: 22, y: 25 },
  { id: "3", label: "+1 (920) 555-0199", type: "phone", role: "Burner SIM (NER Extracted)", details: "Found in memory dump WhatsApp session", x: 20, y: 72 },
  { id: "4", label: "c2.darknet-relay.io", type: "server", anomaly: true, role: "C2 Exfiltration Node", details: "VirusTotal score 14/72 • 2.4 GB egress recorded", x: 78, y: 30 },
  { id: "5", label: "db_vault_v3.enc", type: "file", anomaly: true, role: "Encrypted Exfil Payload", details: "SHA-256: 8f4e19...c7a2 (Verified Tamper-Free)", x: 80, y: 75 },
];

export default function ForensicHudDemo() {
  const [activeTab, setActiveTab] = useState<"graph" | "timeline" | "copilot">("graph");
  const [selectedNode, setSelectedNode] = useState<NodeItem>(NODES[0]);
  const [activeFilter, setActiveFilter] = useState<"all" | "anomalies">("all");

  return (
    <div className="relative w-full rounded-2xl bg-[#0B0F17]/90 border border-white/10 shadow-2xl shadow-cyan-950/40 backdrop-blur-2xl overflow-hidden">
      {/* Top HUD Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-900/90 border-b border-white/10 gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80 border border-red-400" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80 border border-yellow-400" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-400" />
          </div>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-300 uppercase tracking-widest flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              HUD LIVE CONSOLE
            </span>
            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded border border-white/5">
              CASE #FA-2024-0982 (RANSOMWARE_EXFIL)
            </span>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-lg border border-white/10 text-xs font-medium">
          <button
            onClick={() => setActiveTab("graph")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "graph"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Suspect Graph
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "timeline"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Timeline & Anomalies
          </button>
          <button
            onClick={() => setActiveTab("copilot")}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === "copilot"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Citation AI
          </button>
        </div>
      </div>

      {/* Main Display Area */}
      <div className="p-4 sm:p-6 min-h-[420px] flex flex-col justify-between">
        {/* TAB 1: SUSPECT GRAPH */}
        {activeTab === "graph" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
            {/* Visual Graph Canvas (Simulated Cytoscape Map) */}
            <div className="lg:col-span-8 relative min-h-[300px] rounded-xl bg-slate-950/90 border border-white/10 p-4 flex flex-col justify-between overflow-hidden cyber-dots">
              {/* Scanline and Radial Glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.03] to-transparent pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Controls Overlay */}
              <div className="flex items-center justify-between z-10 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-slate-400">Filter:</span>
                  <button
                    onClick={() => setActiveFilter(activeFilter === "all" ? "anomalies" : "all")}
                    className={`px-2 py-0.5 rounded border text-[11px] font-mono transition-colors ${
                      activeFilter === "anomalies"
                        ? "bg-red-500/20 text-red-300 border-red-500/40"
                        : "bg-white/[0.05] text-slate-300 border-white/10 hover:border-cyan-500/30"
                    }`}
                  >
                    {activeFilter === "anomalies" ? "🚨 Anomalies Only" : "🌐 All Entities (5)"}
                  </button>
                </div>
                <div className="text-[11px] font-mono text-slate-400">
                  Click nodes to inspect entity provenance
                </div>
              </div>

              {/* SVG Connecting Lines */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  <linearGradient id="lineGlowCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.4" />
                  </linearGradient>
                  <linearGradient id="lineGlowRed" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                {/* Lines from Center (50%, 50%) to nodes */}
                <line x1="50%" y1="50%" x2="22%" y2="25%" stroke="url(#lineGlowCyan)" strokeWidth="2" strokeDasharray="4 2" />
                <line x1="50%" y1="50%" x2="20%" y2="72%" stroke="url(#lineGlowCyan)" strokeWidth="1.5" />
                <line x1="50%" y1="50%" x2="78%" y2="30%" stroke="url(#lineGlowRed)" strokeWidth="2.5" className="animate-pulse" />
                <line x1="50%" y1="50%" x2="80%" y2="75%" stroke="url(#lineGlowRed)" strokeWidth="2" />
              </svg>

              {/* Interactive Nodes */}
              <div className="relative w-full h-[260px] my-2">
                {NODES.map((node) => {
                  if (activeFilter === "anomalies" && !node.anomaly && node.type !== "target") {
                    return null;
                  }
                  const isSelected = selectedNode.id === node.id;
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedNode(node)}
                      style={{ left: `${node.x}%`, top: `${node.y}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 group p-2.5 rounded-xl transition-all duration-300 focus:outline-none z-20 ${
                        isSelected
                          ? "bg-slate-900 border-2 border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] scale-110"
                          : node.anomaly
                          ? "bg-slate-900/90 border border-red-500/70 hover:border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                          : "bg-slate-900/80 border border-slate-700 hover:border-cyan-400/60"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            node.type === "target"
                              ? "bg-cyan-400 ring-4 ring-cyan-500/30"
                              : node.anomaly
                              ? "bg-red-400 ring-4 ring-red-500/30 animate-pulse"
                              : "bg-teal-400"
                          }`}
                        />
                        <span className="font-mono text-xs font-semibold text-slate-200 group-hover:text-cyan-300">
                          {node.label}
                        </span>
                      </div>
                      {node.anomaly && (
                        <span className="absolute -top-2.5 -right-2 px-1.5 py-0.2 bg-red-500 text-slate-950 font-mono text-[9px] font-bold rounded-full">
                          FLAGGED
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Legend */}
              <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 z-10 pt-2 border-t border-white/5">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-cyan-400" /> Target
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-teal-400" /> Extracted Entity
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Anomaly Threat
                  </span>
                </div>
                <div>NetworkX Community ID: #CLUSTER-04</div>
              </div>
            </div>

            {/* Entity Inspector Sidecard */}
            <div className="lg:col-span-4 flex flex-col justify-between p-4 rounded-xl bg-slate-950/80 border border-white/10">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase text-slate-400 tracking-wider">
                    Entity Inspector
                  </span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono uppercase font-bold rounded ${
                      selectedNode.anomaly
                        ? "bg-red-500/20 text-red-400 border border-red-500/40"
                        : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    }`}
                  >
                    {selectedNode.anomaly ? "ANOMALY DETECTED" : "VERIFIED NODE"}
                  </span>
                </div>

                <div>
                  <h4 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                    {selectedNode.label}
                  </h4>
                  <p className="text-xs text-cyan-400 font-medium">{selectedNode.role}</p>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-lg border border-white/5 space-y-2 text-xs">
                  <div className="text-slate-300">{selectedNode.details}</div>
                  <div className="pt-2 border-t border-white/5 font-mono text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Betweenness Centrality:</span>
                      <span className="text-cyan-300 font-bold">0.842</span>
                    </div>
                    <div className="flex justify-between">
                      <span>PageRank Score:</span>
                      <span className="text-cyan-300 font-bold">0.0914</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Forensic Provenance:</span>
                      <span className="text-emerald-400 font-bold">SHA-256 Verified</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Evidence ID #EV-891</span>
                <button
                  onClick={() => setActiveTab("copilot")}
                  className="text-cyan-400 hover:text-cyan-300 font-medium flex items-center gap-1 hover:underline"
                >
                  Query AI Copilot &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TIMELINE & ANOMALIES */}
        {activeTab === "timeline" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Unified Forensic Chronology</h4>
                <p className="text-xs text-slate-400">
                  Isolation Forest ML score flagged 3 critical high-entropy temporal spikes.
                </p>
              </div>
              <span className="px-2.5 py-1 text-xs font-mono bg-red-500/15 text-red-400 border border-red-500/30 rounded-md flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                3 Anomalies Flagged
              </span>
            </div>

            {/* Timeline Stream */}
            <div className="space-y-2.5">
              <div className="p-3 bg-slate-950/70 border border-white/10 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-cyan-400">02:45:11 UTC</span>
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="text-sm text-slate-200">
                    User <code className="text-cyan-300">JD_ADMIN</code> authenticated via RDP from IP{" "}
                    <code className="text-slate-300">192.168.1.105</code>
                  </span>
                </div>
                <span className="text-xs font-mono text-slate-400">auth.log (line 4,102)</span>
              </div>

              <div className="p-3 bg-red-950/25 border border-red-500/40 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-red-400 font-bold">03:10:48 UTC</span>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-sm text-red-200 font-medium">
                    Massive database dump executed: <code className="text-white">pg_dump -Fc core_cust_db</code> (4.1 GB)
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-red-500 text-slate-950 font-bold rounded">
                  ANOMALY (Score 0.94)
                </span>
              </div>

              <div className="p-3 bg-red-950/25 border border-red-500/40 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-red-400 font-bold">03:22:04 UTC</span>
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span className="text-sm text-red-200 font-medium">
                    Outbound TLS payload stream to <code className="text-white">c2.darknet-relay.io:8443</code>
                  </span>
                </div>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-red-500 text-slate-950 font-bold rounded">
                  EXFILTRATION SPIKE
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CITATION AI COPILOT */}
        {activeTab === "copilot" && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-white/10 flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
                USER
              </div>
              <div>
                <p className="text-xs text-slate-400 font-mono">Investigator Prompt:</p>
                <p className="text-sm text-white font-medium">
                  &ldquo;Did user JD_ADMIN exfiltrate proprietary customer data outside normal operational hours?&rdquo;
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-cyan-500/30 shadow-lg shadow-cyan-950/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-300 text-slate-950 flex items-center justify-center font-mono font-bold text-xs">
                    FA
                  </div>
                  <span className="font-mono text-xs text-cyan-300 font-semibold">FORGE-AI Forensic Assistant</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-[11px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    CONFIRMED FROM EVIDENCE (98.4%)
                  </span>
                  <span className="px-2 py-0.5 text-[11px] font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    ANOMALY FLAGGED
                  </span>
                </div>
              </div>

              <div className="text-sm text-slate-200 leading-relaxed space-y-2">
                <p>
                  <strong>Yes.</strong> Investigation records confirm user account{" "}
                  <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded">JD_ADMIN</code> authenticated via RDP at{" "}
                  <span className="text-white font-semibold">02:45 UTC</span> from IP{" "}
                  <code className="text-cyan-300 bg-cyan-950/60 px-1 py-0.5 rounded">192.168.1.105</code> (outside designated 09:00-18:00 shifts).
                </p>
                <p>
                  At <span className="text-white font-semibold">03:10 UTC</span>, an encrypted 4.1 GB database archive was created and transferred to C2 endpoint{" "}
                  <code className="text-red-300 bg-red-950/60 px-1 py-0.5 rounded">c2.darknet-relay.io</code>.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex flex-wrap items-center gap-3 text-xs font-mono text-slate-400">
                <span className="text-slate-400 font-bold">Grounding Citations:</span>
                <span className="bg-slate-900 px-2 py-1 rounded border border-white/10 text-cyan-300">
                  [auth.log: L4102-4108]
                </span>
                <span className="bg-slate-900 px-2 py-1 rounded border border-white/10 text-cyan-300">
                  [snort_traffic.pcap: Frame 88,401]
                </span>
                <span className="bg-slate-900 px-2 py-1 rounded border border-white/10 text-emerald-400">
                  SHA-256: 8f4e19b8...c7a2
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

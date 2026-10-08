"use client";

import React, { useState } from "react";

export default function BentoFeatures() {
  const [checksumVerified, setChecksumVerified] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const handleReverify = () => {
    setVerifying(true);
    setTimeout(() => {
      setVerifying(false);
      setChecksumVerified(true);
    }, 800);
  };

  return (
    <section id="features" className="py-24 relative overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/20 text-cyan-400 text-xs font-mono uppercase tracking-wider">
            Engine Architecture
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Engineered for <span className="text-gradient-cyan">Forensic Certainty</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Purpose-built to eliminate hallucination, preserve evidentiary sanctity, and accelerate complex multi-vector cyber investigations.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Chain of Custody (Large - 2 cols on lg) */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 sm:p-8 flex flex-col justify-between relative group hover:border-cyan-500/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <button
                  onClick={handleReverify}
                  disabled={verifying}
                  className="px-3 py-1.5 text-xs font-mono rounded-lg bg-white/[0.05] hover:bg-cyan-500/20 text-cyan-300 border border-white/10 hover:border-cyan-500/40 transition-all flex items-center gap-1.5"
                >
                  <svg
                    className={`w-3.5 h-3.5 ${verifying ? "animate-spin text-cyan-400" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {verifying ? "Hashing Blocks..." : "Verify Hash Integrity"}
                </button>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  Tamper-Proof Chain of Custody &amp; Provenance
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  Every uploaded disk image, PCAP file, or memory dump is immediately fingerprinted with cryptographic SHA-256 hashing. All custody handoffs, analysis operations, and entity extractions are recorded in an append-only audit ledger.
                </p>
              </div>

              {/* Live Hash Ledger Simulation */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-white/5 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-white/5">
                  <span>Artifact: memory_dump_win11.raw</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {checksumVerified ? "MATCH: 0 TAMPERING DETECTED" : "VERIFYING..."}
                  </span>
                </div>
                <div className="text-slate-300 flex items-center justify-between">
                  <span className="text-slate-500">SHA-256:</span>
                  <span className="text-cyan-300 truncate max-w-[280px] sm:max-w-md">
                    e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] flex justify-between">
                  <span>Ingested by Officer JD (#BADGE-4421)</span>
                  <span className="text-slate-500">ISO/IEC 27037 Compliant</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Entity Extraction & Resolution */}
          <div className="rounded-2xl glass-panel p-6 sm:p-8 flex flex-col justify-between relative group hover:border-teal-500/40 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Multi-Modal NLP &amp; Entity Resolution
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  High-throughput regex and spaCy NER engines extract phone numbers, crypto wallet addresses, emails, IPs, and MAC addresses.
                </p>
              </div>

              {/* Badges Preview */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="px-2.5 py-1 text-xs font-mono bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 rounded-md">
                  PHONE: +1-920-555-0199
                </span>
                <span className="px-2.5 py-1 text-xs font-mono bg-violet-950/80 text-violet-300 border border-violet-500/30 rounded-md">
                  BTC: 1A1zP1eP5QGefi2...
                </span>
                <span className="px-2.5 py-1 text-xs font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 rounded-md">
                  IP: 192.168.1.105
                </span>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 text-xs font-mono text-slate-400">
              Deterministic scoring • Human confirmation only
            </div>
          </div>

          {/* Card 3: Suspect Graph Analysis */}
          <div className="rounded-2xl glass-panel p-6 sm:p-8 flex flex-col justify-between relative group hover:border-violet-500/40 transition-all">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Suspect Network &amp; Graph Topology
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Materializes PostgreSQL relations into NetworkX &amp; Cytoscape.js for instant betweenness centrality, PageRank, and Louvain community detection.
                </p>
              </div>

              <div className="p-3 bg-slate-950/80 rounded-lg border border-white/5 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Centrality Algorithm:</span>
                  <span className="text-violet-300">Betweenness (0.842)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cluster Detection:</span>
                  <span className="text-violet-300">Louvain Modularity</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 text-xs font-mono text-slate-400">
              Reveals hidden crime syndicates &amp; burner SIMs
            </div>
          </div>

          {/* Card 4: 15-Section Forensic Report Engine (Large - 2 cols on lg) */}
          <div className="lg:col-span-2 rounded-2xl glass-panel p-6 sm:p-8 flex flex-col justify-between relative group hover:border-amber-500/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <span className="px-3 py-1 text-xs font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-lg">
                  Structured Case Export
                </span>
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  15-Section Automated Forensic Intelligence Report
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed max-w-xl">
                  Generates full structured judicial reports compiling executive summaries, chronological timeline records, IOC indicators, suspect network matrices, evidence hash receipts, and confidence-stamped findings.
                </p>
              </div>

              {/* Report Sections Visual Pill Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-xs font-mono text-slate-300">
                <div className="p-2 bg-slate-950/70 border border-white/5 rounded">1. Exec Summary</div>
                <div className="p-2 bg-slate-950/70 border border-white/5 rounded">4. Chain of Custody</div>
                <div className="p-2 bg-slate-950/70 border border-white/5 rounded">8. Anomaly Log</div>
                <div className="p-2 bg-slate-950/70 border border-white/5 rounded">14. Legal Citations</div>
              </div>
            </div>

            <div className="mt-6 pt-3 border-t border-white/10 text-xs font-mono text-slate-400 flex justify-between items-center">
              <span>Canonical JSON + DOCX/PDF Pipeline</span>
              <span className="text-amber-400 font-semibold">Investigator Review</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

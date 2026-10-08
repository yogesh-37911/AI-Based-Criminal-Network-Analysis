"use client";

import React from "react";

const TIERS = [
  {
    tier: "CONFIRMED FROM EVIDENCE",
    color: "emerald",
    badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    desc: "Direct literal match extracted from indexed evidence (e.g. system logs, PCAP frame, email body) with exact file and line citation.",
    example: "User logged in at 02:45 UTC with IP 192.168.1.105 [auth.log: L4102]",
  },
  {
    tier: "SUPPORTED INFERENCE",
    color: "cyan",
    badgeClass: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    desc: "Logical forensic deduction supported by multiple converging evidence nodes (e.g. timestamp proximity + matching MAC address).",
    example: "Device MAC matched target workstation during the exfiltration window.",
  },
  {
    tier: "POTENTIAL CONNECTION",
    color: "violet",
    badgeClass: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    desc: "Probabilistic link or alias correlation suggested by entity resolution, requiring investigator confirmation before entry into record.",
    example: "Phone +1-920-555-0199 shared between target WhatsApp and Telegram handles.",
  },
  {
    tier: "ANOMALY",
    color: "red",
    badgeClass: "bg-red-500/20 text-red-300 border-red-500/40",
    desc: "Statistical or temporal outlier flagged by Isolation Forest machine learning across activity baselines.",
    example: "4.1 GB database dump executed at 03:10 UTC (Score 0.94 / High Anomaly).",
  },
  {
    tier: "INSUFFICIENT EVIDENCE",
    color: "amber",
    badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    desc: "System explicitly declines to generate speculative conclusions when evidence index lacks sufficient grounding.",
    example: "No records found linking suspect to secondary staging host.",
  },
];

export default function ConfidenceMatrix() {
  return (
    <section id="confidence" className="py-24 relative overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-mono uppercase tracking-wider">
            AI Explainability &amp; Trust
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            5-Tier Explainability <span className="text-gradient-cyan">Standard</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            FORGE-AI never presents guesses as facts. Every finding is labeled with a cryptographically auditable confidence level.
          </p>
        </div>

        {/* Matrix Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TIERS.map((tier, idx) => (
            <div
              key={idx}
              className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-slate-500 transition-all"
            >
              <div className="space-y-3">
                <span className={`inline-block px-2.5 py-1 text-xs font-mono font-bold rounded border ${tier.badgeClass}`}>
                  {tier.tier}
                </span>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {tier.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 bg-slate-950/70 p-3 rounded-lg border text-xs font-mono text-slate-400">
                <span className="text-slate-500 block mb-1">Evidentiary Output Example:</span>
                <span className="text-slate-200">{tier.example}</span>
              </div>
            </div>
          ))}

          {/* Callout Box on Courtroom Readiness */}
          <div className="glass-panel p-6 rounded-2xl bg-gradient-to-br from-slate-950 via-cyan-950/30 to-slate-950 border border-cyan-500/30 flex flex-col justify-between">
            <div className="space-y-3">
              <span className="inline-block px-2.5 py-1 text-xs font-mono font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                LEGAL SANCTITY
              </span>
              <h3 className="text-lg font-bold text-white">Court-Tested Admissibility</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                By enforcing explicit confidence levels and unalterable hash citations, FORGE-AI outputs withstand rigorous legal scrutiny in judicial cross-examination.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/5 text-xs font-mono text-cyan-400">
              ✓ Compliant with Digital Evidence Standards
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

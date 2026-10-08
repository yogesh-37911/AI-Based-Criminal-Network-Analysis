"use client";

import React from "react";

const STEPS = [
  {
    step: "01",
    title: "Ingestion & Cryptographic Hashing",
    desc: "Ingest multi-source evidence (disk images, PCAPs, system logs, memory dumps). Every artifact is immediately stamped with a cryptographic SHA-256 checksum and immutable custody record.",
    icon: (
      <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
    ),
    tag: "SHA-256 Verified",
  },
  {
    step: "02",
    title: "NLP Entity Extraction & Resolution",
    desc: "Extract phone numbers, emails, IP addresses, crypto addresses, and suspect handles using spaCy NER and pattern matchers. Link aliases into unified forensic identities with human confirmation.",
    icon: (
      <svg className="w-6 h-6 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    tag: "spaCy NER + Fuzzy Match",
  },
  {
    step: "03",
    title: "Graph Topology & Anomaly Detection",
    desc: "Materialize suspect connections into NetworkX graph algorithms (betweenness centrality, PageRank, Louvain community clustering) and flag temporal spikes using Isolation Forest ML.",
    icon: (
      <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    tag: "Isolation Forest + NetworkX",
  },
  {
    step: "04",
    title: "Citation RAG & Courtroom Reports",
    desc: "Investigators query the citation-grounded assistant strictly from indexed evidence. Compile comprehensive 15-section court-admissible forensic intelligence reports in structured JSON/PDF.",
    icon: (
      <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    tag: "15-Section Court Standard",
  },
];

export default function WorkflowSection() {
  return (
    <section id="pipeline" className="py-24 relative overflow-hidden scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 text-xs font-mono uppercase tracking-wider">
            Forensic Investigation Pipeline
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            From Raw Seizure to{" "}
            <span className="text-gradient-cyan">Court-Admissible Evidence</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            A battle-tested forensic workflow adhering to ISO/IEC 27037 standards for digital evidence integrity.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {STEPS.map((step, idx) => (
            <div
              key={idx}
              className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-cyan-400/40 transition-all group"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {step.icon}
                  </div>
                  <span className="font-mono text-2xl font-black text-slate-700 group-hover:text-cyan-400/60 transition-colors">
                    {step.step}
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/20">
                  {step.tag}
                </span>
                <span>Stage {step.step}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

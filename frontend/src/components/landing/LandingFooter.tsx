"use client";

import React from "react";
import Link from "next/link";

export default function LandingFooter() {
  return (
    <footer className="bg-[#05070B] border-t border-white/10 pt-16 pb-12 relative overflow-hidden">
      {/* Top CTA Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="relative rounded-3xl bg-gradient-to-r from-cyan-950/70 via-slate-900 to-violet-950/70 border border-cyan-500/30 p-8 sm:p-12 text-center overflow-hidden shadow-2xl shadow-cyan-950/30">
          <div className="absolute inset-0 bg-cyber-grid opacity-30 pointer-events-none" />
          <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
            <h3 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Accelerate Your <br />
              <span className="text-gradient-cyan">Forensic Investigations?</span>
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Launch the FORGE-AI investigation console to ingest evidence, explore suspect networks, and generate court-admissible forensic intelligence.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/login"
                className="px-8 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 shadow-[0_0_25px_rgba(34,211,238,0.5)] hover:shadow-[0_0_35px_rgba(34,211,238,0.8)] hover:scale-105 transition-all text-base"
              >
                Access Investigation Console
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3.5 rounded-xl font-medium text-slate-200 bg-slate-900/90 border border-white/10 hover:border-cyan-400/40 hover:text-white transition-all text-base"
              >
                View Live Demo Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Navigation & Columns */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8 pb-12 border-b border-white/10 text-sm">
        {/* Col 1: Brand & Status */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400/40">
              <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-mono text-lg font-bold text-white tracking-wider">
              FORGE<span className="text-cyan-400">-AI</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            AI-powered digital forensic investigation and evidence analysis platform.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-md border border-emerald-500/30 w-fit">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Core Forensic API: Online
          </div>
        </div>

        {/* Col 2: Platform Modules */}
        <div className="space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-bold">
            Investigation Modules
          </h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Case Management</Link></li>
            <li><Link href="/cases" className="hover:text-cyan-400 transition-colors">Digital Evidence Ingest</Link></li>
            <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Suspect Network Graph</Link></li>
            <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Forensic Timeline &amp; ML</Link></li>
            <li><Link href="/dashboard" className="hover:text-cyan-400 transition-colors">Citation AI Assistant</Link></li>
          </ul>
        </div>

        {/* Col 3: Architecture & Security */}
        <div className="space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-bold">
            Tech Architecture
          </h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li>FastAPI Backend (Python 3.11)</li>
            <li>PostgreSQL + pgvector</li>
            <li>spaCy Named Entity Recognition</li>
            <li>NetworkX &amp; Cytoscape.js</li>
            <li>Isolation Forest ML Models</li>
          </ul>
        </div>

        {/* Col 4: Compliance & Integrity */}
        <div className="space-y-3">
          <h4 className="font-mono text-xs uppercase tracking-wider text-slate-200 font-bold">
            Integrity Standards
          </h4>
          <ul className="space-y-2 text-xs text-slate-400 font-mono">
            <li>ISO/IEC 27037 Evidence Handling</li>
            <li>SHA-256 Tamper Verification</li>
            <li>Deterministic Entity Scopes</li>
            <li>Role-Based Access Control (RBAC)</li>
            <li>Immutable Custody Audit Log</li>
          </ul>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-mono gap-4">
        <div>
          &copy; {new Date().getFullYear()} FORGE-AI Forensic Intelligence. Built for Smart India Hackathon.
        </div>
        <div className="flex items-center gap-6">
          <span>Confidentiality: Law Enforcement &amp; DFIR</span>
          <span>Zero Speculation Standard</span>
        </div>
      </div>
    </footer>
  );
}

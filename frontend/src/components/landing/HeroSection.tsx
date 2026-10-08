"use client";

import React from "react";
import Link from "next/link";
import ForensicHudDemo from "./ForensicHudDemo";

export default function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background Decorative Lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[900px] h-[350px] bg-gradient-to-tr from-cyan-500/15 via-teal-500/10 to-violet-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badges & Announcement */}
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-400/30 text-cyan-300 text-xs font-mono tracking-wider uppercase backdrop-blur-md shadow-[0_0_15px_rgba(34,211,238,0.15)] animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Next-Gen Digital Forensics &amp; Evidence AI
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white max-w-5xl leading-[1.1]">
            Autonomous Digital Forensics &amp;{" "}
            <span className="text-gradient-cyan">Evidence Intelligence</span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed">
            Organize digital evidence, review investigative timelines, explore connected entities, and ask an AI assistant that surfaces relevant case material for investigator review.
          </p>

          {/* Action CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              href="/dashboard"
              className="px-7 py-3.5 rounded-xl font-bold text-slate-950 bg-gradient-to-r from-cyan-400 via-teal-300 to-cyan-300 shadow-[0_0_30px_rgba(34,211,238,0.4)] hover:shadow-[0_0_40px_rgba(34,211,238,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2.5 text-base"
            >
              <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Launch Forensic Console</span>
            </Link>

            <a
              href="#ai-copilot"
              className="px-6 py-3.5 rounded-xl font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800/90 border border-white/10 hover:border-cyan-400/40 hover:text-white transition-all flex items-center gap-2.5 text-base backdrop-blur-md"
            >
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Try Live AI Sandbox</span>
            </a>
          </div>

          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 pt-8 pb-4 w-full max-w-4xl text-left border-y border-white/10 mt-6">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-cyan-300">SHA-256</div>
              <div className="text-xs font-mono text-slate-400 uppercase">Evidence integrity checks</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">Source-led</div>
              <div className="text-xs font-mono text-slate-400 uppercase">AI evidence review</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-violet-400">Structured</div>
              <div className="text-xs font-mono text-slate-400 uppercase">Investigation reports</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-bold font-mono text-amber-400">Auditable</div>
              <div className="text-xs font-mono text-slate-400 uppercase">Case activity trail</div>
            </div>
          </div>
        </div>

        {/* Interactive Forensic HUD Hero Showcase */}
        <div id="forensic-hud" className="mt-14 scroll-mt-28">
          <ForensicHudDemo />
        </div>
      </div>
    </section>
  );
}

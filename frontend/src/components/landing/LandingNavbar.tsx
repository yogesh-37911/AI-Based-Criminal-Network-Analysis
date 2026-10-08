"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { getToken } from "@/lib/api";

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    setIsAuthenticated(!!getToken());
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#070A10]/85 backdrop-blur-xl border-b border-white/10 shadow-2xl shadow-cyan-950/20 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-400/40 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all">
            <svg
              className="w-5 h-5 text-cyan-400 transition-transform group-hover:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping opacity-75" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xl font-bold tracking-wider text-white group-hover:text-cyan-300 transition-colors">
                FORGE<span className="text-cyan-400">-AI</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 rounded">
                v1.0
              </span>
            </div>
            <span className="text-[10px] font-mono tracking-tight text-slate-400 uppercase">
              Forensic Intelligence Platform
            </span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a
            href="#features"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            Capabilities
          </a>
          <a
            href="#forensic-hud"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            Forensic HUD
          </a>
          <a
            href="#ai-copilot"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            AI Copilot
          </a>
          <a
            href="#pipeline"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            Workflow
          </a>
          <a
            href="#confidence"
            className="hover:text-cyan-400 transition-colors flex items-center gap-1.5"
          >
            Explainability
          </a>
        </nav>

        {/* Action CTAs */}
        <div className="hidden sm:flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-all"
          >
            {isAuthenticated ? "Switch Account" : "Sign In"}
          </Link>
          <Link
            href={isAuthenticated ? "/dashboard" : "/login"}
            className="relative group px-5 py-2 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.35)] hover:shadow-[0_0_30px_rgba(34,211,238,0.6)] hover:brightness-110 transition-all flex items-center gap-2"
          >
            <span>Launch Console</span>
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white focus:outline-none"
          aria-label="Toggle Navigation"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0B0F17]/95 backdrop-blur-2xl border-b border-white/10 px-6 py-5 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <a
            href="#features"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-cyan-400 text-base font-medium py-1"
          >
            Capabilities
          </a>
          <a
            href="#forensic-hud"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-cyan-400 text-base font-medium py-1"
          >
            Forensic HUD
          </a>
          <a
            href="#ai-copilot"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-cyan-400 text-base font-medium py-1"
          >
            AI Copilot
          </a>
          <a
            href="#pipeline"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-cyan-400 text-base font-medium py-1"
          >
            Workflow
          </a>
          <a
            href="#confidence"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-slate-300 hover:text-cyan-400 text-base font-medium py-1"
          >
            Explainability
          </a>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full text-center py-2.5 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/10 rounded-lg"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="w-full text-center py-2.5 text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-teal-300 rounded-lg shadow-lg shadow-cyan-500/25"
            >
              Launch Console
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

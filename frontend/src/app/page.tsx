"use client";

import React from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import BentoFeatures from "@/components/landing/BentoFeatures";
import InteractiveCopilotPreview from "@/components/landing/InteractiveCopilotPreview";
import WorkflowSection from "@/components/landing/WorkflowSection";
import ConfidenceMatrix from "@/components/landing/ConfidenceMatrix";
import LandingFooter from "@/components/landing/LandingFooter";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#070A10] text-slate-100 selection:bg-cyan-500/30 selection:text-white relative font-body">
      {/* Dynamic Background Cyber Grid & Vignette */}
      <div className="fixed inset-0 bg-cyber-grid bg-[size:32px_32px] opacity-20 pointer-events-none -z-20" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none -z-10" />

      {/* Navigation Header */}
      <LandingNavbar />

      {/* Main Landing Flow */}
      <main className="relative z-10 flex flex-col">
        <HeroSection />
        <BentoFeatures />
        <InteractiveCopilotPreview />
        <WorkflowSection />
        <ConfidenceMatrix />
      </main>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}

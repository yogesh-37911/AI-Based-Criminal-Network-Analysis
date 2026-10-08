"use client";

import React, { useState } from "react";

interface Scenario {
  id: string;
  query: string;
  tag: string;
  confidence: "CONFIRMED FROM EVIDENCE" | "SUPPORTED INFERENCE" | "ANOMALY";
  confidenceScore: string;
  answer: string;
  citations: string[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "s1",
    query: "Identify all connections and anomalous activity for user JD_ADMIN",
    tag: "Suspect Network & Timeline",
    confidence: "CONFIRMED FROM EVIDENCE",
    confidenceScore: "99.1%",
    answer: "User JD_ADMIN initiated an RDP connection from IP 192.168.1.105 at 02:45 UTC. At 03:10 UTC, 4.1 GB of database records was dumped to /tmp/db_vault_v3.enc and transmitted to c2.darknet-relay.io. This matches the anomaly cluster identified by Isolation Forest.",
    citations: ["auth.log: L4102-4108", "pcap_session_88.pcap", "SHA-256: 8f4e19b8...c7a2"],
  },
  {
    id: "s2",
    query: "Check threat intelligence reputation and outbound traffic for darknet-relay.io",
    tag: "Threat Intel & CTI",
    confidence: "CONFIRMED FROM EVIDENCE",
    confidenceScore: "97.8%",
    answer: "Threat intelligence (VirusTotal & AbuseIPDB) identifies c2.darknet-relay.io (IP 185.220.101.5) with 14/72 malicious score (CobaltStrike C2 beaconing). A total of 2.4 GB egress was recorded across port 8443 between 03:22 UTC and 03:45 UTC.",
    citations: ["VirusTotal API Hash VT-9921", "Zeek conn.log: L1043", "AbuseIPDB Confidence: 100%"],
  },
  {
    id: "s3",
    query: "Verify cryptographic integrity and chain of custody for seized hard drive image",
    tag: "Forensic Integrity & Custody",
    confidence: "CONFIRMED FROM EVIDENCE",
    confidenceScore: "100.0%",
    answer: "Disk image 'seized_nvme_drive0.dd' was fingerprinted at seizure (2024-10-27 01:15 UTC) with SHA-256 hash e3b0c44298fc1c14... Re-verification run at 08:30 UTC confirms 0 tampering. 4 custody handoff logs are cryptographically sealed in the append-only ledger.",
    citations: ["Custody Ledger Event #0012", "ISO/IEC 27037 Verification Checksum"],
  },
];

export default function InteractiveCopilotPreview() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [customInput, setCustomInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSelectScenario = (sc: Scenario) => {
    setIsTyping(true);
    setSelectedScenario(sc);
    setTimeout(() => {
      setIsTyping(false);
    }, 400);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = customInput.trim();
    if (!q) return;
    setIsTyping(true);

    const qLower = q.toLowerCase();
    const isGreeting =
      ["hi", "hello", "hey", "hola", "sup", "yo", "good morning", "good evening", "who are you", "what can you do"].some(
        (g) => qLower === g || qLower.startsWith(g + " ") || qLower.startsWith(g + "!")
      );

    let answer = "";
    let tag = "Ad-hoc Investigation RAG";
    let confidence: "CONFIRMED FROM EVIDENCE" | "SUPPORTED INFERENCE" | "ANOMALY" = "SUPPORTED INFERENCE";
    let confidenceScore = "96.4%";
    let citations = ["NVIDIA NIM Live Inference", "Evidence Vault Index", "pgvector RAG"];

    if (isGreeting) {
      tag = "Copilot Agent Greeting";
      confidence = "SUPPORTED INFERENCE";
      confidenceScore = "99.9%";
      answer = `Hello, Investigator! I am FORGE-AI Copilot, powered by real-time LLM inference and pgvector forensic evidence indexing. I can cross-correlate seized drive artifacts, inspect PCAP/EVTX telemetry, analyze threat intelligence IOCs, and reconstruct breach timelines. How can I assist your investigation?`;
      citations = ["NVIDIA NIM Inference", "Active Forensic Knowledge Graph"];
    } else if (qLower.includes("ip") || qLower.includes("domain") || qLower.includes("network") || qLower.includes("traffic")) {
      tag = "Network Telemetry & CTI";
      confidence = "CONFIRMED FROM EVIDENCE";
      confidenceScore = "98.2%";
      answer = `Cross-referencing network telemetry for "${q}": Identified 4 outbound TLS connections across port 8443 and 2 DNS lookups to external subdomains. Automated threat intel lookup flags high beaconing periodicity consistent with Cobalt Strike stagers.`;
      citations = ["Zeek conn.log: L1204", "VirusTotal IOC Score: 14/72", "pcap_session_88.pcap"];
    } else if (qLower.includes("suspect") || qLower.includes("actor") || qLower.includes("user") || qLower.includes("person")) {
      tag = "Entity & Suspect Network";
      confidence = "CONFIRMED FROM EVIDENCE";
      confidenceScore = "97.5%";
      answer = `Querying entity relationships for "${q}": Linked 2 privileged user accounts to off-hour logon events via RDP. Degree centrality analysis maps a direct pivot node between local workstation 192.168.1.105 and production database servers.`;
      citations = ["auth.log: L4102", "case_entities.json", "NetworkX Graph Node #09"];
    } else if (qLower.includes("timeline") || qLower.includes("when") || qLower.includes("time") || qLower.includes("order")) {
      tag = "Chronological Event Reconstruction";
      confidence = "CONFIRMED FROM EVIDENCE";
      confidenceScore = "99.1%";
      answer = `Reconstructing chronological milestones for "${q}": Initial access occurred at 02:45 UTC, followed by privilege escalation at 02:58 UTC and archive exfiltration between 03:10 and 03:45 UTC. No timestomping anomalies detected in $MFT records.`;
      citations = ["$MFT Log File Checksum", "Sysmon Event ID 1 & 3", "Timeline Ledger #04"];
    } else {
      tag = "Grounded Evidence Synthesis";
      confidence = "SUPPORTED INFERENCE";
      confidenceScore = "95.8%";
      answer = `Synthesizing case records for "${q}": Correlated evidence fragments across indexed disk images and log streams. Found 3 supporting forensic artifacts with high relevance scores and verified SHA-256 chain of custody integrity.`;
      citations = ["Evidence Vault Chunks #14-#16", "ISO/IEC 27037 Custody Ledger"];
    }

    const simulated: Scenario = {
      id: "custom-" + Date.now(),
      query: q,
      tag,
      confidence,
      confidenceScore,
      answer,
      citations,
    };

    setSelectedScenario(simulated);
    setCustomInput("");
    setTimeout(() => {
      setIsTyping(false);
    }, 450);
  };

  return (
    <section id="ai-copilot" className="py-24 relative overflow-hidden scroll-mt-20">
      {/* Background Accent */}
      <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-400 text-xs font-mono uppercase tracking-wider">
            Citation-Backed RAG Assistant
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Strict Evidence Grounding. <br />
            <span className="text-gradient-purple">Zero Hallucinations.</span>
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-base sm:text-lg">
            Every answer is directly cited back to indexed case evidence and tagged with an immutable confidence tier.
          </p>
        </div>

        {/* Interactive Chat Console Grid */}
        <div className="max-w-4xl mx-auto rounded-2xl glass-panel border border-cyan-500/30 shadow-2xl shadow-cyan-950/40 overflow-hidden">
          {/* Top Assistant Bar */}
          <div className="px-6 py-4 bg-slate-950/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-400 to-violet-500 flex items-center justify-center font-bold text-slate-950 text-xs shadow-[0_0_15px_rgba(34,211,238,0.4)]">
                AI
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  FORGE-AI Forensic Copilot
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </h4>
                <p className="text-xs text-slate-400 font-mono">pgvector RAG • spaCy NER • NetworkX</p>
              </div>
            </div>

            <div className="text-xs font-mono text-cyan-300 bg-cyan-950/60 px-3 py-1 rounded-full border border-cyan-500/30">
              ⚡ Strict Grounding Policy Active
            </div>
          </div>

          {/* Sample Prompts Row */}
          <div className="p-4 sm:p-6 bg-slate-950/60 border-b border-white/5 space-y-2">
            <div className="text-xs font-mono text-slate-400">Select an investigator scenario to simulate:</div>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((sc) => (
                <button
                  key={sc.id}
                  onClick={() => handleSelectScenario(sc)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left flex items-center gap-1.5 ${
                    selectedScenario.id === sc.id
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm"
                      : "bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] border border-white/10 hover:border-cyan-500/30"
                  }`}
                >
                  <span>{sc.tag}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Dialog Simulation */}
          <div className="p-6 space-y-6 min-h-[300px] flex flex-col justify-between">
            <div className="space-y-4">
              {/* User Message */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/10 flex items-center justify-center font-bold text-slate-300 text-xs shrink-0">
                  YOU
                </div>
                <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-slate-100 max-w-2xl leading-relaxed font-medium">
                  {selectedScenario.query}
                </div>
              </div>

              {/* AI Response */}
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                  FA
                </div>
                <div className="flex-1 p-4 rounded-xl bg-slate-950 border border-white/10 space-y-3">
                  {/* Status & Confidence Badge */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                    <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {selectedScenario.confidence} ({selectedScenario.confidenceScore})
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Query Latency: 124ms
                    </span>
                  </div>

                  {/* Body */}
                  {isTyping ? (
                    <div className="py-4 flex items-center gap-2 text-xs font-mono text-cyan-400">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-100" />
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-200" />
                      <span>Synthesizing evidence citations...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-200 leading-relaxed">
                      {selectedScenario.answer}
                    </p>
                  )}

                  {/* Grounded Evidence Citations */}
                  {!isTyping && (
                    <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2 text-xs font-mono">
                      <span className="text-slate-400">Verified Evidence Citations:</span>
                      {selectedScenario.citations.map((cite, idx) => (
                        <span
                          key={idx}
                          className="bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded text-[11px]"
                        >
                          {cite}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleCustomSubmit} className="pt-4 border-t border-white/10 flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder="Ask investigator question (e.g. 'Show logins from subnet 10.0.0.0/24')..."
                className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400 font-mono transition-colors"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-gradient-to-r from-cyan-400 to-teal-300 text-slate-950 font-semibold rounded-lg text-sm hover:brightness-110 transition-all flex items-center gap-1.5"
              >
                <span>Ask AI</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

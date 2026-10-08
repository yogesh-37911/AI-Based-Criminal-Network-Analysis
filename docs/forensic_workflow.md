# FORGE-AI — Forensic Investigation Workflow

This is the intended end-to-end path an investigator takes through the
platform, and which module/endpoint handles each step.

```mermaid
flowchart TD
    S1[1. Create case] -->|POST /api/cases| S2[2. Add suspects/victims/notes]
    S2 --> S3[3. Upload evidence]
    S3 -->|POST /api/evidence/upload| S4[SHA-256 computed<br/>Chain of custody: UPLOADED]
    S4 --> S5[4. Run AI analysis on evidence]
    S5 -->|POST /api/analysis/document/id| S6[Entities extracted + persisted]
    S6 --> S7[Co-occurrence relationships built]
    S7 --> S8[5. Review Investigation Graph]
    S8 -->|GET /api/graph/case/id| S9[6. Run entity resolution]
    S9 -->|POST /api/analysis/entities/id/resolve| S10[Investigator confirms/rejects<br/>potential matches]
    S6 --> S11[7. Review Timeline]
    S11 -->|GET /api/timeline/case/id| S12[8. Run anomaly detection]
    S12 -->|POST /api/analysis/anomaly/id| S13[Anomalies flagged for review]
    S3 --> S14[9. Static file analysis<br/>if executable/suspicious file]
    S14 -->|POST /api/analysis/malware/id| S15[Entropy/strings/PE-ELF report]
    S6 --> S16[10. Threat intel check<br/>on extracted IPs/domains/hashes]
    S16 -->|POST /api/threat-intel/check| S17["VirusTotal/AbuseIPDB verdict<br/>or unavailable"]
    S6 --> S18[11. Ask the AI Investigation Assistant]
    S18 -->|POST /api/ai/query| S19[Cited, confidence-labeled answer]
    S8 --> S20[12. Generate forensic report]
    S11 --> S20
    S13 --> S20
    S19 --> S20
    S20 -->|POST /api/reports| S21[15-section structured report]
    S21 --> S22[13. Investigator reviews + signs off]
```

## Investigator-facing walkthrough

1. **Create the case.** Set title, crime type, and priority. You're
   automatically added as the lead investigator.
2. **Upload evidence** — any of the supported formats (PDF, TXT, CSV,
   JSON, XML, PCAP, LOG, DOCX, images, ZIP). The system hashes it
   immediately (SHA-256) and logs an `UPLOADED` chain-of-custody event
   before anything else happens.
3. **Run AI analysis** on each evidence item. This extracts entities
   (people, phones, emails, IPs, domains, bank accounts, crypto wallets,
   etc.), links entities that co-occur in the same document, seeds the
   timeline from any date references, and indexes the text for the AI
   assistant — all in one call.
4. **Review the Investigation Graph.** Nodes are entities, edges are
   relationships (initially `MENTIONED_IN` / `POTENTIAL_CONNECTION` from
   co-occurrence — upgrade the label once you've verified a real
   relationship like `CALLED` or `TRANSFERRED_MONEY`). Centrality and
   community-detection scores surface potentially important nodes — read
   the on-screen disclaimer: these are leads, not proof.
5. **Run entity resolution** to see if any two entities (e.g. "R. Kumar"
   and "rahul.kumar@gmail.com") might be the same real person. You
   confirm or reject each suggestion — nothing merges automatically.
6. **Review the timeline** — every dated event across all evidence, in
   one chronological, filterable view.
7. **Run anomaly detection** once you have enough timeline events (8+).
   Isolation Forest flags statistically unusual activity — off-hours,
   weekend spikes, rare event patterns for a given entity.
8. **Check threat intelligence** on any extracted IP/domain/hash if you
   have VirusTotal/AbuseIPDB configured.
9. **Ask the AI assistant** anything about the case — it only answers
   from what's actually been indexed, cites the evidence it used, and
   tells you plainly when there isn't enough evidence to answer.
10. **Generate the report.** Pulls everything above into the 15-section
    structured report, with the AI-generated section clearly separated
    from original evidence and your own notes.

## What the AI is *not* allowed to do at any step

- Declare a suspect guilty, dangerous, or responsible for a crime.
- State a fact that isn't traceable to a specific evidence excerpt.
- Silently merge two entities during resolution.
- Modify or delete a chain-of-custody record.
- Present a threat-intelligence verdict when no provider was reachable.

# FORGE-AI — Database Schema

PostgreSQL 16 + the `pgvector` extension (for `evidence_chunks.embedding`).
Full definitions live in `backend/app/models/models.py`; this is the
reference ER diagram and table-by-table summary.

## Entity-relationship diagram

```mermaid
erDiagram
    USERS ||--o{ CASES : creates
    USERS ||--o{ CASE_MEMBERS : "member of"
    CASES ||--o{ CASE_MEMBERS : has
    CASES ||--o{ SUSPECTS : has
    CASES ||--o{ VICTIMS : has
    CASES ||--o{ EVIDENCE : contains
    CASES ||--o{ ENTITIES : contains
    CASES ||--o{ RELATIONSHIPS : contains
    CASES ||--o{ TIMELINE_EVENTS : contains
    CASES ||--o{ ANOMALIES : contains
    CASES ||--o{ THREAT_INDICATORS : contains
    CASES ||--o{ REPORTS : has
    CASES ||--o{ AI_ANALYSIS : has
    CASES ||--o{ INVESTIGATOR_NOTES : has

    EVIDENCE ||--o{ EVIDENCE_HASHES : "hash history"
    EVIDENCE ||--o{ CHAIN_OF_CUSTODY : "custody log"
    EVIDENCE ||--o{ EVIDENCE_CHUNKS : "chunked+embedded"

    ENTITIES ||--o{ ENTITY_ALIASES : "surface forms"
    ENTITIES ||--o{ RELATIONSHIPS : "source/target"
    ENTITIES ||--o{ TIMELINE_EVENTS : "involved in"
    ENTITIES ||--o{ ENTITY_RESOLUTION_CANDIDATES : "potential match"

    USERS ||--o{ AUDIT_LOGS : performs
    USERS ||--o{ SESSIONS : has

    USERS {
        uuid id PK
        string email
        string hashed_password
        enum role
        bool mfa_enabled
        bool is_active
    }
    SESSIONS {
        uuid id PK
        uuid user_id FK
        string refresh_token_hash
        timestamp expires_at
        bool revoked
    }
    AUDIT_LOGS {
        uuid id PK
        uuid user_id FK
        string action
        string resource_type
        timestamp timestamp
    }
    CASES {
        uuid id PK
        string case_number
        string title
        enum status
        enum priority
        uuid created_by FK
    }
    CASE_MEMBERS {
        uuid id PK
        uuid case_id FK
        uuid user_id FK
        string role_on_case
    }
    SUSPECTS {
        uuid id PK
        uuid case_id FK
        string name
        uuid entity_id FK
        uuid added_by FK
    }
    VICTIMS {
        uuid id PK
        uuid case_id FK
        string name
        uuid entity_id FK
        uuid added_by FK
    }
    INVESTIGATOR_NOTES {
        uuid id PK
        uuid case_id FK
        uuid author_id FK
        text content
        enum provenance
    }
    EVIDENCE {
        uuid id PK
        uuid case_id FK
        string sha256_hash
        enum status
        enum provenance
        text extracted_text
    }
    EVIDENCE_HASHES {
        uuid id PK
        uuid evidence_id FK
        string algorithm
        string hash_value
        bool matches_original
    }
    CHAIN_OF_CUSTODY {
        uuid id PK
        uuid evidence_id FK
        uuid investigator_id FK
        enum action
        string previous_hash
        string current_hash
        timestamp timestamp
    }
    EVIDENCE_CHUNKS {
        uuid id PK
        uuid evidence_id FK
        int chunk_index
        text content
        vector embedding
    }
    ENTITIES {
        uuid id PK
        uuid case_id FK
        enum entity_type
        string value
        string normalized_value
        float confidence_score
    }
    ENTITY_ALIASES {
        uuid id PK
        uuid entity_id FK
        string alias_value
        uuid source_evidence_id FK
    }
    ENTITY_RESOLUTION_CANDIDATES {
        uuid id PK
        uuid case_id FK
        uuid entity_a_id FK
        uuid entity_b_id FK
        float confidence_score
        bool reviewed
    }
    RELATIONSHIPS {
        uuid id PK
        uuid source_entity_id FK
        uuid target_entity_id FK
        enum relationship_type
        enum confidence_label
        int weight
    }
    TIMELINE_EVENTS {
        uuid id PK
        uuid case_id FK
        uuid entity_id FK
        string event_type
        timestamp event_timestamp
        enum confidence_label
    }
    AI_ANALYSIS {
        uuid id PK
        uuid case_id FK
        string analysis_type
        text query_text
        text result_text
        enum provenance
    }
    ANOMALIES {
        uuid id PK
        uuid case_id FK
        string anomaly_type
        float anomaly_score
        string detection_method
    }
    THREAT_INDICATORS {
        uuid id PK
        uuid case_id FK
        string indicator_type
        string indicator_value
        string verdict
        bool enrichment_available
    }
    REPORTS {
        uuid id PK
        uuid case_id FK
        uuid generated_by FK
        string title
        json content_json
        string format
    }
```

## Table reference

| Table                          | Purpose                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `users`                        | Investigator accounts; role drives RBAC permission set           |
| `sessions`                     | Refresh-token sessions (revocable, IP/user-agent logged)         |
| `audit_logs`                   | Every mutating/sensitive action across the platform              |
| `notifications`                | Per-user notification inbox                                      |
| `cases`                        | The investigation itself — status, priority, ownership           |
| `case_members`                 | Who's on a case, and in what role-on-case                        |
| `suspects` / `victims`         | Named parties on a case, optionally linked to an `Entity`        |
| `investigator_notes`           | Free-text notes — tagged `provenance = INVESTIGATOR_NOTES`       |
| `case_tasks`                   | Lightweight task tracking per case                               |
| `comments`                     | Case-level discussion thread                                     |
| `evidence`                     | One row per uploaded file — hash, type, status, extracted text   |
| `evidence_hashes`              | Hash history — supports re-verification over time                |
| `chain_of_custody`             | **Append-only.** Every touch of evidence, with prev/current hash |
| `evidence_chunks`              | RAG pipeline — chunked evidence text + pgvector embedding        |
| `entities`                     | Extracted/normalized entities (18 types per Module 4)            |
| `entity_aliases`               | Alternate surface forms of the same entity across sources        |
| `entity_resolution_candidates` | Scored potential-match pairs — never auto-merged                 |
| `relationships`                | Graph edges between entities, with confidence label + weight     |
| `timeline_events`              | Unified forensic timeline, filterable by entity/type/date        |
| `ai_analysis`                  | Every AI assistant query + answer + cited evidence IDs           |
| `anomalies`                    | ML-flagged anomalies with score, method, and reason              |
| `threat_indicators`            | IOC enrichment results (or "unavailable" record)                 |
| `reports`                      | Generated structured reports (JSON canonical, DOCX/PDF export)   |

## Design notes

- **UUID primary keys everywhere** — avoids sequential-ID enumeration
  and makes cross-case data merges (e.g. multi-agency evidence sharing)
  collision-free.
- **`provenance` / `confidence_label` enums are load-bearing**, not
  decorative — they're what lets the UI and reports visually separate
  `ORIGINAL_EVIDENCE` from `AI_GENERATED_ANALYSIS` from
  `INVESTIGATOR_NOTES` (Module 19's core requirement).
- **`chain_of_custody` is intentionally append-only** at the application
  layer (no update/delete endpoint exists for it). In a production
  deployment this should also be enforced at the database role level
  (revoke `UPDATE`/`DELETE` grants on that table for the app's DB user).
- **`entities.normalized_value`** is what `correlation_service.py`
  dedupes against — same entity type + same normalized value = the same
  `Entity` row, so mentions across many evidence items collapse into
  one node rather than duplicating the graph.

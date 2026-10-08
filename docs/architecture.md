# FORGE-AI — System Architecture

## 1. High-level architecture

```mermaid
graph TB
    subgraph Client
        FE["Next.js Frontend<br/>React + Tailwind + Cytoscape.js"]
    end

    subgraph API["FastAPI Application (single service, modular routers)"]
        AUTH["Auth Router<br/>JWT + RBAC"]
        CASE["Case Management Router"]
        EVID["Evidence Router"]
        ANLYS["Analysis Router<br/>NER · Anomaly · Malware"]
        GRAPH["Graph Router"]
        TIME["Timeline Router"]
        AIQ["AI Assistant Router<br/>RAG"]
        TI["Threat Intel Router"]
        REP["Reports Router"]
    end

    subgraph Services["Service Layer (app/services)"]
        HASH["hashing.py"]
        NER["entity_extraction.py"]
        CORR["correlation_service.py"]
        RES["entity_resolution.py"]
        GSVC["graph_service.py - NetworkX"]
        ANOM["anomaly_service.py - Isolation Forest"]
        RAG["rag_service.py - chunk/embed/retrieve/LLM"]
        MAL["malware_analysis.py"]
        COC["chain_of_custody.py"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL<br/>relational schema")]
        VEC[("pgvector<br/>evidence_chunks embeddings")]
        FS[("Object/File Storage<br/>uploads/ - S3-compatible in production")]
    end

    subgraph External["Optional External Integrations"]
        LLM["Anthropic API"]
        VT["VirusTotal / AbuseIPDB"]
    end

    FE -->|REST, JWT bearer| API
    AUTH --> PG
    CASE --> PG
    EVID --> HASH --> FS
    EVID --> COC --> PG
    ANLYS --> NER --> CORR --> PG
    ANLYS --> ANOM --> PG
    ANLYS --> MAL --> FS
    GRAPH --> GSVC --> PG
    TIME --> PG
    AIQ --> RAG --> VEC
    RAG -.->|if configured| LLM
    TI -.->|if configured| VT
    RES --> PG
```

**Why a single FastAPI service instead of the spec's per-module
microservices**: at hackathon/case-management scale, one modular
monolith with clean router/service boundaries is faster to build,
easier to reason about for a security review, and trivially splittable
later — each `app/api/*.py` + its backing `app/services/*.py` is
already a natural service boundary if/when the platform needs to scale
horizontally (e.g., the AI/RAG router is the first candidate to split
out, since embedding + LLM calls are the most latency/resource heavy).

## 2. Data flow — evidence to investigative answer

```mermaid
flowchart LR
    A[Investigator uploads file] --> B[SHA-256 computed<br/>Chain-of-custody: UPLOADED]
    B --> C[Text extraction<br/>per file type]
    C --> D[Entity extraction<br/>regex + spaCy NER]
    D --> E[Entities persisted<br/>+ dedup by normalized value]
    E --> F[Co-occurrence edges<br/>built between entities]
    F --> G[Investigation Graph<br/>updated]
    D --> H["DATE entities -> Timeline events"]
    C --> I[Chunk + embed text<br/>pgvector]
    G --> J[NetworkX centrality/<br/>community detection]
    H --> K[Anomaly detection<br/>Isolation Forest]
    I --> L[Investigator asks a question]
    L --> M[Vector similarity search<br/>top-k relevant chunks]
    M --> N[LLM answers ONLY<br/>from retrieved chunks]
    N --> O[Answer + evidence<br/>citations + confidence label]
```

## 3. Sequence diagram — "Analyze this evidence" request

```mermaid
sequenceDiagram
    participant U as Investigator (UI)
    participant API as FastAPI /api/analysis
    participant TX as text_extraction
    participant NER as entity_extraction
    participant DB as PostgreSQL
    participant RAG as rag_service

    U->>API: POST /analysis/document/{evidence_id}
    API->>DB: fetch Evidence row
    API->>TX: extract_text(file, type)
    TX-->>API: raw text
    API->>DB: save extracted_text
    API->>NER: extract_entities(text)
    NER-->>API: [ExtractedEntity, ...] with confidence scores
    API->>DB: persist_entities() — dedup by normalized value
    API->>DB: build_cooccurrence_edges()
    API->>DB: build_timeline_from_date_entities()
    API->>RAG: index_evidence() — chunk + embed
    RAG->>DB: store EvidenceChunk rows (pgvector)
    API->>DB: log ChainOfCustody(action=ANALYZED)
    API->>DB: log AuditLog(EVIDENCE_ANALYZED)
    API-->>U: entity/edge/timeline/chunk counts + entity list
```

## 4. Use case diagram

```mermaid
graph LR
    INV((Investigator))
    ANALYST((Forensic Analyst))
    ADMIN((Case Admin))
    AUDITOR((Auditor))

    INV --> UC1[Create/manage case]
    INV --> UC2[Upload evidence]
    INV --> UC3[Query AI assistant]
    INV --> UC4[Review investigation graph]
    INV --> UC5[Generate report]
    ANALYST --> UC2
    ANALYST --> UC6[Run entity/anomaly analysis]
    ANALYST --> UC7[Static malware analysis]
    ADMIN --> UC1
    ADMIN --> UC8[Manage users/roles]
    AUDITOR --> UC9[View chain of custody]
    AUDITOR --> UC10[View audit logs]
```

## 5. Core class relationships (simplified)

```mermaid
classDiagram
    Case "1" --> "*" Evidence
    Case "1" --> "*" Suspect
    Case "1" --> "*" Victim
    Case "1" --> "*" Entity
    Evidence "1" --> "*" ChainOfCustody
    Evidence "1" --> "*" EvidenceChunk
    Entity "1" --> "*" EntityAlias
    Entity "1" --> "*" EntityRelationship : source
    Entity "1" --> "*" EntityRelationship : target
    Case "1" --> "*" TimelineEvent
    Case "1" --> "*" Anomaly
    Case "1" --> "*" Report
    User "1" --> "*" Case : created_by
    User "1" --> "*" AuditLog

    class Evidence {
        +sha256_hash
        +status
        +provenance
    }
    class EntityRelationship {
        +relationship_type
        +confidence_label
        +weight
    }
```

## 6. Deployment diagram

```mermaid
graph TB
    subgraph "Docker Compose (single host - hackathon/demo deployment)"
        NGINX["NGINX reverse proxy<br/>- optional, add for prod"]
        FE2["frontend container<br/>Next.js :3000"]
        BE["backend container<br/>FastAPI/uvicorn :8000"]
        PGC["postgres container<br/>pgvector/pgvector:pg16 :5432"]
        RC["redis container<br/>:6379 - reserved for future Celery use"]
        VOL1[("uploads volume")]
        VOL2[("postgres data volume")]
    end
    FE2 -->|/api proxy rewrite| BE
    BE --> PGC
    BE --> VOL1
    PGC --> VOL2
    NGINX -.-> FE2
    NGINX -.-> BE
```

For a real deployment: put NGINX (or a managed load balancer) in front,
terminate TLS there, move `uploads/` to S3-compatible object storage,
and run Postgres as a managed instance with automated backups —
evidence integrity depends on the database surviving.

## 7. Why these simplifications, and the upgrade path

| Spec component | This build | Upgrade path |
|---|---|---|
| Neo4j graph DB | Postgres tables + NetworkX at query time | Add a Neo4j sync step in `correlation_service.py`; swap `graph_service.py`'s NetworkX calls for Cypher queries once graphs exceed a few thousand nodes per case |
| Celery async processing | Synchronous request-time processing | Wrap each `app/services/*` call in a Celery task; Redis is already in the compose stack and unused, ready for this |
| DOCX/PDF report export | Structured JSON (canonical) | Feed `report.content_json` into a DOCX template (python-docx) or PDF renderer |
| Full microservices | Modular monolith | Each `app/api/*.py` + service pair is already a clean extraction boundary |

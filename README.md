# FORGE-AI
### AI-Powered Digital Forensic Investigation & Evidence Analysis Platform

Built for Smart India Hackathon. FORGE-AI is an investigation-assistance
platform for cybercrime investigators — it ingests digital evidence,
extracts entities, builds an investigation graph, constructs a forensic
timeline, flags anomalies, and answers investigator questions strictly
from indexed case evidence via a citation-backed RAG assistant.

**FORGE-AI does not replace an investigator.** Every AI-generated claim
is labeled with a confidence level (`CONFIRMED FROM EVIDENCE`,
`SUPPORTED INFERENCE`, `POTENTIAL CONNECTION`, `ANOMALY`, or
`INSUFFICIENT EVIDENCE`) and cited back to the evidence it came from.

---

## 1. What's implemented

| Module (per spec)                  | Status | Notes |
|---|---|---|
| 1. Case Management                 | ✅ | Full CRUD, status workflow, suspects/victims/notes/tasks |
| 2. Digital Evidence Management     | ✅ | Upload, SHA-256 hashing, type/size validation |
| 3. Chain of Custody                | ✅ | Append-only custody log, tamper re-verification |
| 4. AI Document Analysis            | ✅ | Regex + spaCy NER, confidence-scored |
| 5. Entity Resolution               | ✅ | Potential-match scoring, human-confirmed only |
| 6. Investigation Graph             | ✅ | Cytoscape.js UI, Postgres-backed graph |
| 7. Suspect Network Analysis        | ✅ | Degree/betweenness/PageRank/community via NetworkX |
| 8. Forensic Timeline               | ✅ | Unified timeline with filters |
| 9. Anomaly Detection               | ✅ | Isolation Forest over timeline features |
| 10. Cyber Threat Intelligence      | ✅ | VirusTotal/AbuseIPDB — reports "unavailable" if unconfigured |
| 11. Malware / File Analysis        | ✅ | Static analysis only (entropy, strings, PE/ELF); never executes files |
| 12. AI Investigation Assistant     | ✅ | Full RAG pipeline, pgvector, evidence citations |
| 13. Evidence Search                | ✅ | Keyword + semantic + hybrid |
| 14. AI Forensic Report Generator   | ✅ | 15-section structured JSON report |
| 15. Visual Analytics Dashboard     | ✅ | Case/evidence/anomaly stats + charts |
| 16. Geolocation Analysis           | ✅ (API) | Endpoint ready; map UI not yet wired in frontend |
| 17. Role-Based Access Control      | ✅ | 7 roles, permission matrix |
| 18. Security                       | ✅ (baseline) | JWT, bcrypt, rate limiting, secure headers, input validation — see `docs/security.md` for what's hardened vs. what needs work before production |
| 19. Forensic Integrity             | ✅ | Hashing, provenance tagging, immutable custody log |
| 20. AI Explainability              | ✅ | Confidence labels enforced in every AI response |

**Deliberately simplified vs. the full spec** (documented, not hidden):
- **Graph store**: entities/relationships live in PostgreSQL, materialized
  into NetworkX at query time — not a separate Neo4j instance. This is
  enough for case-scale graphs (hundreds–low thousands of nodes) and
  removes a second database from the deployment. See `docs/architecture.md`
  for the Neo4j migration path.
- **Background processing**: analysis runs synchronously in the request,
  not via Celery workers. Fine for demo-scale evidence volumes; the code
  is structured so each analysis step (`app/services/*`) can be dropped
  into a Celery task with minimal change.
- **DOCX/PDF report export**: the report generator produces the full
  15-section structured JSON (canonical source of truth); wiring that
  into a formatted DOCX/PDF is a to-do (`app/services/report_service.py`).
- **MFA**: TOTP verification is implemented in the login flow but requires
  `pyotp` and a provisioning UI (QR code) which isn't built in the frontend
  yet.

---

## 2. Quick start (Docker)

```bash
git clone <this-repo>
cd forge-ai
cp backend/.env.example backend/.env    # edit SECRET_KEY at minimum
cp frontend/.env.local.example frontend/.env.local

docker compose up --build
```

- Backend API: http://localhost:8000 (interactive docs at `/docs`)
- Frontend: http://localhost:3000
- Default seeded account: `admin@forge-ai.local` / `ChangeMe123!` —
  **change this immediately**, it's seeded automatically on first boot.

## 3. Local development (without Docker)

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements-dev.txt
python -m spacy download en_core_web_sm

# Postgres + pgvector must be running locally, matching backend/.env
python seed.py
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

## 4. Running tests

```bash
cd backend
docker compose up -d postgres     # or point DATABASE_URL at any Postgres+pgvector
DATABASE_URL=postgresql+psycopg2://forge:forge@localhost:5432/forge_ai_test pytest --cov=app
```

CI (`.github/workflows/ci.yml`) runs this automatically against a
Postgres+pgvector service container, plus a frontend build and Docker
image builds.

## 5. Configuration

All backend config is environment-driven — see `backend/.env.example`.
Notably:
- `KIMI_API_KEY` and `DEEPSEEK_API_KEY` — optional NVIDIA NIM credentials,
  routed to `moonshotai/kimi-k2.6` and `deepseek-ai/deepseek-v4.1-flash` by
  default. `NVIDIA_API_KEY` can be used with `NVIDIA_MODEL` as a general NIM
  fallback. Provider names and the active local fallback are shown in the
  Investigation Assistant. Put credentials in `backend/.env` or set them in
  the shell that launches Docker Compose; never commit `.env` files.
- If no hosted model responds, the assistant uses local evidence retrieval and
  a clearly labeled local response engine. Semantic vectors are used when the
  embedding model is already cached; otherwise retrieval falls back to token
  and rarity-based ranking without attempting a download during each query.
- `ANTHROPIC_API_KEY` and `GROQ_API_KEY` remain optional fallback providers.
- `VIRUSTOTAL_API_KEY` / `ABUSEIPDB_API_KEY` — optional threat-intel
  enrichment. Without them, `/api/threat-intel/check` returns
  `enrichment_available: false` and "Threat intelligence unavailable" —
  it never fabricates a verdict.

## 6. Project structure

```
forge-ai/
├── backend/            FastAPI application
│   ├── app/
│   │   ├── api/        REST routers (one per module)
│   │   ├── core/       config, security (JWT/bcrypt)
│   │   ├── db/         SQLAlchemy session/engine
│   │   ├── models/     ORM schema (see docs/database_schema.md)
│   │   ├── schemas/    Pydantic request/response models
│   │   └── services/   business logic — hashing, NLP, graph, RAG, ML
│   ├── tests/           pytest suite
│   └── seed.py
├── frontend/            Next.js (App Router) + Tailwind + Three.js graph
├── docs/                architecture, schema, security, workflow docs
├── docker-compose.yml
└── .github/workflows/ci.yml
```

## 7. Documentation

- [`docs/architecture.md`](docs/architecture.md) — system architecture,
  data flow, sequence/use-case/class/deployment diagrams
- [`docs/database_schema.md`](docs/database_schema.md) — full ER diagram
  and table reference
- [`docs/security.md`](docs/security.md) — threat model + what's hardened
  vs. what needs work before any real deployment
- [`docs/forensic_workflow.md`](docs/forensic_workflow.md) — the
  evidence → graph → timeline → RAG → report investigation workflow

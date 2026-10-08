# Resource Index — AI-Based Criminal Network Analysis (FORGE-AI)

Central landing file for reviewers. This index summarizes the project, its live services, documentation, demo access, and verification details.

## Project

- **Project title:** **AI-Based Criminal Network Analysis — FORGE-AI**
- **Team ID:** `HS065`
- **Sub-problem:** Digital Forensic Investigation and Evidence Analysis

FORGE-AI helps investigators organize digital cases, preserve evidence integrity, extract entities and events, explore potential connections, and ask evidence-grounded questions. AI-generated findings are investigative leads for human review; the system does not determine guilt or replace an investigator.

## Links

- **Live frontend:** <https://forge-ai-frontend-4o85.onrender.com/>
- **Backend API health:** <https://forge-ai-api.onrender.com/health>
- **GitHub repository:** <https://github.com/yogesh-37911/AI-Based-Criminal-Network-Analysis>
- **Presentation PowerPoint:** [pptx-output/FORGE-AI-Hackathon-Pitch.pptx](pptx-output/FORGE-AI-Hackathon-Pitch.pptx)
- **Presentation SHA-256 value supplied by the team:** `724F9AEB4B84B4335CDF0D98F440`

## Documentation

| Document | Path |
| --- | --- |
| Problem understanding, solution overview, implemented modules, and setup | [README.md](README.md) |
| System architecture and design trade-offs | [docs/architecture.md](docs/architecture.md) |
| Database schema and relationships | [docs/database_schema.md](docs/database_schema.md) |
| Evidence-to-investigation workflow | [docs/forensic_workflow.md](docs/forensic_workflow.md) |
| Security controls and deployment considerations | [docs/security.md](docs/security.md) |
| Render deployment guide | [docs/render_deployment.md](docs/render_deployment.md) |
| Render Blueprint configuration | [render.yaml](render.yaml) |

## Demo Credentials

| Role | Email | Password |
| --- | --- | --- |
| Super Administrator | `admin@forge-ai.local` | Set privately through the Render `ADMIN_PASSWORD` environment variable |

Do not commit deployment passwords, API keys, database URLs, or other secrets to this repository. Demo data is synthetic and is loaded when `SEED_DEMO_DATA=true` is configured for the backend.

## AI Disclosure

FORGE-AI combines deterministic extraction rules, pretrained NLP and embedding models, graph algorithms, unsupervised anomaly detection, and optional hosted language models.

- **Entity extraction:** regular expressions and spaCy `en_core_web_sm` named-entity recognition.
- **Semantic retrieval:** Sentence Transformers `all-MiniLM-L6-v2` embeddings and PostgreSQL/pgvector when the embedding model and vector database support are available; lexical ranking is used as a fallback.
- **Anomaly surfacing:** scikit-learn Isolation Forest over a small set of timeline features, alongside explicit forensic heuristics.
- **Graph analysis:** NetworkX degree and betweenness centrality, PageRank, greedy modularity communities, and shortest paths.
- **Language-model integrations:** optional NVIDIA NIM hosted models for Kimi and DeepSeek, plus a configurable NVIDIA model and optional providers. The active provider depends on deployment configuration and availability; a local response fallback is provided.

The project does not train its own foundation model or criminality classifier. Entity matches, graph links, anomaly scores, and generated explanations are leads for investigator review, not proof. See [README.md](README.md), [docs/architecture.md](docs/architecture.md), and [docs/security.md](docs/security.md) for implementation details and limitations.

## Verification

- **Repository branch:** `main`
- **Presentation hash supplied by the team:** `724F9AEB4B84B4335CDF0D98F440`
- **SHA-256 of the current local PowerPoint file:** `B986E73A54D77978549644A171F369464B9A27A0A4262FCD1AA563E5B4B21B42`

The supplied presentation hash is a 28-character value; a complete SHA-256 digest contains 64 hexadecimal characters. The full digest above was calculated from the current local PowerPoint file. Confirm which presentation file is the final submission copy before publishing its checksum.

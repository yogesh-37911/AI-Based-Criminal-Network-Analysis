# FORGE-AI — Security Documentation & Threat Model

## 1. What's implemented

| Control | Implementation |
|---|---|
| Authentication | JWT access (short-lived) + refresh tokens (`app/core/security.py`) |
| Password storage | bcrypt via passlib (`hash_password`) |
| MFA | TOTP verification wired into `/auth/login` (`pyotp`); provisioning UI not yet built |
| RBAC | 7 roles × permission matrix (`app/api/deps.py::ROLE_PERMISSIONS`), enforced per-endpoint via `require_permission()` |
| Rate limiting | `slowapi`, default 60 req/min/IP (`RATE_LIMIT_PER_MINUTE`) |
| Input validation | Pydantic schemas on every request body |
| Secure file upload | Extension allow-list, size cap, UUID-randomized stored filenames (prevents path traversal / overwrite), original filename never used as a path |
| XSS | React's default escaping (frontend never uses `dangerouslySetInnerHTML` on user content); JSON API responses, not server-rendered HTML with user data |
| SQL injection | SQLAlchemy ORM with parameterized queries throughout; the one raw SQL query (`rag_service.py`'s pgvector similarity search) uses bound parameters, never string interpolation |
| CSRF | Bearer-token auth (not cookie-based sessions) — CSRF applies to cookie auth, not to this token model; see note below on the localStorage tradeoff |
| Secure headers | `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `X-XSS-Protection`, HSTS in production (`app/main.py` middleware) |
| Audit logging | `audit_logs` table — every case/evidence/user mutation, action + resource + actor + IP |
| Evidence integrity | SHA-256 on upload, re-verification endpoint, chain-of-custody log, tamper detection (mismatched hash logged as `MODIFICATION_ATTEMPT`) |
| Error handling | Global exception handler returns generic 500s — no stack traces leaked to clients |

## 2. Known gaps — do not deploy to production without addressing these

This was built for a hackathon/academic demo. Before any real
deployment with real case data:

1. **Token storage**: the frontend stores JWTs in `localStorage`
   (`src/lib/api.ts`), which is readable by any script on the page —
   acceptable for a demo, but vulnerable to XSS-based token theft in
   production. Move to httpOnly, `SameSite=Strict` cookies and add real
   CSRF protection (double-submit token) for the cookie-auth flow.
2. **Chain-of-custody immutability** is enforced only at the application
   layer. A production deployment must also revoke `UPDATE`/`DELETE`
   grants on `chain_of_custody` (and ideally `audit_logs`) for the
   application's database role, so a compromised app server can't rewrite
   history.
3. **Encryption at rest**: evidence files on disk and the Postgres
   database are not encrypted by this codebase. Use disk-level encryption
   (e.g. LUKS) or an encrypted S3 bucket for `uploads/`, and enable
   Postgres TDE / a managed encrypted database instance.
4. **Encryption in transit**: no TLS termination is included — this is
   expected to sit behind NGINX/a load balancer that terminates TLS (see
   `docs/architecture.md` §6).
5. **Secrets**: `SECRET_KEY` and API keys are read from `.env` — use a
   real secrets manager (Vault, AWS Secrets Manager, etc.) in production,
   not a checked-in `.env` file.
6. **MFA is partially wired**: the login flow verifies a TOTP code if
   `mfa_enabled` is set, but there's no endpoint/UI yet to enroll a user
   in MFA (generate `mfa_secret`, show the QR code). Enrollment must be
   built before MFA can actually be turned on for any account.
7. **Rate limiting is per-process** (in-memory `slowapi`) — fine for a
   single container, but won't coordinate across multiple backend
   replicas. Move to a Redis-backed limiter (Redis is already in the
   compose stack) before horizontal scaling.

## 3. Threat model (STRIDE summary)

| Threat | Relevant controls | Residual risk |
|---|---|---|
| **Spoofing** — impersonating an investigator | JWT + bcrypt + optional MFA | Token theft via XSS (see gap #1) |
| **Tampering** — altering evidence or its record | SHA-256 hashing, append-only chain of custody, re-verification endpoint | DB-level immutability not yet enforced (gap #2) |
| **Repudiation** — denying an action was taken | `audit_logs` + `chain_of_custody` on every action | Logs themselves aren't cryptographically chained (no hash-linking between log entries) — a determined DB-level attacker could still edit history until gap #2 is closed |
| **Information disclosure** — unauthorized evidence access | RBAC on every endpoint, case-scoped queries | No row-level security in Postgres itself; relies entirely on the application layer |
| **Denial of service** | Rate limiting, file size caps | In-memory rate limiter doesn't survive restarts or scale across replicas |
| **Elevation of privilege** — VIEWER acting as ADMIN | `require_permission()` dependency on every mutating route, tested in `tests/test_rbac.py` | Permission matrix is coarse-grained (role-level, not per-case) — a `CASE_ADMIN` can act on any case, not just ones they're a member of |

## 4. AI-specific safety controls

- The RAG assistant's system prompt (`rag_service.py::SYSTEM_PROMPT`)
  explicitly forbids inventing facts, suspects, or relationships, and
  requires every claim to be labeled and cited.
- If retrieval returns no relevant chunks, the assistant returns
  `INSUFFICIENT EVIDENCE` rather than falling back to the LLM's general
  knowledge — enforced structurally (the LLM is only called when there's
  retrieved context to answer from).
- Every AI-generated analysis is tagged `provenance = AI_GENERATED_ANALYSIS`
  in the database, kept structurally separate from `ORIGINAL_EVIDENCE`
  and `INVESTIGATOR_NOTES`.
- Threat-intelligence enrichment never fabricates a verdict — an
  unconfigured or unreachable provider returns
  `enrichment_available: false` and an explicit "unavailable" message.

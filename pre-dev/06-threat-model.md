# Phase 6 — Threat Model

## MediCore HIS — STRIDE Analysis per Component

---

## 1. Next.js Frontend

| Threat | Category | Description | Mitigation |
|--------|----------|-------------|------------|
| T-FE-01 | **Spoofing** | Attacker steals JWT from browser storage and impersonates user | Access token stored in memory only (not localStorage). Refresh token HttpOnly + Secure + SameSite=Strict cookie. 15-minute token expiry |
| T-FE-02 | **Tampering** | Man-in-the-middle modifies API responses | HTTPS enforced on all endpoints. HSTS headers. Vercel provides automatic SSL |
| T-FE-03 | **Info Disclosure** | Patient data visible in browser DevTools / network tab | Minimize data sent to browser. Never send full patient lists — paginate and search. No sensitive data in URL params |
| T-FE-04 | **Info Disclosure** | Source maps expose business logic | Disable source maps in production build. Sentry source maps uploaded separately |
| T-FE-05 | **DoS** | Attacker floods the frontend with requests | Rate limiting on API layer (not frontend). Vercel edge caching for static assets |
| T-FE-06 | **XSS** | Injected script in patient name or SOAP note renders as HTML | React auto-escapes by default. Never use `dangerouslySetInnerHTML`. CSP headers configured |

---

## 2. NestJS Core API

| Threat | Category | Description | Mitigation |
|--------|----------|-------------|------------|
| T-API-01 | **Spoofing** | Attacker forges JWT to gain unauthorized access | JWT signed with HS256 + strong secret (64-char hex). Token validation on every request via JwtAuthGuard |
| T-API-02 | **Spoofing** | Brute-force login attack | Rate limit on `/auth/login`: 5 attempts per IP per 15 minutes. bcrypt cost factor 12 makes offline brute-force impractical |
| T-API-03 | **Tampering** | Attacker modifies request body to access another org's data | Prisma middleware auto-injects `org_id` into every query. Request body `org_id` is IGNORED — always derived from JWT |
| T-API-04 | **Tampering** | Attacker modifies encounter after sign-off | Sign-off sets `status: signed_off` — all subsequent write endpoints reject with 422 for signed-off encounters |
| T-API-05 | **Repudiation** | Doctor denies performing an action on patient data | Audit log records every CUD operation with `user_id`, `timestamp`, `ip_address`, `changes`. Logs are append-only (no delete/update) |
| T-API-06 | **Info Disclosure** | Error stack traces reveal internal architecture | GlobalExceptionFilter strips stack traces in production. Sentry captures full error internally |
| T-API-07 | **Info Disclosure** | API exposes too much data in list endpoints | DTOs explicitly define response shape. Mongoose `.select()` used to exclude sensitive fields. Never return `password_hash` |
| T-API-08 | **DoS** | Large request body exhausts memory | `app.use(json({ limit: '1mb' }))`. File uploads limited to 10MB per file via Cloudflare R2 config |
| T-API-09 | **DoS** | Expensive queries (patient search with wildcards) | MongoDB text index instead of regex. Pagination enforced (max 100 items per page). Query timeout configured |
| T-API-10 | **Elevation of Privilege** | Receptionist accesses doctor-only endpoints | PermissionsGuard checks `@Permissions('encounter.write')` on every handler. Role-permission mapping is server-side, not client-configurable |
| T-API-11 | **Elevation of Privilege** | User from Org A accesses Org B data via patient_id guessing | `org_id` filter is ALWAYS applied. Even direct ObjectId access returns 404 (not 403 — no information leakage about existence) |

---

## 3. FastAPI AI Sidecar

| Threat | Category | Description | Mitigation |
|--------|----------|-------------|------------|
| T-AI-01 | **Spoofing** | Attacker calls AI endpoints without valid auth | FastAPI validates the same JWT issued by NestJS (shared JWT_SECRET). No separate auth system |
| T-AI-02 | **Tampering** | Attacker manipulates patient context to get harmful AI output | FastAPI fetches context ONLY from NestJS internal API (not from user request). User cannot inject arbitrary context |
| T-AI-03 | **Info Disclosure** | AI prompt reveals system instructions or other patient data | Prompt templates are server-side (Jinja2). Patient context is scoped to the requesting user's org_id. AI responses are logged but not cached with patient identifiers |
| T-AI-04 | **DoS** | Attacker floods AI endpoints (expensive OpenAI calls) | Redis rate limiter: 20 requests/user/hour. Additional IP-based rate limit: 100 req/IP/hour |
| T-AI-05 | **Elevation of Privilege** | AI service writes directly to database | IMPOSSIBLE by design — FastAPI has zero database connections. All data access goes through NestJS `/internal/*` routes |

---

## 4. Database Layer

| Threat | Category | Description | Mitigation |
|--------|----------|-------------|------------|
| T-DB-01 | **Info Disclosure** | Database credentials leaked in source code | All credentials in environment variables. `.env` in `.gitignore`. `env.template` has placeholder values only |
| T-DB-02 | **Info Disclosure** | Database accessible from public internet | MongoDB Atlas: IP whitelist enforced. Railway PG/Redis: private networking within Railway project |
| T-DB-03 | **Tampering** | SQL injection via user input | Prisma ORM uses parameterized queries — SQL injection is structurally impossible with Prisma API. No raw SQL queries |
| T-DB-04 | **Tampering** | NoSQL injection via Mongoose queries | All queries use typed filter objects — never construct queries from raw strings. Mongoose schema validation enforces types |
| T-DB-05 | **Info Disclosure** | Database backup stolen | MongoDB Atlas encrypts backups at rest (AES-256). Railway PG backups encrypted by default |
| T-DB-06 | **DoS** | Unindexed query causes full collection scan | All frequent query patterns have compound indexes defined (see `05-database-schema.md`). Index coverage verified before launch |

---

## 5. Redis

| Threat | Category | Description | Mitigation |
|--------|----------|-------------|------------|
| T-RD-01 | **Info Disclosure** | Redis data readable if instance compromised | Redis stores only ephemeral data (session, cache, queue state). No passwords or PHI in Redis values. TTL on all keys |
| T-RD-02 | **Tampering** | Attacker publishes fake events to Redis channels | Redis is private-networked. Not exposed publicly. No external access possible via Railway/Atlas networking |
| T-RD-03 | **DoS** | Memory exhaustion from unbounded cache | `maxmemory 256mb` + `allkeys-lru` eviction policy configured in docker-compose and Railway |

---

## 6. External Services

| Threat | Category | Description | Mitigation |
|--------|----------|-------------|------------|
| T-EXT-01 | **Tampering** | Fake Stripe webhook triggers payment confirmation | Stripe webhook signature verification (`stripe.webhooks.constructEvent()`) validates every incoming webhook |
| T-EXT-02 | **Info Disclosure** | OpenAI sees patient data in prompts | Patient data is de-identified in prompts where possible (no MRN, no national ID). OpenAI data usage policy reviewed. Consider Azure OpenAI (BAA available) for HIPAA phase |
| T-EXT-03 | **DoS** | OpenAI rate limit or outage breaks AI copilot | Graceful degradation — AI sidebar shows "AI unavailable" message. Core HIS functionality works without AI |
| T-EXT-04 | **Info Disclosure** | Twilio/SendGrid logs contain patient phone/email | Use Twilio/SendGrid's data retention policies. Delete logs after 30 days. No PHI in message content (just appointment times, not diagnoses) |

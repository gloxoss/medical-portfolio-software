# Phase 3 — Tech Stack Decisions

## MediCore HIS — Technology Choices and Rationale

---

## Final Stack Table

| Layer | Technology | Version | Why This | Why Not the Alternative |
|-------|-----------|---------|----------|------------------------|
| **Frontend** | Next.js (App Router) | 14.x | SSR + RSC + file-based routing + Vercel deployment. TypeScript shared with backend | Vite+React (no SSR out of box), Nuxt (Vue ecosystem — Oussama's strength is React) |
| **Frontend UI** | shadcn/ui + Tailwind CSS | Latest | Headless, composable, accessible components. No vendor lock-in — you own the code | MUI (heavy, opinionated), Chakra (less flexible), Ant Design (enterprise-heavy) |
| **Core Backend** | NestJS | 10.x | TypeScript end-to-end, built-in DI + modules + decorators, Prisma first-class support. Enterprise patterns (guards, interceptors, pipes) already baked in | Express (manual structure = chaos at 12 modules), FastAPI (Python — no shared types with frontend) |
| **AI Sidecar** | FastAPI | 0.100+ | Python AI/ML ecosystem is irreplaceable (LangChain, LlamaIndex, Transformers). Pydantic v2 for validation. Async-native. Used only for inference — stateless | NestJS (no LangChain), Flask (sync, no async), Django (overkill for 4 endpoints) |
| **ORM (Relational)** | Prisma | 5.x | Type-safe queries, auto-generated client, excellent migration story, middleware support for tenant scoping | TypeORM (decorator-heavy, weaker migration), Drizzle (newer, smaller ecosystem), Knex (query builder, not ORM) |
| **ODM (Document)** | Mongoose | 8.x | Mature, battle-tested, NestJS integration via @nestjs/mongoose. Schema validation + middleware + populated refs | Prisma MongoDB (limited, no aggregation pipeline support), native driver (too low-level) |
| **Relational DB** | PostgreSQL | 16 | ACID for financial data, mature ecosystem, Prisma support, Railway plugin available, free-tier options everywhere | MySQL (weaker JSON support, no CTE), SQLite (not for multi-user SaaS), CockroachDB (overkill) |
| **Document DB** | MongoDB | 7.0 | Flexible schema for clinical documents (encounters, patients), embedded arrays (allergies, prescriptions), Atlas free tier, horizontal scaling later | PostgreSQL JSONB (loses schema flexibility benefits, queries become complex), DynamoDB (vendor lock-in, unfamiliar DX) |
| **Cache/Events** | Redis | 7.2 | Sub-millisecond reads for queue state, pub/sub for event bus, session cache, rate limiting, booking locks — one service does it all | RabbitMQ (more complex, overkill for MVP), BullMQ on top of Redis (considered for Phase 2 if event reliability becomes an issue), Kafka (way overkill) |
| **AI Model** | OpenAI GPT-4o / GPT-4o-mini | Latest | Best clinical text accuracy among available LLMs. GPT-4o-mini for cost-efficient daily use, GPT-4o for complex differentials | Claude (Anthropic — excellent but API availability varies by region), Gemini (Google — strong but less clinical validation), open-source (Llama — requires GPU hosting, $100+/mo) |
| **File Storage** | Cloudflare R2 | — | S3-compatible, 10GB free, no egress fees, global CDN. Patient document storage | AWS S3 (egress fees), MinIO (self-hosted — violates managed-services-first rule), Supabase Storage (tied to Supabase ecosystem) |
| **SMS** | Twilio | — | Global reach, Verify API for OTP, reliable delivery. Investigate pricing for Morocco-specific | Infobip (possibly cheaper for MENA but less documented), Vonage (limited Morocco coverage) |
| **Email** | SendGrid | — | 100 emails/day free tier, reliable delivery, template support | AWS SES (requires AWS account), Resend (newer, less proven), Mailgun (free tier less generous) |
| **Payments** | Stripe | — | Developer-friendly, webhook reliability, test mode. Verify Morocco availability — fallback: CMI or bank transfer | PayPal (less developer-friendly), CMI Morocco (local only, limited API), direct bank transfer (no webhook — manual reconciliation) |
| **CI/CD** | GitHub Actions | — | Free for public repos, generous minutes for private. Lint + type-check on PR | GitLab CI (requires GitLab migration), Jenkins (self-hosted — no), CircleCI (less generous free tier) |
| **Hosting (Frontend)** | Vercel | Hobby tier | Free, automatic deployments from Git, edge functions, excellent Next.js support (they built it) | Netlify (RSC support weaker), self-hosted (no — managed services first) |
| **Hosting (Backend)** | Railway | Starter | $5/service, automatic deployments, Postgres + Redis plugins, health checks, logs. Simple DX for solo dev | Render (similar but slower deploys), Fly.io (more complex — Docker required), AWS ECS (way too complex for solo) |
| **Monitoring** | Sentry | Free tier | Error tracking across all 3 services, performance monitoring, source maps. Best free tier for startups | Datadog (expensive), New Relic (complex setup), LogRocket (frontend only) |

---

## Monorepo Structure

```
medicore/
├── apps/
│   ├── web/                  ← Next.js 14 (TypeScript)
│   ├── api/                  ← NestJS (TypeScript)
│   └── ai/                   ← FastAPI (Python)
├── packages/
│   └── shared-types/         ← TypeScript interfaces shared between web + api
├── infra/
│   ├── docker-compose.yml    ← Local dev: PG + Mongo + Redis
│   └── env.template          ← All env vars documented
├── pnpm-workspace.yaml
├── turbo.json                ← Turborepo for build orchestration
└── .github/
    └── workflows/
        └── ci.yml            ← Lint + type-check on PR
```

**Why pnpm monorepo?**
- Shared TypeScript types between `apps/web` and `apps/api` via `packages/shared-types`
- Single `pnpm install` for all dependencies
- Turborepo caches builds — faster CI
- Python `apps/ai` lives in the same repo but uses its own `requirements.txt` (pnpm doesn't manage Python)

---

## Key Design Decisions Summary

| Decision | Rationale | ADR |
|----------|-----------|-----|
| NestJS over FastAPI for core backend | TypeScript end-to-end, shared types with Next.js, Prisma support, built-in enterprise patterns | ADR-001 |
| Hybrid DB (PG + Mongo + Redis) | Financial data needs ACID (PG), clinical documents need flexible schema (Mongo), real-time needs sub-ms reads (Redis) | ADR-002 |
| FastAPI as AI-only sidecar | Python ML ecosystem is irreplaceable. Sidecar pattern keeps data access clean — AI service never touches DB directly | ADR-003 |
| Redis pub/sub over message queue | Simpler, sufficient for MVP scale (50 concurrent users). BullMQ or SQS considered for Phase 2 if reliability issues emerge | ADR-004 |
| SaaS multi-tenant over single-tenant | Maximizes operational efficiency. One instance serves all customers. org_id + facility_id scoping enforced at middleware level | ADR-005 |

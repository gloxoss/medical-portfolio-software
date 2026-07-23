# MediCore HIS — Pre-Development Blueprint
### EPIOSO Studio · Oussama Zaki

> **Stack**: Next.js 14 · NestJS · PostgreSQL · MongoDB · Redis · FastAPI (AI only)
> **MVP Target**: Multi-branch clinic chain
> **Deployment model**: SaaS multi-tenant → self-hosted option later
> **Solo builder**: Oussama Zaki — bootstrapped, no external budget
> **Status**: Pre-development · Blueprint locked · Ready to execute

---

## Document map

```
his-predev/
├── README.md                          ← Start here. Master index.
│
├── docs/
│   ├── 00-project-charter.md          ← Vision, constraints, solo-builder rules
│   ├── 01-architecture.md             ← Full system architecture (NestJS + hybrid DB)
│   ├── 02-database-strategy.md        ← What lives in PG vs Mongo vs Redis and why
│   ├── 03-module-map.md               ← All 12 modules, ownership, event contracts
│   ├── 04-user-roles.md               ← Roles, permissions, portal access
│   ├── 05-mvp-scope.md                ← IN / OUT of MVP, acceptance criteria
│   └── 06-build-phases.md             ← 13 executable steps, cold-start context per step
│
├── schemas/
│   ├── postgres/                      ← SQL table definitions (Prisma schema)
│   │   ├── auth.prisma                ← users, sessions, roles
│   │   ├── tenancy.prisma             ← organizations, facilities
│   │   ├── billing.prisma             ← invoices, payments, services
│   │   └── hr.prisma                  ← staff profiles, schedules (Phase 3)
│   └── mongo/                         ← MongoDB document schemas (JSON)
│       ├── patient.schema.json         ← Patient document (full demographics + history)
│       ├── encounter.schema.json       ← Encounter — the central clinical document
│       ├── appointment.schema.json     ← Appointment lifecycle
│       └── prescription.schema.json   ← Prescriptions issued per encounter
│
├── api/
│   ├── auth.routes.md                 ← Auth API contract (NestJS)
│   ├── patients.routes.md             ← Patients API (NestJS → Mongo)
│   ├── clinics.routes.md              ← Appointments + encounters API
│   ├── billing.routes.md              ← Billing API (NestJS → PG)
│   └── ai.routes.md                   ← AI API contract (FastAPI — separate service)
│
├── adr/
│   ├── ADR-001-nestjs-over-fastapi.md ← Why NestJS for main backend
│   ├── ADR-002-hybrid-database.md     ← Why PG + Mongo + Redis
│   └── ADR-003-fastapi-ai-sidecar.md  ← Why FastAPI is kept for AI only
│
├── frontend/
│   ├── route-tree.md                  ← Full Next.js App Router map
│   └── components.md                  ← Shared component inventory
│
└── infra/
    ├── docker-compose.yml             ← Local dev: PG + Mongo + Redis + Orthanc
    ├── env.template                   ← All environment variables documented
    └── deployment.md                  ← Vercel + Railway deployment plan
```

---

## Architecture summary (one page)

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USERS                                      │
│  Doctor │ Receptionist │ Admin │ Patient │ Lab tech │ Radiologist   │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────────────┐
│              Next.js 14 — App Router (Vercel)                       │
│         /admin  /clinical  /ops  /patient  /lab  /radiology         │
└─────────────────────────┬───────────────────────────────────────────┘
                          │ REST + SSE
          ┌───────────────┴──────────────┐
          │                              │
┌─────────▼──────────┐       ┌──────────▼──────────┐
│  NestJS (Railway)  │       │  FastAPI (Railway)   │
│  Main HIS backend  │       │  AI microservice     │
│  12 domain modules │       │  Copilot · Triage    │
│  auth/tenancy/     │       │  Imaging · Summaries │
│  clinics/billing/  │       │  (Python ecosystem)  │
│  labs/pharmacy...  │       └──────────┬───────────┘
└──────┬─────────────┘                  │
       │                                │ OpenAI / HuggingFace
  ┌────┴──────────────────────┐         │
  │    Event Bus (Redis)      │◄────────┘
  │    pub/sub + cache        │
  └────┬──────────────────────┘
       │
  ┌────┴──────────────────────────────────────┐
  │           Data layer                      │
  │  ┌──────────────┐  ┌─────────────────┐   │
  │  │  PostgreSQL  │  │    MongoDB      │   │
  │  │  (Atlas/RDS) │  │    (Atlas)      │   │
  │  │  Users, orgs │  │  Clinical data  │   │
  │  │  billing, HR │  │  Patients, EMR  │   │
  │  └──────────────┘  └─────────────────┘   │
  └───────────────────────────────────────────┘
```

---

## Solo builder rules (non-negotiable)

Oussama is building this alone, bootstrapped, from Casablanca. These constraints shape every decision:

1. **No over-engineering** — every architectural choice must be justifiable by "I can build and debug this alone at 2am"
2. **Managed services first** — MongoDB Atlas, Railway, Vercel. No self-managed infra in Phase 1.
3. **One PR per day target** — steps are sized accordingly. No 800-line PRs.
4. **Ship working software every 2 weeks** — something deployable at every milestone.
5. **AI costs controlled** — rate limits enforced, costs tracked. No surprise $500 bills.
6. **Test what matters** — unit test business logic, E2E test the critical paths only. No 100% coverage theater.

---

## How to execute a build step

Every step in `docs/06-build-phases.md` is self-contained. To execute a step:

1. Read the step's **Context brief** (tells you what already exists)
2. Read the linked **schema files** for the data shapes
3. Read the linked **API contract** for the endpoints
4. Build only what the step specifies
5. Run the step's **Done when** checklist before merging

Never skip the context brief. Never build ahead of the current step.

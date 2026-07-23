# PROGRESS — MediCore HIS Build Tracker

> Updated after each step is completed. This file is the single source of truth for build state.

---

## Build status

| Step | Name | Status | Notes |
|---|---|---|---|
| 1 | Monorepo scaffolding | ⏳ Not started | |
| 2 | Auth module (NestJS + PG) | ⏳ Not started | Blocked by Step 1 |
| 3 | Tenancy module | ⏳ Not started | Blocked by Step 2 |
| 4 | Patients module (Mongo) | ⏳ Not started | Blocked by Step 3 |
| 5 | Scheduling module | ⏳ Not started | Blocked by Step 4 |
| 6 | Encounter module | ⏳ Not started | Blocked by Step 5 |
| 7 | Billing module (PG) | ⏳ Not started | Blocked by Step 6 |
| 8 | Communication module | ⏳ Not started | Blocked by Step 7 |
| 9 | AI service (FastAPI) | ⏳ Not started | Blocked by Step 6 |
| 10 | Frontend: Auth + Onboarding | ⏳ Not started | Blocked by Steps 2-3 |
| 11 | Frontend: Patients + Appointments | ⏳ Not started | Blocked by Steps 4-5 |
| 12 | Frontend: Encounter + AI copilot | ⏳ Not started | Blocked by Steps 6, 9 |
| 13 | Frontend: Patient portal + Billing | ⏳ Not started | Blocked by Steps 7, 12 |

**Status icons**: ⏳ Not started · 🔄 In progress · ✅ Done · ❌ Blocked/Failed

---

## Architecture decisions locked

- [x] NestJS (TypeScript) for main backend — ADR-001
- [x] PostgreSQL (Prisma) for relational/financial data — ADR-002
- [x] MongoDB (Mongoose) for clinical documents — ADR-002
- [x] Redis for events + cache + queue state — ADR-002
- [x] FastAPI (Python) as AI-only sidecar — ADR-003
- [x] Next.js 14 App Router for frontend
- [x] SaaS multi-tenant first, self-hosted later
- [x] No mobile apps in Phase 1

---

## Known issues / decisions pending

_Add blockers here as they come up during build._

---

## Completed steps log

_Updated when each step is done._

| Date | Step | What was actually built | Deviations from spec |
|---|---|---|---|
| — | — | — | — |

# MediCore HIS Current Version Guide

Last updated: 2026-04-09
Scope reviewed: current code in medicore-his, pre-dev blueprint and screen inventory

## 1. What this version contains

This version is a production-style monorepo with:
- NestJS API (multi-tenant, JWT/RBAC, PostgreSQL + MongoDB + Redis)
- Next.js web app (admin, ops, clinical, portal route groups)
- Python FastAPI AI sidecar (summary endpoint + JWT + Redis rate-limit/cache)
- Stripe checkout support in both ops billing and patient portal billing
- Twilio/SendGrid/pdfkit communication pipeline with graceful fallback if keys are missing

Primary implemented backend modules:
- auth
- tenancy
- patients
- scheduling
- encounters
- billing
- communication
- lab
- portal
- ai-context
- audit-log

Primary implemented frontend areas:
- staff auth
- admin pages (dashboard/team/facilities/services/analytics/audit-log/settings)
- ops pages (patients/new/appointments/queue/billing/lab orders)
- clinical pages (patients/timeline/schedule/encounter workspace)
- portal pages (otp login/dashboard/records/appointments/labs/invoices/settings/profile)

## 2. Route map of this version

### Route prefix decision (architectural record)

Pre-dev screen inventory (`04-screen-inventory.md`) specified prefixed paths such as
`/admin/dashboard`, `/ops/patients`, `/clinical/encounters`. The current implementation
uses top-level shared paths (`/dashboard`, `/patients`, `/encounters`) instead.

**Why this was changed:**
- Next.js App Router route groups `(admin)`, `(ops)`, `(clinical)` provide layout isolation
  without URL segments, which is the recommended pattern.
- Sidebar navigation enforces role boundaries at the UX level — a RECEPTIONIST who lands
  on `/patients` sees the ops shell, a DOCTOR sees the clinical shell. Same URL, different UI.
- Adding `/admin`, `/ops`, `/clinical` URL prefixes would require a breaking routing refactor
  and offer no additional security (server-side guards enforce role access regardless).

**This is a permanent architectural decision for this version.**
A future routing normalization milestone could add prefixes if navigation collision issues
arise in practice, but this should be a deliberate milestone, not an ad-hoc fix.

**QA note:** For testing and demos, navigate by sidebar after login for the intended role shell
instead of manually typing URLs for shared paths. The canonical entry point is always `/dashboard`
after authentication.

Note:
- Staff route groups currently expose many top-level paths without explicit /admin, /ops, /clinical prefixes.
- For testing and demos, navigate by sidebar after login for the intended role shell instead of manual URL guessing on shared paths.

## Staff (web)
- /login
- /dashboard
- /team
- /facilities
- /services
- /analytics
- /audit-log
- /settings
- /patients
- /patients/new
- /appointments
- /queue
- /billing
- /billing/[invoiceId]
- /lab
- /lab/orders/[id]
- /schedule
- /patients/[id]
- /encounters/[id]
- /encounter/[id] (legacy/alternate encounter route)
- /lab/orders/[id]/result

## Patient portal (web)
- /portal/login
- /portal
- /portal/dashboard
- /portal/records
- /portal/appointments
- /portal/labs
- /portal/invoices
- /portal/invoices/success
- /portal/invoices/cancel
- /portal/settings
- /portal/profile

## Utility routes (web)
- /
- /payment/success
- /payment/error

## Key API families
- /api/v1/auth/*
- /api/v1/tenancy/*
- /api/v1/patients/*
- /api/v1/scheduling/*
- /api/v1/encounters/*
- /api/v1/billing/*
- /api/v1/lab/*
- /api/v1/portal/*
- /api/v1/portal/auth/*
- /api/v1/internal/ai-context/*
- /api/v1/audit-log/*
- /api/v1/health

## 3. Completeness methodology (based on skill + pre-dev)

Reference contracts:
- Blueprint steps 1-13: pre-dev/07-blueprint.md
- Blueprint steps 14-35: pre-dev/07-blueprint-phase2-3.md
- Screen inventory totals: pre-dev/04-screen-inventory.md and pre-dev/04-screens-phase2-3.md (105 total planned screens)

Skill lens used (medicore-his-dev):
- source-of-truth alignment with pre-dev
- tenant-scoped backend behavior
- real integrations over mock behavior
- security guards and validation
- typed architecture and maintainability

Scoring model used for blueprint steps:
- Complete = 1.0
- Partial = 0.6
- Not started = 0.0

## 4. Step-by-step blueprint status

## Phase 1 (Steps 1-13)
- Complete: 1,2,3,4,5,6,7,11,12,13
- Partial: 8,9,10
- Score: 11.8 / 13 = 90.8%

Notes:
- Communication exists, but reminder and outbound provider operations still rely on environment and event wiring maturity in real deployment.
- AI sidecar exists, but endpoint surface is narrower than full Step 9 target.
- Frontend onboarding path from blueprint is not fully represented as a dedicated multi-step flow.

## Phase 2 (Steps 14-25)
- Partial: 14,15,16
- Not started: 17-25
- Score: 1.8 / 12 = 15.0%

Notes:
- Portal is strong and already includes OTP auth, appointments, invoices/payments, consent/settings, GDPR request intake, and receipt download.
- Lab module now includes dedicated ops lab shell routes for orders list, order detail workflow, and result entry.
- Pharmacy, Telemedicine, IPD, Inventory, Radiology, Messaging, Triage/CMS/platform bundles are not present as full modules.

## Phase 3 (Steps 26-35)
- Not started: 26-35
- Score: 0 / 10 = 0%

## 5. Percentage of completeness (requested)

## A) Blueprint completeness (steps-based)
Total score = 13.6 / 35 = 38.9%

## B) Screen completeness (inventory-based)
Implemented page files in current web app: 34
Planned product screens in pre-dev: 105
Screen coverage = 34 / 105 = 32.4%

## C) Current version completeness (combined view)
Combined estimate = (38.9% + 32.4%) / 2 = 35.7%

Final completeness estimate for this version: 36%

## 6. Skill compliance snapshot for implemented scope

This is not roadmap completeness; it is quality compliance of what is already built.

- Source-of-truth alignment: good
- Multi-tenant scoping: good
- Real integrations (Stripe/Twilio/SendGrid/pdfkit): good with env-dependent behavior
- Validation and DTO discipline: good
- Type safety and compile checks: good
- Automated test breadth (web + e2e): limited

Implemented-scope quality estimate: 78%

## 7. Major gaps to finish roadmap

Highest-impact missing areas versus pre-dev:
- Steps 17-25 (pharmacy, telemedicine, IPD, inventory, radiology, messaging, triage, cms/platform bundles)
- Steps 26-35 (HR/workflow/native apps/HL7-FHIR/advanced AI/ambulance/mobile release)

## 8. Suggested interpretation

Use this version as:
- a solid Phase 1 foundation
- a partially advanced Phase 2 portal + lab baseline
- a platform ready for structured continuation from Step 17 onward

Do not position this version yet as full Phase 2 completion.
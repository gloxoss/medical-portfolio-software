# Phase 7 — Execution Blueprint

## MediCore HIS — Agent-Executable Build Steps

> Each step is designed so a fresh developer (or AI agent) can pick it up cold without reading prior steps. Context briefs are self-contained.

---

## Step 1 — Monorepo Scaffolding

**Context:** MediCore is a multi-app monorepo. Three runtime applications (Next.js frontend, NestJS API, FastAPI AI sidecar) share a common TypeScript types package. The monorepo uses pnpm workspaces + Turborepo for build orchestration. Python (FastAPI) lives in the repo but is managed separately with its own `requirements.txt`. Docker Compose provides local development databases.

**Objective:** Create the monorepo skeleton with all configuration files so that `pnpm install && pnpm dev` starts all three apps (even if they only return "Hello World").

**Inputs:** None — greenfield project.

**Outputs:**
```
medicore/
├── apps/web/           (Next.js 14 — `npx create-next-app@latest`)
├── apps/api/           (NestJS — `npx @nestjs/cli new`)
├── apps/ai/            (FastAPI — manual scaffold)
├── packages/shared-types/  (TypeScript interfaces)
├── infra/docker-compose.yml
├── infra/env.template
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .env.example
└── README.md
```

**Acceptance criteria:**
- `pnpm install` succeeds with zero errors
- `pnpm dev` starts web (3000), api (3001), ai (8000) concurrently
- `docker compose up -d` starts PG 16 + Mongo 7 + Redis 7.2 with health checks passing
- `packages/shared-types` exports at least one interface importable from both `apps/web` and `apps/api`
- `.env.example` has all variables from `his-predev/infra/env.template`
- TypeScript strict mode enabled in web and api

**Dependencies:** None — first step.

**Estimated time:** 1–2 dev days.

---

## Step 2 — Auth Module

**Context:** MediCore uses JWT-based authentication. NestJS issues access tokens (15-min, in response body) and refresh tokens (7-day, HttpOnly cookie, SHA-256 hashed in PG). The User model lives in PostgreSQL via Prisma. Passwords use bcrypt with cost factor 12. Rate limiting on login: 5 attempts/IP/15 min via Redis.

**Objective:** Implement complete auth flow: register (internal), login, refresh, logout, and `GET /auth/me` with facility roles.

**Inputs:** Prisma schema for User, RefreshToken, UserFacilityRole (from `his-predev/schemas/postgres/schema.prisma`).

**Outputs:**
- `apps/api/src/auth/` — module, controller, service, guards (JwtAuthGuard, PermissionsGuard), strategies, DTOs
- `apps/api/prisma/schema.prisma` — User, RefreshToken, UserFacilityRole models
- `apps/api/prisma/migrations/` — initial migration

**Acceptance criteria:**
- `POST /auth/login` with valid email+password returns `{ access_token }` + Set-Cookie refresh
- `POST /auth/login` with wrong password returns 401 (message does NOT reveal "user not found")
- `POST /auth/refresh` with valid cookie returns new access_token
- `POST /auth/logout` revokes refresh token — subsequent refresh returns 401
- `GET /auth/me` returns user + `facilities[]` with role per facility
- `@Permissions('encounter.write')` on a test endpoint rejects RECEPTIONIST with 403
- 6th login attempt within 15 minutes returns 429
- Passwords stored as bcrypt hashes (verified by inspecting DB)

**Dependencies:** Step 1 (monorepo exists, PG running in Docker).

**Estimated time:** 2–3 dev days.

---

## Step 3 — Tenancy Module

**Context:** MediCore is multi-tenant. Every query is scoped by `org_id` (derived from JWT, NEVER from request body). Organizations have Facilities. The onboarding wizard creates Org + Facility + Admin User atomically in one PG transaction. Prisma middleware auto-injects `org_id` into WHERE clauses. `tenancy.facility.created` event published to Redis.

**Objective:** Implement Organization + Facility CRUD, Prisma tenant middleware, and the atomic onboarding endpoint.

**Inputs:** Step 2 (auth working), Prisma schema for Organization + Facility + Department.

**Outputs:**
- `apps/api/src/tenancy/` — module, controller, service, DTOs
- `apps/api/src/common/middleware/tenant-scope.middleware.ts` — Prisma middleware
- Onboarding endpoint: `POST /orgs/onboard`
- Redis event publisher for `tenancy.*` events

**Acceptance criteria:**
- `POST /orgs/onboard` creates Org + Facility + User in one transaction — verify all 3 exist or none
- Onboarding with duplicate slug returns 409
- `GET /orgs/:id/facilities` returns only that org's facilities
- Create 2 orgs, add data to each, query from Org A — verify zero data from Org B visible
- `tenancy.facility.created` event appears in Redis MONITOR

**Dependencies:** Step 2 (auth + Prisma setup).

**Estimated time:** 1.5–2 dev days.

---

## Step 4 — Patients Module

**Context:** Patients live in MongoDB (flexible schema for clinical documents). MRN is auto-generated using an atomic PG counter: format `{prefix}-{YYYY}-{counter:05}`. Every patient document carries `org_id` for tenancy scoping. Allergy register is an embedded array with `substance_normalized` field for drug matching. Patient search uses MongoDB text index across `name.display`, `phone`, `mrn`.

**Objective:** Implement patient CRUD: register (with MRN generation), search, get profile, add allergy, update problem list, upload documents to R2.

**Inputs:** Step 3 (tenancy working), Mongoose schema from `his-predev/schemas/mongo/patient.schema.json`.

**Outputs:**
- `apps/api/src/patients/` — module, controller, service, patient.schema.ts (Mongoose), DTOs
- R2 upload integration for patient documents
- Patient search with text index

**Acceptance criteria:**
- `POST /patients` with name+phone creates patient with MRN `{prefix}-2026-00001`
- Two concurrent registrations produce sequential MRNs (no duplicates)
- `GET /patients/search?q=amine` returns matching patients within the current org only
- `POST /patients/:id/allergies` adds allergy; subsequent GET shows it
- Patient from Org A is invisible to Org B (returns 404, not 403)
- File upload to R2 returns URL; URL is retrievable

**Dependencies:** Step 3 (tenancy, org_id scoping), Cloudflare R2 configured.

**Estimated time:** 2–3 dev days.

---

## Step 5 — Scheduling Module

**Context:** DoctorSchedule lives in PG (relational — JOINed with Users). Appointments live in MongoDB (document-like — embedded status_history). Available slots are computed by subtracting booked appointments and breaks from the schedule. Double-booking is prevented via Redis optimistic lock (`schedule_lock:{doctorId}:{slot}` with 30s TTL + NX flag). Check-in generates a queue token and updates a Redis Sorted Set. Queue updates stream via SSE.

**Objective:** Implement doctor schedule CRUD, availability computation, appointment booking (with Redis lock), check-in with queue token, SSE queue stream, public queue display endpoint.

**Inputs:** Step 4 (patients exist to book), PG schema for DoctorSchedule, Mongo schema for Appointment.

**Outputs:**
- `apps/api/src/scheduling/` — module, controller, service, appointment.schema.ts, DTOs
- `apps/api/src/scheduling/sched-pg.repository.ts` — PG operations (schedules)
- `apps/api/src/scheduling/sched-mongo.repository.ts` — Mongo operations (appointments)
- SSE controller for queue updates
- Public endpoint: `GET /queue-display/:facilityId`
- Cron job: auto-mark no-shows after 30 minutes

**Acceptance criteria:**
- `POST /doctors/:id/schedule` creates schedule; `GET /doctors/:id/availability?date=X` returns available slots
- Two simultaneous bookings for same slot: first 201, second 409
- `POST /appointments/:id/checkin` generates token, `GET /facilities/:id/queue` SSE pushes event within 2 seconds
- `GET /queue-display/:facilityId` works without Bearer token
- Appointment at 10:00 not checked in by 10:30 → cron marks as `no_show`

**Dependencies:** Step 4 (patients), Step 2 (auth — DoctorSchedule references User).

**Estimated time:** 2–3 dev days.

---

## Step 6 — Encounters Module (EMR Core)

**Context:** Encounters are the central clinical document in MongoDB. One encounter per appointment (enforced by unique index on `appointment_id`). Vitals are partial-update (autosaved on blur). SOAP notes use debounced autosave (2s client-side). Sign-off validates non-empty Assessment, sets status to `signed_off` (irreversible), and publishes `clinics.encounter.signed_off` event which triggers billing. Prescriptions embed in the encounter document with allergy cross-check. AI fields exist in schema but are populated by the AI module (Step 9).

**Objective:** Implement encounter lifecycle: create, vitals update, SOAP update, diagnosis add (ICD-10), prescription add (with allergy check), sign-off with event publishing.

**Inputs:** Step 5 (appointments exist), Mongoose schema from `his-predev/schemas/mongo/encounter.schema.json`.

**Outputs:**
- `apps/api/src/encounters/` — module, controller, service, encounter.schema.ts, DTOs
- Allergy cross-check logic (query patient allergies, fuzzy-match against prescribed drug)
- Sign-off event publisher
- Encounter history endpoint (paginated)

**Acceptance criteria:**
- `POST /appointments/:id/encounter` creates encounter (DOCTOR only). Second call returns 409
- `PUT /encounters/:id/vitals` with partial data saves without requiring all fields
- `PUT /encounters/:id/soap` updates partial SOAP; `last_autosaved_at` timestamp updates
- `POST /encounters/:id/prescriptions` with Amoxicillin when patient has Penicillin allergy → 422 warning with allergy details
- Same prescription with `allergy_override: true` → 200 success
- Sign-off with empty Assessment → 422. With Assessment → 200 + `clinics.encounter.signed_off` event in Redis
- Signed-off encounter: all write endpoints return 422 "Cannot modify signed-off encounter"

**Dependencies:** Step 5 (appointments), Step 4 (patients — allergy register).

**Estimated time:** 3–4 dev days.

---

## Step 7 — Billing Module

**Context:** Billing lives in PostgreSQL (financial data needs ACID). Invoices are auto-created when the `clinics.encounter.signed_off` event fires — the billing module subscribes to Redis events. Invoice numbers are auto-generated: `INV-{YYYY}-{counter:05}`. Line items reference the services catalog. Payments support cash (manual recording) and Stripe (payment intents + webhook). Revenue aggregates are computed from PG with GROUP BY facility + date.

**Objective:** Implement invoice auto-creation on sign-off event, invoice CRUD, payment recording (cash + Stripe), Stripe webhook handler, revenue aggregates.

**Inputs:** Step 6 (encounter sign-off events), Prisma schema for Invoice, InvoiceItem, Payment, Service, TaxConfig.

**Outputs:**
- `apps/api/src/billing/` — module, controller, service, DTOs
- Redis event subscriber for `clinics.encounter.signed_off`
- Stripe integration (payment intent creation + webhook handler)
- Revenue aggregate endpoint

**Acceptance criteria:**
- Sign off an encounter → invoice appears in `GET /invoices` within 5 seconds with status DRAFT
- Invoice number format: `INV-2026-00001`
- `PUT /invoices/:id` adds line item → total recalculates
- `POST /invoices/:id/payment` with method=CASH → invoice status changes to PAID
- `POST /invoices/:id/pay/stripe` returns `client_secret`
- Stripe webhook `payment_intent.succeeded` → invoice status changes to PAID
- `GET /orgs/:id/revenue?period=monthly&facility_id=X` returns correct aggregates

**Dependencies:** Step 6 (sign-off events), Step 3 (tenancy — services catalog).

**Estimated time:** 2–3 dev days.

---

## Step 8 — Communication Module

**Context:** MediCore sends SMS via Twilio (appointment confirmation + 24h reminders) and email via SendGrid (invoice PDFs). The communication module subscribes to Redis events and sends messages based on event type. Notification templates live in PG with Jinja2-style variable interpolation. All sent notifications are logged in MongoDB `notification_logs` collection. The 24h reminder uses a Redis delayed job (scheduled at booking time).

**Objective:** Implement SMS sending (Twilio), email sending (SendGrid), notification template system, event-driven message dispatching, 24h reminder scheduling.

**Inputs:** Step 7 (billing events for invoice email), Step 5 (scheduling events for SMS).

**Outputs:**
- `apps/api/src/communication/` — module, service, providers (twilio, sendgrid), DTOs
- Redis event subscribers for appointment and billing events
- Notification log collection (Mongoose)
- PDF invoice generation (using `@react-pdf/renderer` or `pdfkit`)

**Acceptance criteria:**
- Book appointment → SMS confirmation sent to patient phone (verify Twilio logs)
- 24h before appointment → reminder SMS sent (verify via Redis delayed job)
- Send invoice → email with PDF attachment received
- All sent notifications logged in `notification_logs` collection
- Failed SMS retries 3 times, then logs failure

**Dependencies:** Step 5 (appointment events), Step 7 (invoice events), Twilio + SendGrid accounts.

**Estimated time:** 2 dev days.

---

## Step 9 — AI Service (FastAPI Sidecar)

**Context:** FastAPI is a stateless Python microservice for AI inference. It validates the same JWTs issued by NestJS (shared JWT_SECRET). It never touches databases directly — it calls NestJS `/internal/patients/:id/context` endpoint to get patient data, then constructs prompts using Jinja2 templates and sends them to OpenAI GPT-4o-mini. Rate limiting: 20 requests/user/hour via Redis counter. Response caching: 1 hour via Redis. Three endpoints: `/ai/copilot/summary`, `/ai/copilot/differentials`, `/ai/copilot/investigations`.

**Objective:** Implement the complete AI sidecar with JWT validation, rate limiting, context fetching, prompt engineering, OpenAI integration, response caching.

**Inputs:** Step 6 (encounters + patients exist for context), NestJS internal endpoint.

**Outputs:**
- `apps/ai/main.py` — FastAPI app
- `apps/ai/routers/copilot.py` — 3 endpoints
- `apps/ai/services/llm_service.py` — OpenAI client
- `apps/ai/services/context_service.py` — NestJS internal API client
- `apps/ai/services/cache_service.py` — Redis cache
- `apps/ai/middleware/` — JWT validator, rate limiter
- `apps/ai/prompts/` — Jinja2 templates for each AI feature
- `apps/api/src/internal/` — NestJS internal controller

**Acceptance criteria:**
- `POST /ai/copilot/summary` with valid patient_id returns structured patient summary
- Request with invalid JWT returns 401
- 21st request within 1 hour returns 429
- Second identical request within 1 hour returns cached response (faster, no OpenAI call)
- FastAPI has ZERO database connections (verified by inspecting code — no Prisma, no Mongoose imports)
- When OpenAI is unreachable, endpoint returns 503 with graceful error message

**Dependencies:** Step 6 (encounters), Step 4 (patients), OpenAI API key.

**Estimated time:** 2–3 dev days.

---

## Step 10 — Frontend: Auth + Onboarding + Layout

**Context:** Next.js 14 App Router with TypeScript and shadcn/ui component library. Three shell layouts: Admin (org management), Clinical (doctor workflows), Operations (receptionist workflows). Facility switcher in top nav. Pages use React Server Components for data fetching and Client Components for interactivity. Auth state managed via access token in memory + refresh on 401.

**Objective:** Implement login page, onboarding wizard (4 steps), app shell with sidebar navigation, facility switcher, route protection via middleware.

**Inputs:** Step 2 (auth API), Step 3 (onboarding API).

**Outputs:**
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/onboarding/page.tsx` — 4-step wizard
- `apps/web/app/(admin)/layout.tsx` — admin shell
- `apps/web/app/(clinical)/layout.tsx` — clinical shell
- `apps/web/app/(ops)/layout.tsx` — operations shell
- `apps/web/components/facility-switcher.tsx`
- `apps/web/lib/auth.ts` — token management
- `apps/web/middleware.ts` — route protection

**Acceptance criteria:**
- Login → redirect to dashboard. Wrong password → error message
- Onboarding wizard creates org → facility → user → doctor, lands on dashboard
- Sidebar shows correct navigation items per shell
- Facility switcher shows user's facilities, switching changes active facility context
- Unauthenticated user accessing `/admin/*` → redirected to `/login`
- Token refresh happens silently on 401 response

**Dependencies:** Steps 2–3 (auth + tenancy APIs).

**Estimated time:** 3–4 dev days.

---

## Step 11 — Frontend: Patients + Appointments + Queue

**Context:** The Operations shell contains: patient list with search, new patient form, appointment calendar (FullCalendar component), booking form (modal), queue management with check-in buttons and SSE-powered live updates. The Clinical shell contains: patient list with search, patient profile (demographics, allergies, problem list, encounter history).

**Objective:** Implement all patient-facing and scheduling screens for both receptionist and doctor views.

**Inputs:** Step 4 (patients API), Step 5 (scheduling API), Step 10 (shells).

**Outputs:**
- `apps/web/app/(ops)/patients/page.tsx` — patient list
- `apps/web/app/(ops)/patients/new/page.tsx` — registration form
- `apps/web/app/(ops)/appointments/page.tsx` — calendar + booking modal
- `apps/web/app/(ops)/queue/page.tsx` — queue management with SSE
- `apps/web/app/(clinical)/patients/page.tsx` — clinical patient list
- `apps/web/app/(clinical)/patients/[id]/page.tsx` — patient profile
- `apps/web/app/(public)/queue-display/[facilityId]/page.tsx` — TV display

**Acceptance criteria:**
- Receptionist registers patient in <90 seconds (measure with stopwatch)
- Search returns results as user types (debounced 300ms)
- Calendar shows appointments color-coded by status
- Booking on occupied slot fails immediately (UI disables slot)
- Check-in → queue token appears on both queue screen AND public TV display within 2 seconds
- Patient profile shows demographics, allergies, problem list, encounter history

**Dependencies:** Steps 4–5 (APIs), Step 10 (shells).

**Estimated time:** 3–4 dev days.

---

## Step 12 — Frontend: Encounter Editor + AI Copilot

**Context:** The encounter editor is the most complex screen — a 3-column layout: (left) patient summary sidebar with demographics, allergies, problems, recent encounters; (center) encounter form with vitals, SOAP editor, diagnoses, prescriptions; (right) AI copilot sidebar with summary, differential suggestions, investigation suggestions. The center column uses debounced autosave (2s). The AI sidebar loads on encounter open and allows on-demand actions.

**Objective:** Implement the full encounter editor with all sub-forms, autosave, allergy warnings, sign-off flow, and AI copilot integration.

**Inputs:** Step 6 (encounters API), Step 9 (AI API), Step 10 (clinical shell).

**Outputs:**
- `apps/web/app/(clinical)/patients/[id]/encounters/[encId]/page.tsx`
- `apps/web/components/encounter/` — VitalsForm, SoapEditor, DiagnosisSearch, PrescriptionForm, AllergyWarning, SignOffModal
- `apps/web/components/ai/` — AISidebar, PatientSummary, DifferentialChips, InvestigationList
- `apps/web/hooks/useAutosave.ts`
- Autosave indicator component ("Saving..." → "Saved ✓")

**Acceptance criteria:**
- Doctor opens encounter → 3-column layout renders with patient summary in left sidebar
- Typing in SOAP → autosaves after 2 seconds of inactivity (indicator shows "Saved ✓")
- Click "AI Expand" → structured SOAP appears (labeled "AI suggestion — verify")
- Diagnosis search → ICD-10 autocomplete → click adds to diagnoses list
- Add prescription → allergy check → warning banner if match → override button
- Click "Sign Off" → confirmation modal → confirm → encounter locks (all fields readonly)
- AI sidebar shows patient summary, differential suggestions as clickable chips
- Rate limit hit → sidebar shows "Rate limit reached — try again in X minutes"
- AI service down → sidebar shows "AI unavailable — check patient history manually"

**Dependencies:** Step 6 (encounters), Step 9 (AI), Step 11 (patient profile).

**Estimated time:** 4–5 dev days.

---

## Step 13 — Frontend: Billing + Analytics + Admin

**Context:** The Operations shell billing pages show invoice lists (filterable by status, date, facility), invoice detail (editable line items for drafts, payment recording), and Stripe payment integration. The Admin shell shows a revenue dashboard (bar chart by facility, line chart trends), team management (user CRUD, role assignment), and audit log viewer. All admin pages are ORG_ADMIN or FACILITY_ADMIN only.

**Objective:** Implement billing screens, payment flows, revenue dashboard, team management, audit log viewer, and organization settings.

**Inputs:** Step 7 (billing API), Step 3 (tenancy API for team management).

**Outputs:**
- `apps/web/app/(ops)/billing/page.tsx` — invoice list
- `apps/web/app/(ops)/billing/[invoiceId]/page.tsx` — invoice detail
- `apps/web/app/(admin)/dashboard/page.tsx` — overview stats
- `apps/web/app/(admin)/analytics/page.tsx` — revenue charts
- `apps/web/app/(admin)/team/page.tsx` — user management
- `apps/web/app/(admin)/audit-log/page.tsx` — audit viewer
- `apps/web/app/(admin)/settings/page.tsx` — org settings

**Acceptance criteria:**
- Invoice list filters by status and date range correctly
- Draft invoice: add line item → total recalculates
- Record cash payment → invoice status changes to PAID
- Stripe payment form loads → payment succeeds → invoice updates
- Revenue dashboard shows bar chart by facility filtered by period
- Team page: invite user → assign role at facility → user appears in list
- Audit log: filter by user, entity type — shows correct entries
- Non-admin accessing `/admin/*` → 403 page

**Dependencies:** Step 7 (billing), Step 3 (tenancy), Step 10 (shells).

**Estimated time:** 3–4 dev days.

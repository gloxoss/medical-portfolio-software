# 06 — Build Phases
### 13 steps to MVP · Solo-builder sized · NestJS + PG + Mongo + Redis + FastAPI

Each step = 1 PR + 1–3 dev days max. Every step has a cold-start context brief.

---

## PHASE 1 — MVP (13 steps)

---

### STEP 1 — Monorepo scaffolding + local dev

**Context**: Nothing exists. Build the skeleton.  
**Estimated time**: 1 day

**Tasks**:
- Init `pnpm` monorepo with workspaces: `apps/web`, `apps/api`, `apps/ai`, `packages/shared-types`
- `apps/web`: Next.js 14, TypeScript, Tailwind, shadcn/ui init
- `apps/api`: NestJS, TypeScript, Prisma, Mongoose, ioredis, class-validator, @nestjs/config
- `apps/ai`: FastAPI, Pydantic v2, httpx, python-jose, langchain
- `packages/shared-types`: Shared TypeScript interfaces (DTOs, event payloads)
- `infra/docker-compose.yml`: PostgreSQL 16 + MongoDB 7 + Redis 7
- `infra/env.template`: All vars documented
- `apps/api/prisma/schema.prisma`: Base schema (Organization, Facility, User stubs)
- `GET /health` on both NestJS (`:3001/health`) and FastAPI (`:8000/health`)
- GitHub Actions: lint + type-check on PR

**Done when**: `docker-compose up` + all 3 dev servers run. Both health endpoints return 200. Monorepo imports work between packages.

---

### STEP 2 — Auth module (NestJS + PostgreSQL)

**Context**: Scaffolded monorepo from Step 1. Need JWT auth with multi-facility RBAC.  
**Read first**: `docs/01-architecture.md` (auth section), `schemas/postgres/auth.prisma`, `docs/04-user-roles.md`  
**Estimated time**: 2 days

**Prisma models needed**: `User`, `UserFacilityRole`, `RefreshToken`

**Tasks**:
- `modules/auth/auth.module.ts`
- `POST /auth/login` — email + password → access token (15min) + refresh token (7d HttpOnly cookie)
- `POST /auth/refresh` — cookie refresh → new access token
- `POST /auth/logout` — invalidate refresh token in PG
- `GET /auth/me` — returns `{ user, facilities: [{ facility_id, role, permissions }] }`
- `JwtAuthGuard` — validates access token on all protected routes
- `PermissionsGuard` — checks `@Permissions('encounter.write')` decorators
- `@CurrentUser()` decorator — injects user from request
- `@TenantScope()` decorator — injects `org_id` + `facility_id` into request context (from JWT claim or query param)
- Prisma middleware: auto-inject `org_id` on all tenant-scoped models
- Unit tests: login, wrong password, token expiry, permission denied

**Done when**: Login returns valid JWT. Protected routes 401 without token. 403 for wrong role. Prisma middleware injects tenant scope.

---

### STEP 3 — Tenancy module (NestJS + PostgreSQL)

**Context**: Auth works. Need org + facility management.  
**Read first**: `docs/01-architecture.md` (tenancy model), `schemas/postgres/tenancy.prisma`  
**Estimated time**: 1.5 days

**Prisma models needed**: `Organization`, `Facility`, `Department` (stub)

**Tasks**:
- `modules/tenancy/`
- `POST /orgs` — super admin only
- `GET /orgs/:id` — org admin+
- `PUT /orgs/:id` — org admin
- `POST /orgs/:id/facilities` — org admin
- `GET /orgs/:id/facilities` — any staff
- `PUT /facilities/:id` — facility admin+
- `POST /orgs/onboard` — atomic: creates org + facility + admin user in one PG transaction
- Publish `tenancy.facility.created` to Redis on facility creation
- Redis client setup: `apps/api/src/redis/redis.module.ts`

**Done when**: Super admin creates org. Onboarding endpoint creates all 3 entities atomically. Redis event fires and can be seen in redis-cli monitor.

---

### STEP 4 — Patients module (NestJS + MongoDB)

**Context**: Tenancy works. Need patient records.  
**Read first**: `schemas/mongo/patient.schema.json`, `docs/03-module-map.md` (patients section)  
**Estimated time**: 2 days

**Mongoose models**: `Patient`

**Tasks**:
- `modules/patients/`
- `POST /patients` — register, auto-generates MRN (atomic counter in PG: `Organization.mrn_counter`)
- `GET /patients/:id` — full patient document
- `GET /patients/search?q=` — fuzzy search on name, phone, MRN, national_id (MongoDB text index)
- `PUT /patients/:id` — update demographics
- `POST /patients/:id/allergies` — add allergy
- `DELETE /patients/:id/allergies/:id` — remove
- `POST /patients/:id/problems` — add to problem list
- `POST /patients/:id/documents` — upload to Cloudflare R2, store URL in Mongo
- `GET /patients/:id/timeline` — chronological list of all encounters (summary only)
- Publish `patients.patient.registered` to Redis

**MRN generation**: Uses Prisma `$transaction` to increment `Organization.mrn_counter` atomically, then formats as `{PREFIX}-{YYYY}-{COUNTER:05}`.

**Done when**: Patient registers with unique MRN. Search works across name/phone/MRN. Document uploads to R2. Cross-org isolation tested (patient from org A not visible from org B).

---

### STEP 5 — Scheduling module (NestJS + MongoDB)

**Context**: Patients exist. Need appointment booking.  
**Read first**: `schemas/mongo/appointment.schema.json`, `api/clinics.routes.md`  
**Estimated time**: 2 days

**Mongoose models**: `Appointment`, `DoctorSchedule`  
**PostgreSQL**: `DoctorSchedule` (working hours stored in PG for JOIN with User)

**Tasks**:
- `modules/clinics/scheduling/`
- `POST /doctors/:id/schedule` — set working days, slot duration, break times
- `GET /doctors/:id/availability?date=YYYY-MM-DD&facility_id=` — compute free slots
- `POST /appointments` — book with Redis optimistic lock on slot
- `GET /appointments` — list, filterable (doctor, date, status, facility)
- `PATCH /appointments/:id/status` — lifecycle transitions with validation
- `POST /appointments/:id/checkin` — generate queue token, update Redis queue state
- `GET /facilities/:id/queue` — SSE stream of live queue
- `GET /queue-display/:facilityId` — public, no auth, queue display data
- Cron job (NestJS `@Cron`): mark `no_show` 30min after start time if not checked in
- Publish `clinics.appointment.confirmed`, `clinics.appointment.checked_in`

**Done when**: Slot availability returns correctly. Double-booking prevented. Queue token generated. SSE stream updates every check-in. Public queue display accessible.

---

### STEP 6 — Encounter module (NestJS + MongoDB)

**Context**: Scheduling works. Need the clinical EMR core.  
**Read first**: `schemas/mongo/encounter.schema.json`, `api/clinics.routes.md` (encounter section)  
**Estimated time**: 3 days — this is the largest single step

**Mongoose models**: `Encounter`

**Tasks**:
- `modules/clinics/encounter/`
- `POST /appointments/:id/encounter` — open encounter (doctor only, once per appointment)
- `GET /encounters/:id` — full encounter with all sub-documents
- `PUT /encounters/:id/vitals` — partial update, autosave
- `PUT /encounters/:id/soap` — partial update, debounced autosave from frontend
- `POST /encounters/:id/diagnoses` — add ICD-10 diagnosis
- `DELETE /encounters/:id/diagnoses/:id`
- `POST /encounters/:id/prescriptions` — add drug + check allergy register
- `DELETE /encounters/:id/prescriptions/:id`
- `POST /encounters/:id/lab-orders` — add lab test orders (full lab module Phase 2, but reference stored here)
- `POST /encounters/:id/sign-off` — validates A field not empty, publishes 3 events:
  - `clinics.encounter.signed_off` → billing module
  - `clinics.prescription.issued` → pharmacy module (if Rx exists)
  - `clinics.lab-order.created` → lab module (Phase 2, ignored now)
- `GET /patients/:id/encounters` — paginated history (summary only)
- Allergy check on prescription add: 422 + warning object (does not block, warns)

**Done when**: Full encounter lifecycle works. Autosave doesn't conflict with sign-off. Sign-off fires all 3 events. Allergy warning appears. History paginates correctly.

---

### STEP 7 — Billing module (NestJS + PostgreSQL)

**Context**: Encounter sign-off fires events. Billing must catch them.  
**Read first**: `schemas/postgres/billing.prisma`, `api/billing.routes.md`  
**Estimated time**: 2 days

**Prisma models**: `Invoice`, `InvoiceItem`, `Payment`, `ServicesCatalog`, `TaxConfig`

**Tasks**:
- `modules/billing/`
- Redis subscriber: listens to `clinics.encounter.signed_off` → creates draft invoice in PG
- `GET /invoices` — list, filterable
- `GET /invoices/:id` — invoice with line items
- `PUT /invoices/:id` — edit draft (add/remove line items, apply discount)
- `POST /invoices/:id/send` — status: draft → sent, triggers email via communication module
- `POST /invoices/:id/payment` — record cash payment
- `POST /invoices/:id/pay/stripe` — create Stripe payment intent, return client_secret
- `POST /stripe/webhook` — handle `payment_intent.succeeded` → mark invoice paid
- `GET /orgs/:id/revenue` — daily/weekly/monthly revenue aggregates
- Publish `billing.invoice.paid` on successful payment

**Done when**: Invoice auto-created on encounter sign-off. Receptionist can edit and send. Cash payment recorded. Stripe payment flow completes end-to-end (test mode). Revenue dashboard returns correct aggregates.

---

### STEP 8 — Communication module (NestJS)

**Context**: Events fire but nothing is notified yet.  
**Estimated time**: 1 day

**Tasks**:
- `modules/communication/`
- Redis subscribers: `appointment.confirmed`, `appointment.checked_in`, `encounter.signed_off`, `billing.invoice.paid`
- Twilio SMS: appointment confirmation, 24h reminder (scheduled via Redis delayed job)
- SendGrid email: invoice PDF delivery, prescription PDF delivery
- `GET /patients/:id/notifications` — log of all sent notifications
- Template system: Jinja2-style templates stored in MongoDB `notification_templates` collection, per-org overridable

**Done when**: Patient receives SMS on booking confirmation. 24h reminder fires. Invoice email sends with PDF attached. Notification log readable.

---

### STEP 9 — AI service (FastAPI)

**Context**: NestJS backend fully functional. Wire up the AI sidecar.  
**Read first**: `api/ai.routes.md`, `docs/01-architecture.md` (FastAPI section)  
**Estimated time**: 2 days

**Tasks**:
- `apps/ai/main.py`: FastAPI app, CORS, validates NestJS JWT (shared secret)
- `GET /health`
- `POST /ai/copilot/summary` — fetches patient context from NestJS `/internal/` endpoint, calls GPT-4o, returns summary
- `POST /ai/copilot/differentials` — from current encounter SOAP S field, returns differential list
- `POST /ai/copilot/investigations` — from differentials, returns suggested tests
- `POST /ai/triage/message` — conversation state machine in Redis, maps symptoms → specialty → available doctors
- Rate limiting: Redis counter per user_id, 20 AI calls/hour
- Prompt templates: stored in MongoDB `ai_prompt_templates`, loaded at startup
- NestJS internal endpoint: `GET /internal/patients/:id/context` (requires `X-Internal-Service-Key`)

**Done when**: Copilot returns structured summary for a patient with 2 past encounters. Triage chatbot reaches `recommending` state after 3-4 messages. Rate limiter blocks after 20 calls.

---

### STEP 10 — Frontend: Auth + Tenancy + Onboarding

**Context**: All backend APIs work. Start the Next.js frontend.  
**Read first**: `frontend/route-tree.md`, `docs/04-user-roles.md`  
**Estimated time**: 2 days

**Tasks**:
- `app/(auth)/login/page.tsx` — login form, error handling
- `lib/auth.ts` — token management (access token in memory, refresh token via HttpOnly cookie)
- `middleware.ts` — route protection by role
- Admin shell layout with sidebar (role-based nav items)
- Clinical, Ops, Patient portal shells
- Onboarding wizard: `app/(admin)/onboarding/` — 4 steps: org → facility → first doctor → done
- Facility switcher (for multi-facility users)
- TanStack Query setup + API client `lib/api.ts`
- `packages/shared-types`: Export DTOs used by both frontend and API

**Done when**: Login works. Role-based route guard redirects correctly. Onboarding wizard completes and creates org/facility/user. Facility switcher changes active facility context.

---

### STEP 11 — Frontend: Patients + Appointments + Queue

**Context**: Auth flow works.  
**Estimated time**: 2 days

**Tasks**:
- Patient list + search (`/ops/patients`)
- Patient registration form (`/ops/patients/new`)
- Patient profile page (`/clinical/patients/[id]`) — demographics, allergies, problem list, past encounters list
- Appointment calendar (`/ops/appointments`) — FullCalendar, day/week views
- New appointment booking form — patient picker → doctor picker → date → slot → confirm
- Queue management screen (`/ops/queue`) — SSE connection, check-in button, token display
- Public queue display (`/queue-display/[facilityId]`) — large token display for waiting room TV

**Done when**: End-to-end booking flow works. Queue screen updates in real time on check-in. Public display accessible without login.

---

### STEP 12 — Frontend: Encounter editor + AI copilot

**Context**: The most complex frontend page.  
**Read first**: `frontend/route-tree.md` (encounter editor layout spec)  
**Estimated time**: 3 days

**Layout**: 3-column — patient summary (left 240px) | encounter editor (center flex-1) | AI copilot (right 280px)

**Tasks**:
- Encounter editor page (`/clinical/patients/[id]/encounters/[encounterId]`)
- Vitals form with autosave on blur
- SOAP note editor with 2-second debounced autosave
- ICD-10 search with autocomplete (local index of top 5000 codes + API fallback)
- Prescription writer: drug search → dose form → add to list
- Allergy warning banner (appears when drug matches patient allergy)
- AI copilot sidebar:
  - Patient summary card (loads on encounter open)
  - Differential chips (click to append to SOAP A field)
  - Investigation chips (click to add lab order)
  - "Regenerate" per section
  - All sections labelled: "AI suggestion — verify before saving"
- Sign-off confirmation modal
- Billing integration: frontend reflects auto-created invoice after sign-off

**Done when**: Doctor completes full encounter. Autosave confirmed by indicator. Allergy warning shows. AI copilot loads and suggestions are clickable. Sign-off succeeds and shows invoice link.

---

### STEP 13 — Frontend: Patient portal + Triage chatbot + Billing UI

**Context**: All clinical UI done.  
**Estimated time**: 2 days

**Tasks**:
- Patient portal (`/patient/*`): OTP phone auth, book appointment, view prescriptions, view invoices + pay
- Triage chatbot component — conversational UI, calls FastAPI `/ai/triage/message`, streams response
- Billing UI for receptionist (`/ops/billing`) — invoice list, invoice detail, edit, send
- Invoice PDF generation (server-side route in Next.js using `@react-pdf/renderer`)
- Basic analytics dashboard (`/admin/analytics`) — appointments/day chart, revenue/week, patient count

**Done when**: Patient signs up, uses chatbot, books appointment, receives confirmation SMS, views their prescription, pays invoice via Stripe. Analytics dashboard shows real numbers.

---

## Phase 2 — Diagnostics + Telemedicine (steps 14–20)

Not detailed here. Spec written when Phase 1 is validated with a real customer.

Step 14: Lab module backend (NestJS + Mongo)  
Step 15: Lab module frontend  
Step 16: Radiology orders + Orthanc PACS bridge  
Step 17: OHIF DICOM viewer integration  
Step 18: Telemedicine via Daily.co  
Step 19: Pharmacy dispensing module  
Step 20: AI imaging analysis (FastAPI)  

## Phase 3 — Enterprise (steps 21–30)

Step 21: IPD/bed management  
Step 22: OT scheduling  
Step 23: HR/attendance/payroll  
Step 24: Full inventory + procurement  
Step 25: Automation rules engine  
Step 26: Automation flow builder UI  
Step 27: Advanced cross-facility BI  
Step 28: HL7 FHIR API  
Step 29: React Native apps  
Step 30: Tenant billing + SaaS subscription management  

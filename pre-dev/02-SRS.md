# Phase 2 — Software Requirements Specification (SRS)

## MediCore HIS — Functional & Non-Functional Requirements

---

## 1. Functional Requirements

### 1.1 Authentication & Authorization

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-001 | The system shall authenticate users via email + password and return a JWT access token (15-minute expiry) and a refresh token (7-day expiry stored as HttpOnly cookie) | Login with valid credentials returns 200 with `access_token` in body and `refresh_token` in Set-Cookie header |
| FR-002 | The system shall reject login attempts with incorrect password with HTTP 401 | 3 wrong-password attempts return 401 with `{ code: "INVALID_CREDENTIALS" }` |
| FR-003 | The system shall refresh expired access tokens via `POST /auth/refresh` using the HttpOnly cookie | Call with valid refresh cookie returns new access_token; call with expired/revoked cookie returns 401 |
| FR-004 | The system shall invalidate refresh tokens on logout by marking them revoked in PostgreSQL | After logout, using the same refresh token to refresh returns 401 |
| FR-005 | The system shall enforce role-based permissions using `@Permissions()` decorators on protected endpoints | A RECEPTIONIST calling a DOCTOR-only endpoint receives 403 |
| FR-006 | The system shall scope all tenant-sensitive queries to the user's `org_id` via Prisma middleware | A user from Org A querying patients sees 0 results from Org B, even with direct ID guessing |
| FR-007 | The system shall support multi-facility roles — a user can have DOCTOR role at Facility A and ORG_ADMIN at Facility B | `GET /auth/me` returns `facilities: [{ facility_id, role, permissions }]` with distinct entries |

### 1.2 Tenancy

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-010 | The system shall create an Organization with: name, slug (unique), MRN prefix, plan (SOLO/CLINIC/HOSPITAL) | `POST /orgs` with valid data returns 201 with org object including auto-generated cuid ID |
| FR-011 | The system shall create Facilities under an Organization with: name, address, phone, email | `POST /orgs/:id/facilities` returns 201; `GET /orgs/:id/facilities` returns only that org's facilities |
| FR-012 | The system shall support atomic onboarding: creating Org + Facility + Admin User in a single PG transaction | `POST /orgs/onboard` either creates all 3 or rolls back all 3 if any step fails |
| FR-013 | The system shall publish `tenancy.facility.created` event to Redis when a facility is created | Redis MONITOR shows the event with correct org_id and facility_id payloads |

### 1.3 Patient Management

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-020 | The system shall register a patient with required fields: first name, last name, phone — and optional: DOB, gender, blood type, national ID, email, address | `POST /patients` with required fields returns 201 with auto-generated MRN |
| FR-021 | The system shall auto-generate MRN in format `{PREFIX}-{YYYY}-{COUNTER:05}` using atomic PG counter | Two concurrent registrations produce sequential MRNs with no duplicates |
| FR-022 | The system shall support fuzzy patient search across name, phone, MRN, and national_id fields | `GET /patients/search?q=amine` returns patients with "amine" in first or last name |
| FR-023 | The system shall enforce `org_id` on every patient document — patients from Org A are invisible to Org B | Direct GET with a patient _id from Org A by an Org B user returns 404 |
| FR-024 | The system shall maintain an allergy register per patient with: substance, type, reaction, severity | Adding an allergy with POST returns 200; the allergy appears in subsequent GET patient calls |
| FR-025 | The system shall maintain a problem list per patient with: condition, ICD code, status (active/resolved) | Problem list is returned as part of patient document |
| FR-026 | The system shall support file upload to Cloudflare R2 for patient documents (lab reports, referrals, insurance) | Upload returns URL; URL is accessible and stored in patient.documents[] array |

### 1.4 Scheduling

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-030 | The system shall allow setting doctor schedules: working days, start/end time, slot duration, break times | `POST /doctors/:id/schedule` with weekday + time range creates schedule; `GET` confirms |
| FR-031 | The system shall compute available appointment slots by subtracting booked appointments and breaks from schedule | `GET /doctors/:id/availability?date=2026-04-15&facility_id=X` returns array of available time slots |
| FR-032 | The system shall prevent double-booking using Redis optimistic lock on `schedule_lock:{doctorId}:{slot}` | Two simultaneous bookings for the same slot: first succeeds (201), second fails (409 Conflict) |
| FR-033 | The system shall support appointment lifecycle: `booked → confirmed → checked_in → in_progress → completed` and `booked → cancelled` and `booked → no_show` | PATCH with valid transition returns 200; PATCH with invalid transition returns 422 |
| FR-034 | The system shall generate a queue token on check-in (format: `T-{NNN}`) and update Redis queue state | Check-in returns token number; subsequent `GET /facilities/:id/queue` includes the new token |
| FR-035 | The system shall stream live queue updates via Server-Sent Events (SSE) | Opening SSE connection and checking in a patient produces an event within 2 seconds |
| FR-036 | The system shall expose a public (no-auth) queue display endpoint for waiting room screens | `GET /queue-display/:facilityId` returns current queue state without requiring Bearer token |
| FR-037 | The system shall auto-mark appointments as `no_show` 30 minutes after start_time if not checked in | Cron job runs; appointment with `booked` status past 30min threshold transitions to `no_show` |

### 1.5 Encounters (EMR Core)

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-040 | The system shall create one encounter per appointment (DOCTOR role only) | `POST /appointments/:id/encounter` from DOCTOR returns 201; second call returns 409 |
| FR-041 | The system shall support partial vitals updates with autosave | `PUT /encounters/:id/vitals` with `{ bp_systolic: 120 }` saves without requiring all vitals fields |
| FR-042 | The system shall support SOAP note editing with debounced autosave (2-second client-side) | `PUT /encounters/:id/soap` accepts partial SOAP updates; `last_autosaved_at` timestamp updates |
| FR-043 | The system shall support adding ICD-10 diagnoses with type (primary/secondary/differential) | `POST /encounters/:id/diagnoses` with icd_code + description returns 200 |
| FR-044 | The system shall support prescription writing: drug name, form, strength, dosage, frequency, duration, quantity | `POST /encounters/:id/prescriptions` returns 200 with prescription in encounter |
| FR-045 | The system shall check prescribed drugs against patient allergy register and return a warning (422 + warning object) without blocking | If drug matches allergy, response includes `{ warning: { type: "allergy_match", ... } }`; doctor can override with `allergy_override: true` |
| FR-046 | The system shall validate that SOAP Assessment field is non-empty at sign-off | `POST /encounters/:id/sign-off` with empty assessment returns 422 |
| FR-047 | On sign-off, the system shall publish `clinics.encounter.signed_off` event to Redis | Event contains org_id, facility_id, encounter_id, patient_id, doctor_id |
| FR-048 | On sign-off with prescriptions, the system shall publish `clinics.prescription.issued` event | Event contains encounter_id and prescriptions array |
| FR-049 | The system shall support paginated encounter history per patient (summary view) | `GET /patients/:id/encounters?page=1&limit=10` returns encounters with visit_date, status, doctor |

### 1.6 Billing

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-060 | The system shall auto-create a draft invoice in PostgreSQL when `clinics.encounter.signed_off` event fires | Event → invoice appears in `GET /invoices` with status DRAFT within 5 seconds |
| FR-061 | The system shall generate unique invoice numbers in format `INV-{YYYY}-{COUNTER:05}` | Two invoices created sequentially have sequential numbers |
| FR-062 | The system shall allow editing draft invoices: add/remove line items, apply discount, change notes | `PUT /invoices/:id` with new line items returns 200; totals recalculate correctly |
| FR-063 | The system shall support sending invoices: status transitions from DRAFT → SENT, triggers email | `POST /invoices/:id/send` returns 200; invoice status changes to SENT |
| FR-064 | The system shall record cash payments against invoices | `POST /invoices/:id/payment` with method=CASH → payment recorded → invoice status = PAID if fully covered |
| FR-065 | The system shall create Stripe payment intents for online payment | `POST /invoices/:id/pay/stripe` returns `client_secret` for frontend Stripe Elements |
| FR-066 | The system shall handle Stripe webhook `payment_intent.succeeded` to mark invoices as paid | Webhook → invoice status = PAID, paid_at timestamp set |
| FR-067 | The system shall provide revenue aggregates: daily, weekly, monthly, per facility | `GET /orgs/:id/revenue?period=monthly&facility_id=X` returns aggregate amounts |

### 1.7 AI Copilot

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-070 | The AI copilot shall accept a patient_id + encounter_id and return a structured patient summary | `POST /ai/copilot/summary` returns JSON with demographics, allergies, problem list, relevant past encounters |
| FR-071 | The AI copilot shall accept SOAP Subjective text and return differential diagnosis suggestions | `POST /ai/copilot/differentials` returns array of `{ condition, icd_code, confidence }` |
| FR-072 | The AI copilot shall accept differential diagnoses and return suggested investigations | `POST /ai/copilot/investigations` returns array of `{ test_name, rationale }` |
| FR-073 | The AI service shall validate the same JWT used by NestJS (shared JWT_SECRET) | Request with invalid/expired token returns 401 |
| FR-074 | The AI service shall enforce rate limiting: 20 requests/user/hour via Redis counter | 21st request in an hour returns 429 |
| FR-075 | The AI service shall cache identical prompt+context combinations for 1 hour in Redis | Second identical request returns cached response (faster, no OpenAI API call) |
| FR-076 | The AI service shall fetch patient context via NestJS internal API, never directly from databases | FastAPI calls `GET /internal/patients/:id/context` with X-Internal-Service-Key header |

### 1.8 Communication

| ID | Requirement | Testable Criterion |
|----|------------|-------------------|
| FR-080 | The system shall send SMS appointment confirmations via Twilio | Booking → SMS received at patient phone with appointment details |
| FR-081 | The system shall schedule 24h appointment reminders via Redis delayed job | Reminder SMS sent 24 hours before appointment start_time |
| FR-082 | The system shall send invoice PDF via SendGrid email | `POST /invoices/:id/send` → email received with PDF attachment |
| FR-083 | The system shall log all sent notifications in MongoDB `notification_logs` collection | `GET /patients/:id/notifications` returns sent SMS/email log |

---

## 2. Non-Functional Requirements

### 2.1 Performance

| ID | Requirement | Target |
|----|------------|--------|
| NFR-001 | API response time (P95) for CRUD operations | <500ms |
| NFR-002 | API response time (P95) for patient search | <800ms |
| NFR-003 | SSE queue update delivery time | <2 seconds from check-in |
| NFR-004 | AI copilot response time (P95) | <8 seconds (includes OpenAI API latency) |
| NFR-005 | Page load time (Next.js) | <2 seconds (LCP) |
| NFR-006 | Concurrent user support | 50 users minimum without degradation |

### 2.2 Availability & Reliability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-010 | Monthly uptime | ≥99.5% (allowing ~3.6 hours downtime/month) |
| NFR-011 | Database backup frequency | Daily automated (managed services) |
| NFR-012 | Recovery Time Objective (RTO) | <4 hours |
| NFR-013 | Recovery Point Objective (RPO) | <24 hours (daily backup) |
| NFR-014 | Zero data loss on PG financial transactions | ACID compliance + WAL |

### 2.3 Scalability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-020 | Patient records per organization | Up to 50,000 without index degradation |
| NFR-021 | Concurrent encounters per facility | Up to 20 simultaneous |
| NFR-022 | Organizations per instance | Up to 100 (before horizontal scaling needed) |

### 2.4 Security

| ID | Requirement | Target |
|----|------------|--------|
| NFR-030 | All data in transit encrypted via TLS 1.2+ | HTTPS enforced on all endpoints |
| NFR-031 | All data at rest encrypted | Managed DB encryption (Atlas, Railway) |
| NFR-032 | Passwords hashed with bcrypt (cost factor 12+) | Plaintext passwords never stored or logged |
| NFR-033 | JWT tokens signed with HS256 or RS256 | Secret rotatable without user disruption |
| NFR-034 | Audit log for all CUD operations on clinical data | Every create/update/delete logged with user_id, timestamp, entity |
| NFR-035 | Rate limiting on auth endpoints | 5 attempts per IP per 15 minutes on /auth/login |
| NFR-036 | CORS restricted to known origins | Only app domain(s) allowed |

### 2.5 Usability

| ID | Requirement | Target |
|----|------------|--------|
| NFR-040 | Receptionist can complete new patient registration | <90 seconds, no training manual |
| NFR-041 | Doctor can complete full encounter | <5 minutes including AI copilot usage |
| NFR-042 | Admin can onboard organization | <10 minutes via wizard |

---

## 3. External Interface Requirements

| Interface | Protocol | Direction | Purpose |
|-----------|----------|-----------|---------|
| OpenAI API | HTTPS | Outbound (FastAPI → OpenAI) | GPT-4o/GPT-4o-mini for clinical AI |
| Twilio API | HTTPS | Outbound (NestJS → Twilio) | SMS notifications |
| SendGrid API | HTTPS | Outbound (NestJS → SendGrid) | Email sending |
| Stripe API | HTTPS | Bidirectional | Payment processing + webhooks |
| Cloudflare R2 | S3-compatible HTTPS | Outbound (NestJS → R2) | File upload/storage |
| MongoDB Atlas | mongodb+srv | Bidirectional (NestJS ↔ Atlas) | Clinical document storage |
| Railway PostgreSQL | PostgreSQL wire protocol | Bidirectional (NestJS ↔ PG) | Relational data storage |
| Railway Redis | Redis wire protocol | Bidirectional (NestJS/FastAPI ↔ Redis) | Events, cache, queue state |

---

## 4. System Constraints

| Constraint | Description |
|-----------|-------------|
| SC-001 | NestJS backend must use TypeScript strict mode |
| SC-002 | All MongoDB documents must carry `org_id` field (tenancy scoping) |
| SC-003 | All MongoDB clinical documents must carry `org_id` + `facility_id` |
| SC-004 | Modules must communicate via Redis events only — no direct cross-module imports |
| SC-005 | FastAPI AI service must be stateless — no direct database connections |
| SC-006 | All AI suggestions must be labeled "AI suggestion — verify before saving" |
| SC-007 | Shared TypeScript types between frontend and backend via `packages/shared-types` |
| SC-008 | Maximum 1 database client per module (either Prisma OR Mongoose, not both in the same service method) |

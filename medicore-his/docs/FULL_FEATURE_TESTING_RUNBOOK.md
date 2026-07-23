# MediCore HIS Full Feature Testing Runbook

Last updated: 2026-04-09
Target: current code in medicore-his

## 1. Purpose

This document gives a complete step-by-step way to test this version end-to-end:
* how to boot the system
* which credentials to use
* what to expect on each page
* what actions to test
* what result should be considered PASS/FAIL

It covers implemented features only.

## 2. Environment setup

## 2.1 Prerequisites

* Node 20+
* pnpm 9+
* Docker + Docker Compose
* Python 3.11+ (for AI sidecar)

## 2.2 Boot sequence

01. Open terminal at medicore-his root.
02. Copy env file.
03. Start infrastructure.
04. Install dependencies.
05. Run migrations and seed.
06. Start web+api.
07. Start AI sidecar (separate terminal).

Commands:

```bash
cp .env.example .env
pnpm db:up
pnpm install
pnpm --filter @medicore/api db:migrate
pnpm --filter @medicore/api db:seed
pnpm dev
```

AI sidecar terminal:

```bash
cd apps/ai
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 2.3 Sanity checks

* Web opens: http://localhost:3000
* API health: http://localhost:3001/api/v1/health
* AI health: http://localhost:8000/health

## 3. Seeded credentials and test data

From seed script:
* Admin: admin@medicore.ma / Admin1234!
* Doctor: doctor@medicore.ma / Doctor1234!
* Receptionist: receptionist@medicore.ma / Recept1234!

Seeded facility:
* Facility ID: seed-facility-001

Seeded patients (Mongo):
* MRN format CEA-2026-00001 ... CEA-2026-00005
* Phones: +212600000001 ... +212600000005

Portal OTP in dev:
* DEV_OTP_CODE from .env (default 123456)

## 3.1 Current OTP and session security contract

These values reflect the current implementation. They differ intentionally from the initial SRS
draft (which specified 10-min TTL and 3 requests per hour). The implementation was tightened
during Session 7 and the new values are the product policy going forward.

| Parameter | Current value | Constant | Override |
|-----------|--------------|----------|---------|
| OTP code TTL | 5 minutes | `OTP_TTL_SECONDS = 300` | Not configurable (hardcoded) |
| OTP request window | 10 minutes | `OTP_REQUEST_WINDOW_SECONDS = 600` | Not configurable (hardcoded) |
| Max OTP requests per window | 3 | `OTP_MAX_REQUESTS_PER_WINDOW = 3` | Not configurable (hardcoded) |
| Portal JWT lifetime | 24 hours (default) | `PORTAL_JWT_EXPIRES_IN` | Override via env |
| Portal session cookie | 24 hours | `PORTAL_SESSION_MAX_AGE_MS` | Aligned with JWT — must change together |
| Staff refresh token cookie | 7 days | `REFRESH_COOKIE_OPTIONS.maxAge` | Hardcoded |

 **Tester notes:** 
* In dev, DEV_OTP_CODE bypasses the real OTP flow — use it for happy-path tests.
* To test rate-limiting, you need 4 OTP requests within 10 minutes from the same phone number.
* To test expiry (410 Gone), wait 5+ minutes after OTP is issued before verifying, or clear
  the Redis key manually: `DEL otp:+212600000001` 
* Portal session and JWT lifetime are now aligned at 24h. If you see a user forced to re-auth
  before 24h without an explicit logout, that is a regression.

## 4. Master full-tour sequence

Important navigation rule:
* Staff shells use shared top-level paths.
* After login, prefer sidebar navigation for each role instead of manually typing URLs for ambiguous routes.

Run this order once for a full regression:
01. Staff login and role shells.
02. Admin pages.
03. Clinical schedule setup.
04. Ops patient registration and appointment booking.
05. Queue check-in.
06. Clinical encounter completion and sign-off.
07. Billing verification and payment.
08. Lab result entry and patient portal lab visibility.
09. Portal OTP login, records, appointments, invoices, settings.
10. Security and negative tests.

## 5. Page-by-page checklist

## 5.1 Auth and utility pages

| Route | What you should see | What to test | PASS criteria |
|---|---|---|---|
| /login | Email/password form, submit button, error surface | Login with each seeded user and one wrong password | Valid users enter app; wrong password returns clear error |
| / | Redirect behavior | Open / directly | Redirects to /login |
| /payment/success | Payment success message and return action | Open manually and from payment flow | Page loads and does not crash |
| /payment/error | Payment failure message and return action | Open manually and from failed payment flow | Page loads and does not crash |

## 5.2 Admin pages

| Route | What you should find | What to test | PASS criteria |
|---|---|---|---|
| /dashboard | KPI cards, recent billing blocks, facility-aware stats | Change active facility and refresh values | Metrics update per facility context |
| /team | Staff list and role badges | Create/update/check role visibility | Changes persist and roles render correctly |
| /facilities | Facility cards/list and create/edit actions | Add facility data and verify list refresh | New facility appears and remains after reload |
| /services | Service catalog table/cards | Add or edit service used by billing | Service persists and is selectable in billing |
| /analytics | Revenue and trends views | Validate non-empty chart/table from seeded invoices | Data visual section loads without errors |
| /audit-log | Audit list with filters/search | Trigger actions in app, then check audit entries | New entries appear and are filterable |
| /settings | Organization and security settings surfaces | Modify safe setting and reload | Value remains after reload (if wired), page stable |

## 5.3 Ops pages

| Route | What you should find | What to test | PASS criteria |
|---|---|---|---|
| /patients | Searchable patient list with pagination | Search by MRN, name, phone | Correct filtered rows returned |
| /patients/new | Patient registration form with required fields | Create patient with minimal valid payload | New patient appears in /patients |
| /appointments | Booking UI with doctor/facility/time choices | Book a future slot | Appointment is created; no duplicate same-slot booking |
| /queue | Appointment list and queue/check-in controls | Check in booked patient | Queue token generated and visible |
| /billing | Invoice list and status labels | Confirm signed-off encounter generated invoice | Invoice appears shortly after sign-off |
| /billing/[invoiceId] | Invoice detail, items, total, payment actions | Add item, record cash payment, test Stripe start | Totals update; status changes to paid when fully paid |
| /lab | Lab orders queue/list with tabs and search | Filter by status, search by order/patient/panel, open an order | Correct filtered results and navigation to detail |
| /lab/orders/[id] | Lab order detail with workflow actions | Advance pending→collected→in_progress, cancel non-final order, open result entry | Status transitions persist and actions follow rules |
| /lab/orders/[id]/result | Result entry form by components | Submit results and mark status transitions | Result persists and becomes retrievable |

## 5.4 Clinical pages

| Route | What you should find | What to test | PASS criteria |
|---|---|---|---|
| /patients | Clinical patient registry with allergy context | Open patient timeline from row | Navigation works and data loads |
| /patients/[id] | Profile, timeline, allergies/problem list cards | Open latest encounter from timeline | Encounter opens and state matches record |
| /schedule | Doctor schedule/availability controls | Create availability window used by ops booking | New slots become available for booking |
| /encounters/[id] | Full encounter workspace: vitals, SOAP, diagnosis, Rx, lab, sign-off | Update vitals/SOAP, add diagnosis, add Rx (allergy warning path), sign off | Data saves; sign-off locks editing; invoice flow triggers |
| /encounter/[id] | Alternate encounter workspace route | Open and verify load path | No runtime crash; expected encounter content appears |

## 5.5 Portal pages

| Route | What you should find | What to test | PASS criteria |
|---|---|---|---|
| /portal/login | OTP phone input and verification flow | Use seeded patient phone + DEV_OTP_CODE | Login succeeds and session is established |
| /portal | Redirect to dashboard | Open directly after login | Redirects to /portal/dashboard |
| /portal/dashboard | Upcoming appointments, invoices, quick overview | Validate cards reflect same patient data only | No cross-patient leakage |
| /portal/records | Encounter history and allergies/conditions tabs | Expand encounters and verify diagnoses show | Encounter content loads correctly |
| /portal/appointments | Appointment list + book/cancel/reschedule | Book one new appointment, cancel one future, reschedule one >24h away | Rules enforced and list updates |
| /portal/labs | Completed lab results list and critical warning banner | Verify submitted lab result appears | Result visible to correct patient only |
| /portal/invoices | Invoice cards, pay online, receipt PDF download | Start Stripe checkout and download receipt PDF | Checkout redirect works; receipt downloads |
| /portal/invoices/success | Confirmation state after Stripe callback | Test paid and already_paid handling | Correct status message shown |
| /portal/invoices/cancel | Cancel callback UX | Cancel checkout and return | User sees cancellation guidance |
| /portal/settings | Notification and AI consent toggles + GDPR requests | Save toggles, request data export, request delete-account | 202/queued behavior and success feedback |
| /portal/profile | Read-only identity + consent status | Verify values match patient and consent record | Accurate display and no edit crash |

## 6. End-to-end functional scenarios

## Scenario A: Reception to doctor to billing

01. Login as doctor and create schedule slots in /schedule.
02. Login as receptionist and book patient appointment in /appointments.
03. Check in patient in /queue.
04. Login as doctor and open /encounters/[id].
05. Complete SOAP assessment, diagnosis, prescription, sign off.
06. Login as receptionist and verify invoice exists in /billing.
07. Add line item and record payment.

Expected outcome:
* Encounter becomes read-only after sign-off.
* Invoice is created after sign-off.
* Payment updates invoice status.

## Scenario B: Portal self-service and consent

01. Login at /portal/login using seeded patient phone and dev OTP.
02. Review /portal/dashboard, /portal/records, /portal/labs.
03. Open /portal/appointments and self-book a slot.
04. Open /portal/invoices and initiate payment.
05. Open /portal/settings and toggle consent/preferences.
06. Submit GDPR export and delete-account requests.

Expected outcome:
* Patient only sees own data.
* Payment callback pages behave correctly.
* Settings persist and GDPR requests return queued acknowledgements.

## Scenario C: Lab pipeline to patient visibility

01. In encounter workspace, add lab order.
02. Open /lab/orders/[id]/result and submit result.
03. Confirm result appears in portal /portal/labs.

Expected outcome:
* Result state transitions correctly and is visible to the right patient.

## 7. Security and negative tests

Run these as mandatory checks:
01. Tenant isolation: try accessing another org patient/invoice by ID; expect not found/forbidden.
02. Portal self-scoping: patient A cannot see patient B records/invoices.
03. OTP controls (see §3.1 for exact values):
   - Wrong code → 401
   - Expired code (>5 min) → 410 Gone
   - 4th request within 10 min window → 429 Too Many Requests
   - Portal forced re-auth before 24h without logout → regression (cookie/JWT mismatch fixed)
04. Scheduling conflict: double-book same doctor slot; second request must fail.
05. Encounter lock: after sign-off, write endpoints (vitals/soap/diagnosis/rx) reject updates.
06. Payment idempotency: confirm endpoint on already paid invoice returns already_paid behavior.
07. Consent gate: portal non-login routes redirect to /portal/login, consent required before shell use.

## 8. API smoke checklist (quick)

Without auth:
* GET /api/v1/health
* GET /api/v1/scheduling/queue-display/seed-facility-001

With auth/session:
* Staff auth: /api/v1/auth/login, /api/v1/auth/me
* Portal auth: /api/v1/portal/auth/otp/request and /otp/verify
* Portal core: /api/v1/portal/me, /appointments, /invoices, /settings
* Billing core: /api/v1/billing/invoices and payment routes

## 9. Exit criteria for test completion

Mark regression complete only if all are true:
01. All pages in Section 5 load and perform their core action.
02. Scenarios A/B/C all pass end-to-end.
03. Security/negative tests in Section 7 all pass.
04. API and web typechecks pass:
   - pnpm --filter @medicore/api typecheck
   - pnpm --filter @medicore/web typecheck
05. No P0/P1 defects remain open.

## 10. Known out-of-scope for this version

Do not fail this runbook for missing modules not yet implemented:
* pharmacy
* radiology
* telemedicine
* ipd
* messaging
* hr
* workflow automation
* hl7/fhir
* native mobile apps

Those belong to later blueprint steps and should be tracked as roadmap gaps, not regression failures for the current version.

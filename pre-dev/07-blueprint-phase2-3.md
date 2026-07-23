# Phase 2 & 3 — Execution Blueprint

## MediCore HIS — Build Steps 14–35 (Post-MVP)

> Extends `07-blueprint.md` (Steps 1–13). Each step is agent-executable with self-contained context.

---

## Phase 2 Build Steps

### Step 14 — Patient Portal (Auth + Dashboard + Records)

**Context:** The patient portal is a separate Next.js route group `/(portal)` with OTP-based authentication (no passwords). Patients log in with phone number + 6-digit OTP via Twilio. JWT payload includes `role: PATIENT`. Portal shows: dashboard (upcoming appointments, unpaid invoices), encounter history (read-only), prescription downloads. Patient data comes from the existing Patients module — portal endpoints just add a patient-scoped view layer.

**Objective:** Implement OTP auth flow, patient JWT issuance, portal dashboard, medical records viewer, prescription PDF download.

**Outputs:**
- `apps/api/src/portal/` — module, controller, service, OTP guard
- `apps/web/app/(portal)/` — login, dashboard, records, settings pages
- Redis OTP storage (`otp:{phone}` with 10-min TTL)

**Acceptance criteria:**
- Patient receives OTP SMS within 10 seconds
- Valid OTP → JWT with `role: PATIENT` → portal dashboard loads
- Patient sees only their own records (not other patients in same org)
- Prescription PDF downloads correctly
- GDPR data export request creates a queued job

**Estimated time:** 3–4 dev days.

---

### Step 15 — Patient Portal (Appointments + Invoices + Consent)

**Context:** Extends the portal with self-service appointment booking (reuses existing scheduling logic), appointment cancellation, invoice viewing, Stripe payment from portal, and consent management (notification toggles, AI consent, data deletion request).

**Objective:** Complete portal with booking, payments, and privacy controls.

**Outputs:**
- Portal appointment booking flow (select facility → doctor → slot → confirm)
- Portal invoice list + Stripe payment form
- Portal settings page (consent toggles)
- GDPR endpoints (data export, deletion request)

**Acceptance criteria:**
- Patient books appointment from portal → SMS confirmation sent → appears in doctor's schedule
- Patient pays invoice from portal → Stripe payment → invoice status = PAID
- Patient toggles AI consent OFF → AI copilot shows "AI disabled for this patient" in encounter
- Data deletion request → admin gets notification → admin confirms → patient anonymized

**Estimated time:** 3–4 dev days.

---

### Step 16 — Lab Module (Catalog + Orders + Queue)

**Context:** Lab tests are ordered by doctors during encounters, processed by lab techs, and results are authorized by supervising doctors. Lab test catalog lives in PG (name, category, specimen type, normal ranges, price). Lab orders live in MongoDB (flexible result structure). Lab orders auto-create billing charges on authorization.

**Objective:** Implement lab test catalog CRUD, lab order creation from encounters, lab tech queue, specimen tracking, result entry with auto-flagging, authorization workflow.

**Outputs:**
- `apps/api/src/lab/` — module, controller, service, lab-order.schema.ts
- `apps/api/prisma/` — LabTestCatalog model
- `apps/web/app/(lab)/` — queue, order detail, catalog, reports pages
- Lab sidebar navigation

**Acceptance criteria:**
- Doctor orders "CBC + CRP" from encounter → order appears in lab queue
- Lab tech marks specimen collected → enters results → abnormal values auto-flagged (red)
- Supervising doctor authorizes → `lab.result.authorized` event → billing charges added
- Lab results appear in patient encounter timeline
- Lab result PDF downloadable

**Estimated time:** 4–5 dev days.

---

### Step 17 — Pharmacy Module

**Context:** Pharmacy has its own drug catalog (PG), inventory with batch/expiry tracking (PG), and dispensing workflow (MongoDB). When a doctor's encounter sign-off fires `pharmacy.rx.received`, the prescription appears in the pharmacist's queue. Pharmacist verifies, checks stock, dispenses, and records. Dispensing triggers billing and stock decrement.

**Objective:** Implement drug catalog, pharmacy inventory, dispensing workflow, stock alerts, purchase orders, supplier management.

**Outputs:**
- `apps/api/src/pharmacy/` — module, controller, service, dispensing.schema.ts
- `apps/api/prisma/` — Drug, PharmacyInventory, Supplier, PurchaseOrder models
- `apps/web/app/(pharmacy)/` — queue, dispense, inventory, drugs, POs, suppliers pages

**Acceptance criteria:**
- Drug catalog CRUD works, searchable by name/category
- Prescription from encounter sign-off → appears in pharmacy queue
- Pharmacist dispenses → stock decrements → billing charge added
- Stock below reorder level → alert displayed + email to admin
- Purchase order flow: create → approve → mark received → stock updated

**Estimated time:** 4–5 dev days.

---

### Step 18 — Telemedicine Module

**Context:** Video consultations use Daily.co API. A video session is created when a telemedicine-type appointment approaches. Patient joins via portal, doctor joins via clinical shell. Doctor can edit encounter during video call (split-screen: video + encounter form). Session end triggers billing for telemedicine service.

**Objective:** Implement Daily.co integration, video room creation, waiting room UI, in-session encounter editing, telemedicine billing.

**Outputs:**
- `apps/api/src/telemedicine/` — module, controller, service, video-session.schema.ts
- `apps/web/app/(clinical)/telemedicine/[sessionId]/page.tsx` — doctor video + encounter
- `apps/web/app/(portal)/telemedicine/[sessionId]/page.tsx` — patient video
- Daily.co SDK integration

**Acceptance criteria:**
- Create telemedicine appointment → video session auto-created → room URL generated
- Patient joins waiting room → sees "Doctor will join shortly"
- Doctor joins → both see video feed → doctor can edit encounter sidebar
- Doctor ends call → duration calculated → billing charge added
- Session works on Chrome, Firefox, Safari, and mobile browsers

**Estimated time:** 3–4 dev days.

---

### Step 19 — IPD Module (Wards + Beds + Admissions)

**Context:** IPD manages inpatient workflows. Wards and beds live in PG (relational — capacity tracking). Admissions live in MongoDB (document — embedded round notes, medication schedule, bed history). Bed allocation uses the same conflict-prevention pattern as appointment booking (check + lock + write). Daily cron adds bed charges to patient invoice. Discharge generates a summary document and frees the bed.

**Objective:** Implement ward/bed management, patient admission, bed allocation, bed transfers, nursing station dashboard, daily round notes, discharge with summary, bed charge billing.

**Outputs:**
- `apps/api/src/ipd/` — module, controller, service, admission.schema.ts
- `apps/api/prisma/` — Ward, Bed models
- `apps/web/app/(ipd)/` — admissions, wards, beds, nursing station, rounds, discharge pages
- Daily cron job for bed charges

**Acceptance criteria:**
- Create ward → add beds → bed map shows available/occupied status
- Admit patient → bed status = OCCUPIED → admission appears in list
- Transfer patient → bed history updated → old bed freed → new bed occupied
- Nursing station shows today's vitals due + medications due
- Doctor adds round notes → visible in admission timeline
- Discharge → summary PDF → bed freed → billing finalized → discharge SMS sent
- Daily cron adds bed charges at midnight for all active admissions

**Estimated time:** 5–6 dev days.

---

### Step 20 — Inventory Module

**Context:** Tracks consumables and equipment (not drugs — those are in Pharmacy). Items have reorder levels. Stock transactions track receive/issue/adjust. Purchase orders have approval workflow. Shares supplier management with Pharmacy.

**Objective:** Implement item catalog, stock transactions, low-stock alerts, purchase orders.

**Outputs:**
- `apps/api/src/inventory/` — module, controller, service
- `apps/api/prisma/` — InventoryItem, StockTransaction models
- `apps/web/app/(ops)/inventory/` — dashboard, catalog, transactions, POs pages

**Acceptance criteria:**
- Item catalog CRUD, stock receive/issue works
- Stock below reorder level → alert on dashboard + email
- Purchase order: create → approve → mark received → stock updated

**Estimated time:** 2–3 dev days.

---

### Step 21 — Radiology Module

**Context:** Similar structure to Lab: orders from encounters, report entry by radiologists, authorization workflow, billing integration. Optional DICOM viewer via Orthanc (iframe or Cornerstone.js).

**Objective:** Implement radiology catalog, order creation, report entry, authorization, optional DICOM viewer.

**Outputs:**
- `apps/api/src/radiology/` — module, controller, service
- `apps/web/app/(radiology)/` — queue, report entry, catalog, viewer pages

**Acceptance criteria:**
- Doctor orders X-Ray from encounter → appears in radiology queue
- Radiologist enters report → authorizes → billing charge added → results in encounter
- DICOM viewer loads images (if Orthanc configured)

**Estimated time:** 3–4 dev days.

---

### Step 22 — Internal Messaging

**Context:** Staff-to-staff messaging within org. Uses MongoDB for messages/conversations and WebSocket for real-time delivery. Conversations can be linked to patient context (so doctors can discuss a case).

**Objective:** Implement conversations, direct messaging, group chats, WebSocket real-time, patient-context linking.

**Outputs:**
- `apps/api/src/messaging/` — module, controller, service, gateway (WebSocket)
- `apps/web/components/messaging/` — inbox, conversation, compose components
- WebSocket integration for real-time message push

**Acceptance criteria:**
- Send message → recipient sees it in <1 second (WebSocket)
- Group conversation works with 3+ participants
- Patient link shows patient context in conversation header
- Unread badge counts update correctly

**Estimated time:** 3 dev days.

---

### Step 23 — Triage Chatbot + AI Ambient Audio

**Context:** Triage is a public-facing chatbot that collects symptoms, sends them to the AI sidecar for urgency assessment, and optionally books an appointment. Ambient audio captures doctor-patient conversations, sends to Deepgram/Whisper for transcription, then AI structures into SOAP format.

**Objective:** Implement triage chatbot (public, no auth), ambient audio recording + transcription + SOAP auto-population.

**Outputs:**
- `apps/api/src/triage/` — module, controller
- `apps/ai/routers/triage.py` — symptom assessment endpoint
- `apps/ai/routers/ambient.py` — audio transcription endpoint
- `apps/web/app/(public)/triage/[orgSlug]/page.tsx` — chatbot UI
- Encounter editor: "Record" button + audio integration

**Acceptance criteria:**
- Triage chatbot: enter symptoms → AI classifies urgency (R/A/G) → suggests booking
- Triage data attaches to resulting appointment/encounter
- Ambient: click Record → audio captured → transcription returned → SOAP pre-filled
- Audio file optionally saved to R2 (consent toggle)

**Estimated time:** 4–5 dev days.

---

### Step 24 — Platform Features (CMS + i18n + Campaigns + Config + Backup)

**Context:** Bundle of smaller platform features: built-in clinic marketing pages (CMS with section builder), multi-language support (i18n with French/Arabic/English), SMS/email campaigns (bulk outreach), module configuration (toggle modules per org), custom fields, backup/restore admin UI.

**Objective:** Implement all remaining Phase 2 platform features as a single consolidated step.

**Outputs:**
- CMS: page builder, public clinic page rendering, custom domain support
- i18n: translation management, RTL support for Arabic, per-org language setting
- Campaigns: campaign builder, audience filter, rate-limited broadcast, delivery analytics
- Config: module toggle, custom field definitions
- Backup: admin backup trigger, history viewer

**Acceptance criteria:**
- CMS: admin builds clinic page → public URL renders it → SEO meta tags present
- i18n: switch language → all UI text updates → Arabic renders RTL
- Campaign: create campaign → filter audience → send → analytics show delivery stats
- Module toggle: disable Lab module → lab sidebar disappears, lab endpoints return 403
- Custom field: add "Blood Group" to Patient → field appears in registration form
- Backup: trigger backup → appears in history → restore request queued

**Estimated time:** 5–6 dev days.

---

### Step 25 — Helpdesk + Enhanced Analytics + Polish

**Context:** Final Phase 2 step: integrate Tawk.to/Crisp helpdesk widget, build enhanced analytics dashboards (clinical KPIs, demographics, AI usage stats, PDF/CSV export), and polish all Phase 2 screens (loading states, error states, responsive design).

**Objective:** Complete Phase 2 with helpdesk integration, advanced analytics, and UI polish pass.

**Acceptance criteria:**
- Helpdesk widget visible on all staff pages (bottom-right)
- Clinical KPIs dashboard: avg encounter duration, follow-up rate, no-show rate
- AI usage dashboard: total requests, acceptance rate, time saved estimate
- PDF/CSV report export works for all report types
- All Phase 2 screens pass the "definition of done" checklist

**Estimated time:** 3–4 dev days.

---

## Phase 3 Build Steps

### Step 26 — HR Module (Staff + Attendance + Leave)

**Objective:** Staff profiles, attendance tracking (check-in/out), leave management (request → approve), department-based roster management.
**Estimated time:** 4–5 dev days.

### Step 27 — HR Module (Payroll + Reports)

**Objective:** Basic payroll calculation (salary, deductions, bonuses), monthly payslip PDF, payroll reports, staff performance metrics.
**Estimated time:** 3–4 dev days.

### Step 28 — Workflow Automation Engine (Simple Rules)

**Objective:** IF/THEN rules engine: define trigger + conditions + actions. Execute on matching events. Execution log with success/fail tracking.
**Estimated time:** 4–5 dev days.

### Step 29 — Workflow Automation Engine (Visual Builder)

**Objective:** Drag-and-drop workflow canvas (nodes: trigger → condition → action). Template library with pre-built automations. Built with React Flow.
**Estimated time:** 5–6 dev days.

### Step 30 — React Native Patient App

**Objective:** Patient mobile app: OTP login, dashboard, records, appointments (book/cancel), invoices (pay), push notifications via Firebase FCM.
**Estimated time:** 6–8 dev days.

### Step 31 — React Native Doctor App

**Objective:** Doctor mobile app: login, today's schedule, patient search, simplified encounter editor, AI copilot access, push notifications.
**Estimated time:** 6–8 dev days.

### Step 32 — HL7 FHIR API

**Objective:** FHIR R4 resource endpoints for Patient, Encounter, Observation, MedicationRequest, DiagnosticReport, Organization, Practitioner. OAuth2 authentication for external integrations.
**Estimated time:** 5–6 dev days.

### Step 33 — AI Advanced (Optimization + Risk Scoring)

**Objective:** Appointment demand forecasting from historical data, population health risk scoring across patient cohort, per-patient longitudinal trend detection (weight, BP, HbA1c).
**Estimated time:** 4–5 dev days.

### Step 34 — Ambulance Management

**Objective:** Fleet registry, dispatch linked to patients, ambulance status tracking, ambulance billing charges.
**Estimated time:** 2–3 dev days.

### Step 35 — Mobile Polish + App Store Submission

**Objective:** Final polish for both mobile apps, app store screenshots, TestFlight/Google Play internal testing, submission to Apple + Google.
**Estimated time:** 3–4 dev days.

---

## Full Timeline Summary

| Phase | Steps | Dev Days | Calendar (15-20h/wk) |
|-------|-------|---------|----------------------|
| Phase 1 (MVP) | Steps 1–13 | ~35 days | Months 1–5 |
| Phase 2 | Steps 14–25 | ~42 days | Months 6–11 |
| Phase 3 | Steps 26–35 | ~44 days | Months 12–18 |
| **Total** | **35 steps** | **~121 dev days** | **~18 months** |

> With a second developer, Phase 2 and 3 could be parallelized significantly (frontend developer + backend developer working simultaneously), reducing total calendar time to ~12 months.

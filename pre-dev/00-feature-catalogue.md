# Feature Catalogue — All Phases

## MediCore HIS — Master Feature Registry

> Single source of truth for every planned feature. Each feature is assigned a phase, RICE score, module, and implementation status.

---

## Phase Assignment Rules
- **Phase 1 (MVP)**: Core clinical workflow for outpatient clinics — auth, patients, scheduling, encounters, billing, AI copilot, notifications
- **Phase 2**: Extended clinical modules + patient-facing features — portal, lab, pharmacy, radiology, telemedicine, IPD, inventory, messaging, CMS, i18n, triage, ambient audio
- **Phase 3**: Enterprise scale + automation + mobile — HR, workflow engine, React Native apps, FHIR, AI optimization, ambulance, advanced analytics

---

## Phase 1 — MVP Features (13 modules, ~25 features)

| ID | Feature | Module | RICE | Status |
|----|---------|--------|------|--------|
| F-001 | JWT auth (login, refresh, logout, me) | Auth | 90 | Specified |
| F-002 | RBAC with permissions decorators | Auth | 85 | Specified |
| F-003 | Rate-limited login (5/IP/15min) | Auth | 70 | Specified |
| F-004 | Atomic onboarding (org + facility + admin) | Tenancy | 88 | Specified |
| F-005 | Organization CRUD | Tenancy | 80 | Specified |
| F-006 | Facility CRUD | Tenancy | 80 | Specified |
| F-007 | User management (invite, roles, deactivate) | Tenancy | 75 | Specified |
| F-008 | Patient registration with auto-MRN | Patients | 92 | Specified |
| F-009 | Patient search (name/phone/MRN/ID) | Patients | 90 | Specified |
| F-010 | Allergy register with drug matching | Patients | 85 | Specified |
| F-011 | Problem list (ICD-10 coded) | Patients | 80 | Specified |
| F-012 | Patient document uploads (R2) | Patients | 70 | Specified |
| F-013 | Doctor schedule CRUD | Scheduling | 88 | Specified |
| F-014 | Availability computation | Scheduling | 85 | Specified |
| F-015 | Appointment booking (Redis lock) | Scheduling | 90 | Specified |
| F-016 | Queue token system + SSE | Scheduling | 85 | Specified |
| F-017 | Public queue display (no auth) | Scheduling | 75 | Specified |
| F-018 | Auto no-show marking (cron) | Scheduling | 65 | Specified |
| F-019 | Encounter lifecycle (draft→signed_off) | Encounters | 95 | Specified |
| F-020 | Vitals autosave | Encounters | 80 | Specified |
| F-021 | SOAP editor with debounced save | Encounters | 90 | Specified |
| F-022 | ICD-10 diagnosis entry | Encounters | 85 | Specified |
| F-023 | Prescription writer + allergy check | Encounters | 90 | Specified |
| F-024 | Encounter sign-off (irreversible + events) | Encounters | 88 | Specified |
| F-025 | Auto-invoice on sign-off | Billing | 88 | Specified |
| F-026 | Invoice CRUD + lifecycle | Billing | 85 | Specified |
| F-027 | Cash payment recording | Billing | 80 | Specified |
| F-028 | Stripe payment + webhooks | Billing | 75 | Specified |
| F-029 | Revenue dashboard | Billing | 70 | Specified |
| F-030 | SMS confirmations (Twilio) | Comms | 80 | Specified |
| F-031 | Email invoices with PDF (SendGrid) | Comms | 75 | Specified |
| F-032 | 24h appointment reminders | Comms | 70 | Specified |
| F-033 | AI SOAP expansion | AI Copilot | 92 | Specified |
| F-034 | AI differential diagnosis | AI Copilot | 85 | Specified |
| F-035 | AI investigation recommendations | AI Copilot | 80 | Specified |
| F-036 | Admin dashboard + analytics | Admin | 70 | Specified |
| F-037 | Audit log viewer | Admin | 65 | Specified |
| F-038 | Org settings | Admin | 60 | Specified |

---

## Phase 2 — Extended Platform (18 modules, ~80 features)

### Module Priority Order
1. Patient Portal
2. Lab Module
3. Pharmacy Module
4. Telemedicine
5. IPD Module (Inpatient)
6. Inventory Module
7. Radiology Module
8. Internal Messaging
9. Triage Chatbot
10. Ambient Audio AI
11. Online Appointment Widget
12. SMS Campaigns
13. Enhanced Analytics
14. Multi-Language (i18n)
15. Built-in CMS
16. Configurable Modules
17. Backup/Restore Admin UI
18. Helpdesk / Live Chat

| ID | Feature | Module | RICE | Complexity |
|----|---------|--------|------|-----------|
| **Patient Portal** | | | | |
| F-100 | Patient OTP registration (phone-based) | Portal | 85 | 3 |
| F-101 | Patient login (OTP, no password) | Portal | 85 | 3 |
| F-102 | View personal medical records | Portal | 80 | 3 |
| F-103 | View encounter history + SOAP summaries | Portal | 78 | 3 |
| F-104 | View and download prescriptions | Portal | 75 | 2 |
| F-105 | View allergy register + problem list | Portal | 70 | 2 |
| F-106 | Book appointments (self-service) | Portal | 82 | 3 |
| F-107 | Cancel/reschedule appointments | Portal | 75 | 3 |
| F-108 | View and pay invoices (Stripe) | Portal | 80 | 3 |
| F-109 | Consent management (toggle notifications, AI, data sharing) | Portal | 72 | 3 |
| F-110 | Download data export (GDPR Art. 15) | Portal | 65 | 3 |
| F-111 | Request account deletion (GDPR Art. 17) | Portal | 60 | 3 |
| **Lab Module** | | | | |
| F-120 | Lab test catalog (org-level CRUD) | Lab | 78 | 3 |
| F-121 | Lab order creation (from encounter) | Lab | 82 | 3 |
| F-122 | Lab order queue (pending orders dashboard) | Lab | 75 | 3 |
| F-123 | Specimen collection tracking (barcode/ID) | Lab | 70 | 4 |
| F-124 | Result entry (per test, normal/abnormal ranges) | Lab | 80 | 3 |
| F-125 | Auto-flagging abnormal results | Lab | 78 | 3 |
| F-126 | Result authorization (lab tech → doctor) | Lab | 72 | 3 |
| F-127 | Result PDF generation | Lab | 68 | 2 |
| F-128 | Lab results viewable in encounter + patient timeline | Lab | 80 | 3 |
| F-129 | Lab order → billing integration (auto-add to invoice) | Lab | 75 | 3 |
| **Pharmacy Module** | | | | |
| F-140 | Drug catalog (name, form, strength, price) | Pharmacy | 78 | 3 |
| F-141 | Pharmacy inventory (stock levels, batch, expiry) | Pharmacy | 80 | 4 |
| F-142 | Stock alerts (low stock, expiring soon) | Pharmacy | 72 | 3 |
| F-143 | Prescription → dispensing workflow | Pharmacy | 85 | 4 |
| F-144 | Dispensing verification (pharmacist confirms) | Pharmacy | 75 | 3 |
| F-145 | Pharmacy billing (auto-add dispensed items to invoice) | Pharmacy | 78 | 3 |
| F-146 | Stock adjustment (write-off, returns) | Pharmacy | 65 | 3 |
| F-147 | Purchase order creation (restock requests) | Pharmacy | 60 | 3 |
| F-148 | Supplier management | Pharmacy | 55 | 2 |
| **Telemedicine** | | | | |
| F-160 | Video room creation (Daily.co / LiveKit) | Telemedicine | 75 | 4 |
| F-161 | Scheduled video consultation (linked to appointment) | Telemedicine | 78 | 4 |
| F-162 | Waiting room UI (patient waits, doctor joins) | Telemedicine | 72 | 3 |
| F-163 | In-session encounter documentation | Telemedicine | 80 | 4 |
| F-164 | Video recording (optional, with consent) | Telemedicine | 60 | 5 |
| F-165 | Telemedicine encounter billing | Telemedicine | 70 | 3 |
| **IPD Module** | | | | |
| F-180 | Ward management (ward CRUD with bed capacity) | IPD | 72 | 3 |
| F-181 | Bed management (bed CRUD, occupancy status) | IPD | 75 | 3 |
| F-182 | Patient admission (from OPD or direct) | IPD | 80 | 4 |
| F-183 | Bed allocation with conflict prevention | IPD | 78 | 4 |
| F-184 | Bed transfer (move patient between beds/wards) | IPD | 68 | 3 |
| F-185 | Nursing station dashboard (vital checks, medication schedule) | IPD | 75 | 4 |
| F-186 | IPD round notes (daily doctor rounds) | IPD | 72 | 3 |
| F-187 | Discharge summary generation | IPD | 78 | 3 |
| F-188 | Bed charges (daily rate → billing) | IPD | 70 | 3 |
| F-189 | IPD encounter (continuous, multi-day vs OPD single-visit) | IPD | 80 | 4 |
| **Inventory Module** | | | | |
| F-200 | Item catalog (consumables, equipment) | Inventory | 70 | 3 |
| F-201 | Stock management (receive, issue, adjust) | Inventory | 75 | 3 |
| F-202 | Low-stock alerts | Inventory | 68 | 2 |
| F-203 | Purchase orders (request → approve → receive) | Inventory | 65 | 3 |
| F-204 | Supplier management | Inventory | 58 | 2 |
| F-205 | Stock usage linked to encounters/departments | Inventory | 62 | 3 |
| **Radiology Module** | | | | |
| F-220 | Radiology test catalog | Radiology | 68 | 2 |
| F-221 | Radiology order creation (from encounter) | Radiology | 72 | 3 |
| F-222 | Radiology report entry (with template builder) | Radiology | 70 | 3 |
| F-223 | Report authorization workflow | Radiology | 65 | 3 |
| F-224 | DICOM/Orthanc viewer integration | Radiology | 55 | 5 |
| F-225 | Radiology → billing integration | Radiology | 62 | 3 |
| **Internal Messaging** | | | | |
| F-240 | Direct messaging (user-to-user) | Messaging | 65 | 3 |
| F-241 | Group conversations (department/facility) | Messaging | 60 | 3 |
| F-242 | Message notifications (in-app + push) | Messaging | 62 | 3 |
| F-243 | Patient-context messaging (link conversation to patient) | Messaging | 58 | 3 |
| **Triage Chatbot** | | | | |
| F-260 | Symptom intake questionnaire (guided flow) | Triage | 55 | 4 |
| F-261 | Urgency classification (red/amber/green) | Triage | 58 | 4 |
| F-262 | Chatbot → appointment booking (pre-fill triage data) | Triage | 52 | 4 |
| F-263 | Triage summary attached to encounter | Triage | 50 | 3 |
| **Ambient Audio AI** | | | | |
| F-270 | Audio recording during encounter | Ambient AI | 60 | 5 |
| F-271 | Speech-to-text transcription (Whisper / Deepgram) | Ambient AI | 62 | 5 |
| F-272 | Auto-populate SOAP from transcription | Ambient AI | 65 | 5 |
| F-273 | Audio playback for encounter review | Ambient AI | 55 | 3 |
| **Online Appointment Widget** | | | | |
| F-280 | Embeddable booking widget (iframe/script) | Widget | 68 | 3 |
| F-281 | Public doctor listing (filtered by specialty) | Widget | 65 | 2 |
| F-282 | Guest booking (no portal account required) | Widget | 62 | 3 |
| **SMS Campaigns** | | | | |
| F-290 | Campaign creation (audience filter + message) | Campaigns | 55 | 3 |
| F-291 | Broadcast delivery (rate-limited, consent-checked) | Campaigns | 52 | 3 |
| F-292 | Campaign analytics (delivered, failed, opt-out) | Campaigns | 48 | 3 |
| **Enhanced Analytics** | | | | |
| F-300 | Clinical quality KPIs (encounter duration, follow-up rates) | Analytics | 62 | 3 |
| F-301 | Patient demographics dashboard | Analytics | 58 | 2 |
| F-302 | AI copilot usage analytics (acceptance rate, time saved) | Analytics | 65 | 2 |
| F-303 | Department-level activity reports | Analytics | 55 | 3 |
| F-304 | Exportable PDF/CSV reports | Analytics | 58 | 2 |
| **Multi-Language (i18n)** | | | | |
| F-310 | French (default) | i18n | 70 | 3 |
| F-311 | Arabic (RTL support) | i18n | 65 | 4 |
| F-312 | English | i18n | 68 | 2 |
| F-313 | Per-org language default setting | i18n | 60 | 2 |
| **Built-in CMS** | | | | |
| F-320 | Clinic marketing page (auto-generated from org profile) | CMS | 55 | 3 |
| F-321 | Page builder (hero, services, doctors, contact sections) | CMS | 52 | 4 |
| F-322 | Custom domain mapping (clinic.medicore.app or own domain) | CMS | 48 | 4 |
| F-323 | SEO meta tags per page | CMS | 45 | 2 |
| **Configurable Modules** | | | | |
| F-330 | Module toggle per org (enable/disable lab, pharmacy, etc.) | Config | 65 | 3 |
| F-331 | Custom fields per entity (patient, encounter) | Config | 60 | 4 |
| **Backup/Restore** | | | | |
| F-340 | Admin backup trigger (manual) | Backup | 55 | 3 |
| F-341 | Backup history viewer | Backup | 50 | 2 |
| F-342 | Point-in-time restore request | Backup | 48 | 4 |
| **Helpdesk** | | | | |
| F-350 | Tawk.to / Crisp widget integration | Helpdesk | 50 | 1 |
| F-351 | In-app help center (FAQ/docs) | Helpdesk | 55 | 2 |

---

## Phase 3 — Enterprise & Mobile (~35 features)

| ID | Feature | Module | RICE | Complexity |
|----|---------|--------|------|-----------|
| **HR Module** | | | | |
| F-400 | Staff profiles (personal + professional details) | HR | 55 | 3 |
| F-401 | Department-based roster management | HR | 50 | 3 |
| F-402 | Attendance tracking (check-in/out, late, absent) | HR | 52 | 4 |
| F-403 | Leave management (request → approve) | HR | 55 | 3 |
| F-404 | Payroll calculation (basic salary, deductions, bonuses) | HR | 48 | 4 |
| F-405 | Payroll reports (monthly, per-department) | HR | 45 | 3 |
| F-406 | Staff performance metrics | HR | 40 | 3 |
| **Workflow Automation** | | | | |
| F-420 | Simple rule engine (IF condition THEN action) | Workflow | 60 | 4 |
| F-421 | Visual workflow builder (drag-and-drop canvas) | Workflow | 55 | 5 |
| F-422 | Trigger types: encounter event, schedule event, time-based | Workflow | 58 | 4 |
| F-423 | Action types: send SMS, send email, create task, flag patient | Workflow | 55 | 3 |
| F-424 | Workflow execution log | Workflow | 50 | 3 |
| F-425 | Workflow templates (pre-built common automations) | Workflow | 52 | 3 |
| **React Native Apps** | | | | |
| F-440 | Patient app: login (OTP) | Mobile | 60 | 4 |
| F-441 | Patient app: view records, appointments, invoices | Mobile | 62 | 4 |
| F-442 | Patient app: book/cancel appointments | Mobile | 58 | 4 |
| F-443 | Patient app: pay invoices | Mobile | 55 | 4 |
| F-444 | Patient app: push notifications | Mobile | 52 | 3 |
| F-445 | Doctor app: view today's schedule | Mobile | 60 | 4 |
| F-446 | Doctor app: patient list + search | Mobile | 58 | 3 |
| F-447 | Doctor app: encounter editing (simplified) | Mobile | 55 | 5 |
| F-448 | Doctor app: AI copilot access | Mobile | 52 | 4 |
| F-449 | Doctor app: push notifications | Mobile | 50 | 3 |
| **HL7 FHIR** | | | | |
| F-460 | FHIR R4 Patient resource | FHIR | 45 | 4 |
| F-461 | FHIR R4 Encounter resource | FHIR | 42 | 4 |
| F-462 | FHIR R4 Observation resource (vitals, labs) | FHIR | 40 | 4 |
| F-463 | FHIR R4 MedicationRequest resource | FHIR | 38 | 4 |
| F-464 | FHIR API authentication (OAuth2) | FHIR | 35 | 4 |
| **AI Advanced** | | | | |
| F-480 | AI appointment optimization (demand forecasting) | AI Advanced | 45 | 5 |
| F-481 | AI population health risk scoring | AI Advanced | 42 | 5 |
| F-482 | AI clinical trend detection (per-patient longitudinal) | AI Advanced | 40 | 5 |
| **Ambulance** | | | | |
| F-500 | Ambulance fleet management | Ambulance | 30 | 3 |
| F-501 | Ambulance dispatch (link to patient) | Ambulance | 28 | 3 |
| F-502 | Ambulance billing | Ambulance | 25 | 2 |

---

## Summary

| Phase | Feature Count | New Modules | New DB Entities | New API Endpoints | New Screens |
|-------|--------------|-------------|----------------|-------------------|-------------|
| Phase 1 (MVP) | 38 | 7 | 17 | ~30 | 25 |
| Phase 2 | ~82 | 18 | ~25 | ~120 | ~55 |
| Phase 3 | ~35 | 5 | ~10 | ~60 | ~20 (+ 2 native apps) |
| **Total** | **~155** | **30** | **~52** | **~210** | **~100+** |

# Phase 2 & 3 — Product Requirements Document (Expansion)

## MediCore HIS — Full Product Roadmap PRD

> This document extends `02-PRD.md` (MVP features). All Phase 1 features remain unchanged.

---

## Phase 2 Features — RICE Scored & Ordered

### P2.1 Patient Portal

**Goal**: Self-service patient access to medical records, appointments, invoices, and consent management. Phone-based OTP authentication (no passwords).

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| OTP registration + login | 5 | 4 | 5 | 3 | 33 |
| View medical records + encounters | 5 | 4 | 5 | 3 | 33 |
| Self-service appointment booking | 5 | 5 | 4 | 3 | 33 |
| View + pay invoices (Stripe) | 4 | 4 | 5 | 3 | 27 |
| Download prescriptions | 4 | 3 | 5 | 2 | 30 |
| Cancel/reschedule appointments | 4 | 3 | 4 | 3 | 16 |
| Consent management (privacy toggles) | 3 | 3 | 5 | 3 | 15 |
| GDPR data export request | 2 | 3 | 5 | 3 | 10 |
| GDPR deletion request | 2 | 3 | 5 | 3 | 10 |

**User Flow — Patient Self-Service Booking**:
```
Patient opens portal → Logs in with OTP → Clicks "Book Appointment"
→ Selects facility → Selects doctor → Selects specialty
→ Picks available date/time → Confirms → SMS confirmation
→ Appointment appears in "My Appointments" tab
```

**User Flow — Patient Invoice Payment**:
```
Patient opens portal → Clicks "Invoices" tab → Sees unpaid invoice
→ Clicks "Pay Now" → Stripe payment form → Pays
→ Invoice status updates to PAID → Receipt available for download
```

---

### P2.2 Lab Module

**Goal**: Full lab workflow from order placement (by doctors during encounters) through specimen collection, result entry, auto-flagging of abnormal values, result authorization, and billing integration.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Lab order from encounter | 5 | 5 | 5 | 3 | 42 |
| Result entry with normal ranges | 5 | 5 | 5 | 3 | 42 |
| Auto-flag abnormal results | 5 | 4 | 5 | 3 | 33 |
| Lab results in patient timeline | 5 | 4 | 5 | 3 | 33 |
| Lab → billing integration | 4 | 4 | 5 | 3 | 27 |
| Lab test catalog (org-level) | 4 | 3 | 5 | 2 | 24 |
| Specimen collection tracking | 3 | 3 | 4 | 4 | 9 |
| Result authorization flow | 3 | 3 | 4 | 3 | 12 |
| Result PDF generation | 3 | 3 | 5 | 2 | 23 |

**User Flow — Lab Order to Result**:
```
Doctor opens encounter → Clicks "Order Lab" → Searches test catalog
→ Selects "CBC + CRP" → Order saved to encounter + lab queue

Lab tech sees order in /lab/queue → Marks "Specimen Collected"
→ Enters results per parameter → System flags abnormal values (red)
→ Lab tech clicks "Submit for Authorization"

Supervising doctor reviews → Approves → Results appear in encounter timeline
→ Lab charges auto-added to patient invoice
→ Patient can view results in portal (if enabled)
```

---

### P2.3 Pharmacy Module

**Goal**: Drug catalog, pharmacy inventory with batch/expiry tracking, prescription-to-dispensing workflow, pharmacist verification, stock alerts, and billing integration.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Prescription → dispensing workflow | 5 | 5 | 5 | 4 | 31 |
| Drug catalog (name, form, strength, price) | 4 | 4 | 5 | 3 | 27 |
| Pharmacy inventory (stock, batch, expiry) | 4 | 4 | 5 | 4 | 20 |
| Dispensing verification (pharmacist confirm) | 4 | 4 | 4 | 3 | 21 |
| Stock alerts (low stock, expiring soon) | 3 | 3 | 5 | 3 | 15 |
| Pharmacy → billing (dispensed items to invoice) | 4 | 4 | 5 | 3 | 27 |
| Stock adjustment (write-off, returns) | 3 | 2 | 5 | 3 | 10 |
| Purchase orders (restock requests) | 2 | 3 | 4 | 3 | 8 |
| Supplier management | 2 | 2 | 4 | 2 | 8 |

**User Flow — Prescription to Dispensing**:
```
Doctor writes Rx in encounter → Signs off → Event: prescription.issued

Pharmacist sees Rx in /pharmacy/queue → Reviews drug + dosage
→ Checks stock → Sufficient → Dispenses → Records quantity given
→ Patient picks up medication → Dispensing charge added to invoice

If insufficient stock → Alert shown → Pharmacist flags as "Pending Restock"
→ Purchase order auto-suggested
```

---

### P2.4 Telemedicine

**Goal**: Video consultations linked to appointments using Daily.co or LiveKit. Includes waiting room, in-session encounter documentation, and telemedicine-specific billing codes.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Video room creation (linked to appointment) | 4 | 4 | 4 | 4 | 16 |
| Video consultation session (doctor + patient) | 4 | 5 | 4 | 4 | 20 |
| Waiting room UI (patient waits until doctor joins) | 3 | 3 | 4 | 3 | 12 |
| In-session encounter editing | 4 | 4 | 3 | 4 | 12 |
| Telemedicine billing | 3 | 3 | 4 | 3 | 12 |
| Video recording (with consent toggle) | 2 | 2 | 3 | 5 | 2 |

---

### P2.5 IPD Module (Inpatient)

**Goal**: Full inpatient workflow — ward/bed management, patient admission (from OPD encounter or direct), bed allocation with conflict prevention, nurse station dashboard, daily round notes, discharge summary, and bed charges billed per day.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Patient admission workflow | 4 | 5 | 4 | 4 | 20 |
| Ward + bed management | 4 | 4 | 5 | 3 | 27 |
| Bed allocation (conflict prevention) | 4 | 4 | 4 | 4 | 16 |
| Nursing station dashboard | 3 | 4 | 4 | 4 | 12 |
| IPD round notes (daily progress) | 3 | 4 | 4 | 3 | 16 |
| Discharge summary generation | 4 | 4 | 4 | 3 | 21 |
| Bed charges → billing | 3 | 3 | 5 | 3 | 15 |
| Bed transfer between wards | 3 | 3 | 4 | 3 | 12 |
| IPD encounter (multi-day continuous) | 4 | 4 | 3 | 4 | 12 |

---

### P2.6 Inventory Module

**Goal**: Track consumables and equipment across facilities. Stock management with receive/issue/adjust, low-stock alerts, purchase orders with approval workflow.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Item catalog (consumables, equipment) | 3 | 3 | 5 | 3 | 15 |
| Stock management (receive, issue, adjust) | 3 | 3 | 5 | 3 | 15 |
| Low-stock alerts (email + dashboard) | 3 | 3 | 5 | 2 | 23 |
| Purchase orders (request → approve → receive) | 2 | 3 | 4 | 3 | 8 |
| Supplier management | 2 | 2 | 4 | 2 | 8 |
| Stock usage linked to encounters | 2 | 2 | 3 | 3 | 4 |

---

### P2.7 Radiology Module

**Goal**: Radiology orders from encounters, template-based report entry, authorization workflow, optional DICOM/Orthanc viewer integration, billing integration.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Radiology order from encounter | 4 | 4 | 4 | 3 | 21 |
| Report entry (template builder) | 3 | 3 | 4 | 3 | 12 |
| Report authorization | 3 | 3 | 4 | 3 | 12 |
| DICOM/Orthanc viewer integration | 2 | 3 | 3 | 5 | 4 |
| Radiology → billing | 3 | 3 | 4 | 3 | 12 |
| Radiology test catalog | 3 | 3 | 5 | 2 | 23 |

---

### P2.8 Internal Messaging

**Goal**: Staff-to-staff messaging within the org. Direct messages, group conversations (per department/facility), message notifications, and ability to link conversations to patient context.

| Feature | Reach | Impact | Confidence | Effort | RICE |
|---------|-------|--------|-----------|--------|------|
| Direct messaging (user-to-user) | 4 | 3 | 4 | 3 | 16 |
| Group conversations | 3 | 3 | 4 | 3 | 12 |
| In-app notifications | 4 | 3 | 4 | 3 | 16 |
| Patient-context messages | 3 | 3 | 3 | 3 | 9 |

---

### P2.9–P2.18 Remaining Modules (Summary)

| Module | Key Features | Total Endpoints | Screens |
|--------|-------------|----------------|---------|
| **Triage Chatbot** | Symptom intake, urgency (R/A/G), → booking, → encounter context | 4 | 2 |
| **Ambient Audio AI** | Audio recording, Whisper/Deepgram transcription, auto-SOAP, playback | 3 | 1 (extension) |
| **Online Booking Widget** | Public doctor listing, embeddable widget, guest booking | 3 | 2 |
| **SMS Campaigns** | Campaign builder, audience filter, broadcast, analytics | 5 | 2 |
| **Enhanced Analytics** | Clinical KPIs, patient demographics, AI usage stats, PDF export | 5 | 3 |
| **i18n** | French (default), Arabic (RTL), English, per-org setting | 2 | 0 (framework) |
| **Built-in CMS** | Auto-generated clinic page, section builder, custom domain, SEO | 6 | 3 |
| **Configurable Modules** | Module toggle per org, custom fields per entity | 3 | 1 |
| **Backup/Restore** | Manual backup trigger, history, point-in-time restore | 3 | 1 |
| **Helpdesk** | Tawk.to widget, in-app help center (FAQ) | 0 | 1 |

---

## Phase 3 Features — RICE Scored

### P3.1 HR Module

| Feature | RICE | Summary |
|---------|------|---------|
| Staff profiles | 18 | Personal + professional details, documents, qualifications |
| Roster management | 15 | Department-based scheduling for nurses, lab techs, pharmacists |
| Attendance tracking | 16 | Check-in/out timestamps, late/absent flags, monthly reports |
| Leave management | 18 | Request → manager approve → calendar integration |
| Payroll (basic) | 14 | Salary, deductions, bonuses, monthly reports, PDF payslips |
| Performance metrics | 10 | Encounter counts, patient satisfaction (if collected), peer reviews |

### P3.2 Workflow Automation Engine

| Feature | RICE | Summary |
|---------|------|---------|
| Simple rules engine | 20 | IF encounter.icd_code matches X THEN send_email/create_task/flag |
| Visual workflow builder | 15 | Drag-and-drop canvas: triggers → conditions → actions |
| Trigger library | 18 | encounter.signed_off, appointment.no_show, patient.registered, invoice.overdue, timer |
| Action library | 16 | send_sms, send_email, create_task, flag_patient, notify_user, webhook |
| Execution log | 12 | Timestamp, trigger, condition results, action taken, success/fail |
| Template library | 14 | Pre-built: "Follow-up reminder 7 days post-visit", "Alert for abnormal lab results" |

### P3.3 React Native Mobile Apps

| App | Key Screens | Reuses API |
|-----|------------|-----------|
| **Patient App** | Login (OTP) → Dashboard → My Records → Appointments → Invoices → Notifications → Settings | Portal API + Push |
| **Doctor App** | Login → Today's Schedule → Patient Search → Encounter (simplified) → AI Copilot → Notifications | Clinical API + Push |

### P3.4 HL7 FHIR API

| Resource | Maps To | Notes |
|----------|---------|-------|
| Patient | MongoDB patients | Demographics + identifiers |
| Encounter | MongoDB encounters | Visit data + vitals + SOAP |
| Observation | Encounter vitals + lab results | One resource per measurement |
| MedicationRequest | Encounter prescriptions | Structured Rx |
| DiagnosticReport | Lab results + radiology reports | Aggregated findings |
| Appointment | MongoDB appointments | Scheduling data |
| Organization | PG organizations | Tenant data |
| Practitioner | PG users (DOCTOR role) | Provider data |

### P3.5 AI Advanced

| Feature | RICE | Summary |
|---------|------|---------|
| Appointment optimization | 12 | Demand forecasting from historical data, suggest schedule changes |
| Population health scoring | 10 | Risk stratification across patient cohort using encounter + lab data |
| Clinical trend detection | 8 | Longitudinal analysis per patient: weight trends, BP trends, HbA1c trends |

### P3.6 Ambulance Management

| Feature | RICE | Summary |
|---------|------|---------|
| Fleet management | 6 | Ambulance vehicles, crew assignment |
| Dispatch | 6 | Link ambulance to patient, track status |
| Billing | 5 | Ambulance charges added to patient invoice |

---

## Non-Goals (Not Planned for Any Phase)

| Feature | Reason |
|---------|--------|
| Insurance claims adjudication | Requires deep payer integration; partner with local insurers instead |
| Full ERP / general ledger | MediCore is a HIS, not accounting software. Export to QuickBooks/Xero |
| Medical device integration (vitals monitors, glucometers) | IoT device integration requires hardware partnerships; out of scope |
| AI-generated clinical images (radiology AI) | Medical AI imaging is a separate, regulated product class |
| White-label reselling platform | Focus on own brand first; partner model later |
| Blood bank management | Niche module; defer indefinitely |

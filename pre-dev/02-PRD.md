# Phase 2 — Product Requirements Document (PRD)

## MediCore HIS — MVP Feature Specification

---

## 1. Product Vision

MediCore is a multi-tenant SaaS Hospital Information System that enables solo practitioners and polyclinic networks to manage their entire clinical workflow — from patient registration through encounter documentation to billing — with an AI copilot that transforms shorthand notes into structured SOAP documentation, reducing physician documentation time by 30–45 minutes per day.

### Target Users (MVP)
- **Doctors** (solo and employed) — clinical documentation, encounter management
- **Receptionists** — patient registration, scheduling, check-in, billing collection
- **Org/Facility Admins** — organization setup, user management, analytics
- **NOT in MVP**: Patients, lab technicians, radiologists, pharmacists

### Success = A Doctor Finishes a Full Day's Documentation Before Leaving the Clinic

---

## 2. Feature List with RICE Scores

> RICE = (Reach × Impact × Confidence) ÷ Effort
> Reach: 1–10 (how many target users it affects)
> Impact: 0.25/0.5/1/2/3 (minimal → massive)
> Confidence: 50%/80%/100%
> Effort: person-weeks

### Core Features (MVP — Must Ship)

| # | Feature | Reach | Impact | Confidence | Effort (wks) | RICE | Priority |
|---|---------|-------|--------|------------|-------------|------|----------|
| F01 | **Multi-tenant org + facility management** | 10 | 3 | 100% | 1.5 | 20.0 | P0 |
| F02 | **JWT authentication with RBAC** | 10 | 3 | 100% | 2 | 15.0 | P0 |
| F03 | **Patient registration with auto-MRN** | 9 | 2 | 100% | 2 | 9.0 | P0 |
| F04 | **Patient search (name, phone, MRN, national ID)** | 9 | 2 | 100% | 1 | 18.0 | P0 |
| F05 | **Doctor schedule management** | 8 | 2 | 100% | 1.5 | 10.7 | P0 |
| F06 | **Appointment booking with conflict prevention** | 9 | 3 | 100% | 2 | 13.5 | P0 |
| F07 | **Queue management with real-time SSE** | 7 | 2 | 80% | 1.5 | 7.5 | P0 |
| F08 | **Clinical encounter (vitals + SOAP + diagnoses + Rx)** | 10 | 3 | 100% | 3 | 10.0 | P0 |
| F09 | **Encounter autosave** | 8 | 2 | 100% | 0.5 | 32.0 | P0 |
| F10 | **Prescription writer with allergy check** | 9 | 2 | 80% | 1.5 | 9.6 | P0 |
| F11 | **AI copilot: text-to-SOAP expansion** | 10 | 3 | 80% | 2 | 12.0 | P0 |
| F12 | **AI copilot: differential suggestions** | 8 | 2 | 80% | 1 | 12.8 | P0 |
| F13 | **AI copilot: investigation suggestions** | 7 | 1 | 80% | 1 | 5.6 | P1 |
| F14 | **Encounter sign-off with event publishing** | 10 | 3 | 100% | 1 | 30.0 | P0 |
| F15 | **Auto-invoice on encounter sign-off** | 9 | 3 | 100% | 2 | 13.5 | P0 |
| F16 | **Invoice management (draft, edit, send)** | 8 | 2 | 100% | 1.5 | 10.7 | P0 |
| F17 | **Cash + Stripe payment recording** | 8 | 2 | 80% | 1.5 | 8.5 | P0 |
| F18 | **SMS appointment confirmation** | 7 | 1 | 100% | 0.5 | 14.0 | P1 |
| F19 | **24h appointment reminder (scheduled)** | 6 | 1 | 80% | 1 | 4.8 | P1 |
| F20 | **Invoice email with PDF** | 7 | 1 | 100% | 1 | 7.0 | P1 |
| F21 | **Onboarding wizard (org + facility + first user)** | 10 | 2 | 100% | 1.5 | 13.3 | P0 |
| F22 | **Facility switcher** | 6 | 2 | 100% | 0.5 | 24.0 | P0 |
| F23 | **Revenue dashboard (basic)** | 5 | 1 | 80% | 1.5 | 2.7 | P1 |
| F24 | **Audit log viewer** | 4 | 1 | 100% | 1 | 4.0 | P1 |
| F25 | **Public queue display (waiting room TV)** | 5 | 1 | 100% | 0.5 | 10.0 | P1 |

### Not in MVP (Phase 2+)

| Feature | Phase | Reason for Deferral |
|---------|-------|-------------------|
| Patient portal (OTP auth, appointment booking, invoice view/pay) | Phase 2 | UX/security surface area multiplier |
| Triage chatbot | Phase 2 | Medico-legal sensitivity |
| Ambient audio transcription (ASR → SOAP) | Phase 2 | ASR pipeline complexity |
| Telemedicine (video calls) | Phase 2 | Whole product unto itself |
| Lab module (orders, specimen tracking, results) | Phase 2 | Can reference lab orders in encounters without full workflow |
| Radiology module (orders, PACS/Orthanc bridge) | Phase 2 | Full PACS integration complexity |
| Pharmacy dispensing | Phase 2 | Prescriptions issued; dispensing is separate workflow |
| HL7 FHIR API | Phase 3 | Enterprise feature |
| Mobile apps (React Native) | Phase 3 | Web-responsive covers MVP |
| Workflow automation engine | Phase 3 | Complex, no early revenue impact |
| HR / attendance / payroll | Phase 3 | Non-clinical, deferred |

---

## 3. User Flows (Narrative)

### Flow 1: New Clinic Onboarding
1. Founders lands on MediCore website → clicks "Start Free Trial"
2. **Onboarding Wizard Step 1**: Create organization (name, slug, MRN prefix)
3. **Step 2**: Create first facility (name, address, phone)
4. **Step 3**: Create admin user account (email, name, password)
5. **Step 4**: Invite first doctor (email invitation) or create directly
6. System creates: Organization + Facility + Admin User atomically in one PG transaction
7. Admin lands on the dashboard → can immediately add more facilities, users, and services catalog

### Flow 2: Patient Visit (End-to-End)
1. **Reception**: Patient walks in → receptionist searches by name/phone/MRN
   - If new: registers with minimal fields (name, phone, DOB, gender) → MRN auto-generated
   - If existing: confirms identity → opens patient profile
2. **Booking**: Receptionist selects doctor → sees available slots → books → patient gets SMS confirmation
3. **Check-in**: Patient arrives → receptionist clicks "Check In" → queue token generated (e.g., T-042) → SSE pushes update to queue display
4. **Encounter**: Doctor sees patient's name appear in queue → clicks to open encounter
   - Vitals entered (BP, HR, temp, weight — autosaved on blur)
   - Doctor types shorthand SOAP → clicks "AI Expand" → copilot returns structured SOAP draft
   - Doctor reviews, edits, accepts or discards AI suggestions
   - AI sidebar shows: differential diagnoses (clickable to add), investigation suggestions
   - Doctor adds ICD-10 diagnoses (autocomplete search)
   - Doctor writes prescriptions (drug search → dose → frequency → duration)
   - System checks allergy register → shows warning if match
   - Doctor clicks "Sign Off" → confirmation modal
5. **Post Sign-Off Events** (automated):
   - `clinics.encounter.signed_off` → Billing creates draft invoice in PG
   - `clinics.prescription.issued` → Prescription marked for pharmacy (Phase 2 stub)
   - `clinics.lab-order.created` → Lab notification (Phase 2 stub)
6. **Billing**: Receptionist opens auto-created invoice → edits if needed → adds discount or additional services → sends to patient (email PDF) or processes cash payment
7. **Patient leaves** — encounter archived, invoice paid, next patient called

### Flow 3: Multi-Facility Admin Day
1. Admin logs in → sees org-level dashboard (all facilities aggregated)
2. Switches to Facility A → sees that facility's appointments, queue, and revenue
3. Switches to Facility B → confirms different data, no cross-contamination
4. Opens "Revenue" → sees daily/weekly/monthly charts filtered by facility
5. Opens "Team" → adds a new doctor to Facility C → assigns role + schedule

---

## 4. Non-Goals (Explicit)

- MediCore is NOT a medical device — it does not make clinical decisions
- The AI copilot does NOT auto-apply suggestions — every output requires doctor review
- MediCore does NOT replace paper prescriptions required by Moroccan pharmacy regulations — it supplements them with digital records
- MediCore does NOT handle insurance claims processing (RCM) — invoices are generated, payment is tracked, but insurance submission/reconciliation is out of scope
- MediCore does NOT support offline mode — internet connection required

---

## 5. Success Metrics per Feature

| Feature | Success Metric | Target |
|---------|---------------|--------|
| Onboarding wizard | Completion rate without support | ≥85% |
| Patient registration | Time to register new patient | <90 seconds |
| Appointment booking | Double-booking rate | 0% |
| Queue management | Average check-in to screen update time | <2 seconds |
| Encounter editor | Time to complete full encounter (vitals + SOAP + Rx) | <5 minutes |
| AI copilot usage | % of encounters where AI is used | ≥60% |
| AI copilot quality | Doctor acceptance rate of AI-generated SOAP | ≥70% |
| Invoice auto-creation | % of sign-offs that generate invoices | 100% |
| Multi-tenancy | Cross-org data leakage incidents | 0 |
| System performance | P95 API response time | <500ms |
| System availability | Monthly uptime | ≥99.5% |

---

## 6. Open Questions

| # | Question | Impact | Status |
|---|----------|--------|--------|
| PQ1 | ICD-10 code source — local dataset or external API? | Encounter editor UX | Open |
| PQ2 | Drug catalog for Morocco — is there a public dataset? | Prescription writer | Open |
| PQ3 | Prescription PDF format — does Morocco have a standard template? | Communication module | Open |
| PQ4 | Stripe availability in Morocco | Payment collection | Open |
| PQ5 | Should encounter autosave differ from SOAP autosave (different debounce intervals)? | Encounter UX | Open |

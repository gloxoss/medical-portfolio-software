# Phase 2 & 3 — User Stories

## MediCore HIS — Extended User Stories with Acceptance Criteria

> Extends `02-user-stories.md` (US-001 to US-025). User stories numbered US-100+ for Phase 2, US-200+ for Phase 3.

---

## Patient Portal (US-100 to US-111)

### US-100: Patient OTP Login
**As a** patient, **I want to** log into the portal using my phone number and OTP, **so that** I can access my records without remembering a password.

**Acceptance Criteria:**
- **Given** a patient with phone +212600000000 is registered at an org
- **When** they enter their phone and request OTP
- **Then** they receive a 6-digit SMS within 10 seconds
- **And** entering the correct OTP within 10 minutes grants them a patient JWT
- **And** after 3 failed attempts, the OTP is invalidated
- **And** max 3 OTP requests per phone per hour (rate limited)

### US-101: View My Medical Records
**As a** patient, **I want to** see my encounter history, **so that** I can review past visits and diagnoses.

**Acceptance Criteria:**
- **Given** a logged-in patient
- **When** they navigate to "My Records"
- **Then** they see a reverse-chronological list of visits (date, doctor, primary diagnosis)
- **And** clicking a visit shows: vitals, diagnoses, prescriptions (downloadable PDF)
- **And** sensitive internal notes (doctor's private comments) are NOT shown

### US-102: Book Appointment from Portal
**As a** patient, **I want to** book my own appointment, **so that** I don't need to call the clinic.

**Acceptance Criteria:**
- **Given** a logged-in patient
- **When** they click "Book Appointment" → select facility → select doctor → pick slot
- **Then** the appointment is created with `source: portal`
- **And** they receive SMS confirmation
- **And** the doctor sees the appointment in their schedule
- **And** double-booking is prevented (same Redis locking as receptionist booking)

### US-103: Pay Invoice from Portal
**As a** patient, **I want to** pay my outstanding invoices online, **so that** I can settle bills without visiting the clinic.

**Acceptance Criteria:**
- **Given** a patient with an unpaid invoice of 500 MAD
- **When** they click "Pay Now" on the invoice
- **Then** a Stripe payment form appears
- **And** on successful payment, the invoice status changes to PAID
- **And** they can download a receipt PDF

### US-104: Cancel Appointment
**As a** patient, **I want to** cancel an upcoming appointment, **so that** the slot becomes available for other patients.

**Acceptance Criteria:**
- **Given** a patient with an upcoming appointment
- **When** they click "Cancel" and provide an optional reason
- **Then** the appointment status changes to CANCELLED
- **And** the slot becomes available for booking
- **And** the clinic receives a notification of the cancellation
- **And** past appointments cannot be cancelled

### US-105: Manage Privacy Consent
**As a** patient, **I want to** control my notification and AI preferences, **so that** I have control over my data.

**Acceptance Criteria:**
- **Given** a logged-in patient on Settings page
- **When** they toggle "AI analysis consent" OFF
- **Then** the AI copilot skips this patient's data (shows "AI disabled for this patient" to doctor)
- **When** they click "Request Data Export"
- **Then** a job is queued and they receive their data via email within 24h
- **When** they click "Delete Account"
- **Then** a deletion request goes to the org admin for confirmation

---

## Lab Module (US-120 to US-128)

### US-120: Order Lab Test from Encounter
**As a** doctor, **I want to** order lab tests during an encounter, **so that** the lab tech is automatically notified.

**Acceptance Criteria:**
- **Given** a doctor in an active encounter
- **When** they click "Order Lab" → search catalog → select "CBC" + "CRP" → confirm
- **Then** a lab order is created in MongoDB with status = `ordered`
- **And** `lab.order.created` event fires
- **And** the order appears in the lab tech's queue within 2 seconds

### US-121: Enter Lab Results
**As a** lab technician, **I want to** enter test results and have abnormal values flagged automatically, **so that** doctors are alerted immediately.

**Acceptance Criteria:**
- **Given** a lab order with status = `specimen_collected`
- **When** the lab tech enters WBC = 15,000 (normal: 4,000–11,000)
- **Then** the system flags WBC as ABNORMAL (red)
- **And** normal values show as green
- **And** lab tech submits for authorization

### US-122: Authorize Lab Results
**As a** supervising doctor, **I want to** review and authorize lab results before they appear in the patient record.

**Acceptance Criteria:**
- **Given** lab results submitted for authorization
- **When** the doctor clicks "Authorize"
- **Then** `lab.result.authorized` event fires
- **And** results appear in the patient's encounter timeline
- **And** lab charges auto-added to patient's invoice
- **And** result PDF is generated and downloadable

### US-123: View Lab Results in Encounter
**As a** doctor, **I want to** see lab results directly within the encounter, **so that** I have all clinical data in one place.

**Acceptance Criteria:**
- **Given** authorized lab results for an encounter
- **When** the doctor opens the encounter
- **Then** they see a "Lab Results" tab with all test results
- **And** abnormal values are highlighted

---

## Pharmacy Module (US-140 to US-147)

### US-140: Dispense Medication
**As a** pharmacist, **I want to** dispense prescribed medications and have stock automatically decremented, **so that** inventory stays accurate.

**Acceptance Criteria:**
- **Given** an encounter signed off with a prescription for Amoxicillin 500mg × 30 tablets
- **When** the pharmacist opens the Rx in the queue → verifies → clicks "Dispense"
- **Then** stock decrements by 30 tablets for the selected batch
- **And** a dispensing log is created
- **And** `pharmacy.dispensed` event fires
- **And** dispensing charge added to patient's invoice

### US-141: Low Stock Alert
**As** a clinic admin, **I want to** be notified when drug stock falls below the reorder level, **so that** I can restock before running out.

**Acceptance Criteria:**
- **Given** Amoxicillin stock = 50, reorder level = 100
- **When** a dispensing reduces stock to 20
- **Then** `pharmacy.stock.low` event fires
- **And** admin receives email "Low stock alert: Amoxicillin — 20 remaining"
- **And** pharmacy inventory dashboard shows an "⚠️ Low Stock" badge

### US-142: Purchase Order Workflow
**As a** pharmacist, **I want to** create purchase orders for restocking, **so that** reorders are tracked and approved.

**Acceptance Criteria:**
- **Given** a drug at low stock
- **When** the pharmacist creates a PO → selects supplier → adds drugs + quantities → submits
- **Then** PO status = SUBMITTED
- **When** admin approves → PO status = APPROVED
- **When** delivery arrives → pharmacist marks received → stock auto-incremented
- **And** PO status = RECEIVED

---

## Telemedicine (US-160 to US-163)

### US-160: Video Consultation
**As a** doctor, **I want to** conduct video consultations with patients, **so that** I can treat remote patients.

**Acceptance Criteria:**
- **Given** a telemedicine-type appointment approaching
- **When** the system creates a Daily.co room
- **Then** patient receives SMS with join link
- **And** patient joins waiting room → sees "Doctor will join shortly"
- **And** doctor joins → both see video feeds
- **And** doctor can document encounter alongside the video
- **And** ending the call calculates duration and creates billing charge

---

## IPD Module (US-180 to US-189)

### US-180: Admit Patient
**As a** doctor, **I want to** admit a patient and allocate a bed, **so that** the patient is formally admitted for inpatient care.

**Acceptance Criteria:**
- **Given** a patient needing admission and available beds
- **When** the doctor selects ward → bed → admission type → confirms
- **Then** bed status = OCCUPIED → admission record created
- **And** `ipd.patient.admitted` event fires
- **And** billing starts (daily bed charges)

### US-181: Nursing Station Dashboard
**As a** nurse, **I want to** see my daily tasks (vitals due, medications to administer), **so that** I don't miss any care activities.

**Acceptance Criteria:**
- **Given** active admissions in a ward
- **When** the nurse opens the nursing station
- **Then** they see per-patient cards with:
  - "Vitals due at 10:00, 14:00, 18:00" (with checkboxes)
  - "Medications: Amoxicillin 500mg at 08:00, 20:00" (with administered checkbox + timestamp)
  - Doctor orders from latest round notes

### US-182: Discharge Patient
**As a** doctor, **I want to** discharge a patient with a summary document, **so that** the patient has clear follow-up instructions.

**Acceptance Criteria:**
- **Given** an admitted patient
- **When** the doctor completes the discharge form (summary, follow-up instructions, medications to continue)
- **Then** admission status = DISCHARGED → bed freed → bed status = AVAILABLE
- **And** `ipd.patient.discharged` event fires
- **And** billing finalizes all pending bed charges
- **And** discharge summary PDF generated → sent to patient via SMS/email
- **And** follow-up appointment auto-suggested

---

## Radiology (US-220 to US-222)

### US-220: Order Radiology Study
**As a** doctor, **I want to** order imaging studies from within an encounter.

**Acceptance Criteria:**
- **Given** a doctor in an encounter
- **When** they click "Order Imaging" → select "Chest X-Ray" → add indication
- **Then** radiology order created → appears in radiologist's queue

### US-221: Enter Radiology Report
**As a** radiologist, **I want to** enter findings and impressions for imaging studies.

**Acceptance Criteria:**
- **Given** a radiology order
- **When** the radiologist enters findings, impression, and conclusion
- **And** authorizes the report
- **Then** `radiology.report.authorized` event fires
- **And** report appears in encounter timeline → billing charge added

---

## Messaging (US-240 to US-242)

### US-240: Send Direct Message
**As a** staff member, **I want to** message a colleague directly, **so that** I can communicate about patient care securely.

**Acceptance Criteria:**
- **Given** a doctor composing a message to a nurse
- **When** they send "Please check Mr. Ahmed's vitals at 2 PM"
- **Then** the nurse receives the message within 1 second (WebSocket)
- **And** a notification badge appears if the messaging app is not focused
- **And** messages are scoped to the org (no cross-org messaging)

---

## Triage (US-260)

### US-260: Symptom-Based Triage
**As a** patient (guest), **I want to** describe my symptoms and get urgency guidance, **so that** I know whether to visit a clinic or ER.

**Acceptance Criteria:**
- **Given** a guest on the triage page (no login required)
- **When** they enter symptoms ("chest pain, shortness of breath")
- **Then** AI assesses urgency as RED → "Go to ER immediately"
- **When** they enter symptoms ("mild headache, fatigue")
- **Then** AI assesses as GREEN → "Book at your convenience" → shows booking link
- **And** triage summary attaches to any resulting appointment

---

## CMS (US-320)

### US-320: Build Clinic Marketing Page
**As a** clinic admin, **I want to** create a marketing page for my clinic, **so that** patients can find and book online.

**Acceptance Criteria:**
- **Given** an admin on the CMS builder
- **When** they add sections: hero (clinic photo, tagline), services, doctors, contact info, "Book Now" button
- **Then** a public page is generated at `medicore.app/{orgSlug}`
- **And** SEO meta tags are set (title, description)
- **And** the "Book Now" button links to the booking widget

---

## Phase 3 User Stories (Summary)

### US-200: Workflow Rules
**As a** clinic admin, **I want to** set up automation rules like "If encounter includes ICD code E11 (Diabetes), send a follow-up SMS reminder in 7 days."
- Rule definition: trigger + conditions + actions
- Execution log with success/fail status

### US-210: HR Attendance
**As** an HR manager, **I want to** track staff attendance (check-in/out times, late arrivals, absences), **so that** I can manage workforce scheduling.

### US-220: Payroll
**As** an HR manager, **I want to** generate monthly payroll (base salary + deductions + bonuses = net salary), **so that** staff are paid accurately.

### US-230: Patient Mobile App
**As a** patient, **I want to** use a mobile app for appointments, records, and payments, **so that** I have convenient access from my phone.

### US-240: Doctor Mobile App
**As a** doctor, **I want to** check my schedule and review patient records from my phone, **so that** I can prepare between patients.

### US-250: FHIR Interoperability
**As** a system integrator, **I want to** access MediCore data via HL7 FHIR R4 endpoints, **so that** I can integrate with other health systems.

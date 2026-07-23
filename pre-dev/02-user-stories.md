# Phase 2 — User Stories

## MediCore HIS — Acceptance-Criteria-Driven User Stories

> Format: **As a** [persona], **I want to** [action] **so that** [benefit].
> Each story includes Given/When/Then acceptance criteria.

---

## Authentication & Onboarding

### US-001: Clinic Onboarding
**As a** clinic owner (Dr. Youssef), **I want to** set up my entire clinic in one guided wizard **so that** I can start using the system within 30 minutes without any external help.

**Acceptance criteria:**
- Given I am on the registration page, when I complete the 4-step wizard (org → facility → admin account → first doctor), then all entities are created atomically
- Given any step of the wizard fails, when I retry, then no orphaned records exist (full rollback)
- Given I complete onboarding, when I reach the dashboard, then I see my facility name, my role, and an empty patient list
- Given I am onboarded, when I click "Add Facility", then I can add a second location to my organization

### US-002: Login & Session
**As a** staff member (any role), **I want to** log in with email and password **so that** I can access my role-appropriate dashboard.

**Acceptance criteria:**
- Given I enter valid credentials, when I click login, then I receive an access token and am redirected to my dashboard
- Given I enter wrong password, when I click login, then I see "Invalid email or password" — not "User not found" (no email enumeration)
- Given my access token expires, when the frontend silently refreshes, then I continue working without re-login
- Given I click logout, when I try to use the same refresh token, then I get 401

### US-003: Multi-Facility Access
**As a** doctor working at 2 clinics (Dr. Amina's network), **I want to** switch between facilities **so that** I see only that facility's patients and appointments.

**Acceptance criteria:**
- Given I have roles at Facility A and Facility B, when I open the facility switcher, then I see both facilities listed
- Given I switch to Facility B, when I view patients, then I see only Facility B's patients
- Given I switch facilities, when I check my role, then my permissions reflect the role at that facility

---

## Patient Management

### US-010: Patient Registration
**As a** receptionist (Fatima), **I want to** register a new patient in under 90 seconds **so that** I don't keep the lobby waiting.

**Acceptance criteria:**
- Given I click "New Patient", when I fill in name + phone + DOB + gender (4 fields), then the patient is created with an auto-generated MRN
- Given the MRN prefix for our org is "ASC", when I register a patient in 2026, then the MRN is formatted as `ASC-2026-00001`
- Given I skip optional fields (email, address, national ID), when I save, then the patient is still created successfully
- Given I enter a phone number already used by another patient in our org, when I save, then I see a warning (not a hard block — different people may share phones)

### US-011: Patient Search
**As a** receptionist, **I want to** find a returning patient by typing part of their name, phone, or MRN **so that** I don't have to ask for their full details every visit.

**Acceptance criteria:**
- Given I type "amine" in the search bar, when results load, then I see all patients with "amine" in their first or last name
- Given I type "0661", when results load, then I see patients with phone numbers containing "0661"
- Given I type "ASC-2026", when results load, then I see patients matching that MRN prefix
- Given a patient belongs to a different organization, when I search, then they never appear in my results

### US-012: Patient Allergy Management
**As a** doctor, **I want to** record a patient's allergies **so that** I am warned when prescribing a conflicting drug.

**Acceptance criteria:**
- Given I open a patient profile, when I click "Add Allergy", then I can enter substance, type (drug/food/environmental), reaction, and severity
- Given I add "Penicillin" as a drug allergy, when I later prescribe Amoxicillin, then I see a warning banner (not a hard block)
- Given the allergy warning shows, when I confirm with "Override — doctor aware", then the prescription is saved with `allergy_override: true`

---

## Scheduling

### US-020: Schedule Management
**As a** doctor or admin, **I want to** set my working hours and slot duration per facility **so that** patients can only book available times.

**Acceptance criteria:**
- Given I set Monday: 09:00–13:00 with 15-minute slots and a break at 11:00–11:15, when someone checks my availability for Monday, then they see 15 available slots (not the break slot)
- Given I set a schedule for Facility A, when someone checks my availability at Facility B, then they see a different schedule (or none if not set)

### US-021: Appointment Booking
**As a** receptionist, **I want to** book a patient with a specific doctor on a specific date/time **so that** the patient has a confirmed visit.

**Acceptance criteria:**
- Given I select a doctor and date, when I view available slots, then I see only unbooked, non-break slots
- Given I select a slot and click "Book", when the booking succeeds, then the slot disappears from availability for other staff
- Given two receptionists simultaneously click "Book" on the same slot, when both requests hit the server, then only the first succeeds (409 Conflict for the second)
- Given a booking succeeds, when the patient's phone is on file, then they receive an SMS confirmation within 60 seconds

### US-022: Check-In & Queue
**As a** receptionist, **I want to** check in an arrived patient and display their queue token **so that** the waiting room stays organized.

**Acceptance criteria:**
- Given a patient has a confirmed appointment today, when I click "Check In", then a queue token (e.g., T-042) is generated
- Given I check in a patient, when the queue display screen is open in the waiting room, then the new token appears within 2 seconds (SSE)
- Given the waiting room TV shows the queue display, when no one is authenticated, then the display still works (public endpoint, no login)

### US-023: No-Show Detection
**As a** clinic admin, **I want** the system to auto-mark no-shows after 30 minutes **so that** doctors and receptionists aren't manually tracking who didn't show up.

**Acceptance criteria:**
- Given an appointment is at 10:00 and the patient hasn't checked in by 10:30, when the cron job runs, then the appointment status changes to `no_show`
- Given an appointment is marked `no_show`, when the patient arrives late, then the receptionist can manually override to `checked_in`

---

## Encounters (EMR Core)

### US-030: Open Encounter
**As a** doctor, **I want to** open an encounter for a checked-in patient **so that** I can begin documenting the visit.

**Acceptance criteria:**
- Given a patient is checked in for my appointment, when I click "Start Encounter", then a new encounter is created in `draft` status
- Given an encounter already exists for this appointment, when I try to create another, then I get an error (one encounter per appointment)
- Given I open the encounter, when the page loads, then I see the patient summary (demographics, allergies, problem list, last 3 encounters) in the left sidebar

### US-031: Vitals Recording
**As a** nurse or doctor, **I want to** record patient vitals (BP, HR, temp, weight, height) **so that** they're part of the encounter record.

**Acceptance criteria:**
- Given I enter BP systolic as 120, when I tab to the next field, then the value is auto-saved (no save button needed)
- Given I enter weight and height, when both are present, then BMI is auto-calculated and displayed
- Given I leave some vitals blank, when I move on to SOAP, then no error — vitals are optional

### US-032: SOAP Note with AI Copilot
**As a** doctor, **I want to** type shorthand notes and have the AI expand them into a structured SOAP note **so that** I save 30+ minutes of documentation per day.

**Acceptance criteria:**
- Given I type "pt c/o cough x3d, fever, SOB, hx asthma" in the Subjective field, when I click "AI Expand", then the copilot returns a well-structured paragraph expanding abbreviations into full clinical language
- Given the AI returns a SOAP draft, when I review it, then every section is clearly labeled "AI suggestion — verify before saving"
- Given I edit the AI output, when I save, then my edits are preserved (AI doesn't overwrite my changes)
- Given I click "Regenerate", when the copilot runs again, then I get a fresh suggestion (not cached)
- Given I type in the SOAP fields without using AI, when 2 seconds pass after my last keystroke, then the content is auto-saved

### US-033: Diagnosis Entry
**As a** doctor, **I want to** add ICD-10 diagnoses to the encounter **so that** they're coded for billing and records.

**Acceptance criteria:**
- Given I start typing "pneumonia" in the diagnosis field, when suggestions appear, then I see ICD-10 codes with descriptions (e.g., J18.9 — Pneumonia, unspecified organism)
- Given I select a diagnosis, when I set its type (primary/secondary/differential), then it's added to the encounter's diagnoses array
- Given the AI copilot suggests differentials, when I click a suggestion chip, then the diagnosis is added with type "differential"

### US-034: Prescription Writing
**As a** doctor, **I want to** prescribe medications with dosage details **so that** the patient has a clear, complete prescription.

**Acceptance criteria:**
- Given I search for a drug name, when I select it, then the form pre-fills the drug form and common strengths
- Given I fill in drug + dose + frequency + duration, when I click "Add to Prescription", then the item appears in the encounter's prescriptions list
- Given the prescribed drug matches a patient allergy, when I add it, then a warning banner appears with allergy details
- Given I prescribe 3 medications, when I sign off, then all 3 are included in the `clinics.prescription.issued` event

### US-035: Encounter Sign-Off
**As a** doctor, **I want to** sign off a completed encounter **so that** it becomes a permanent, immutable clinical record and triggers billing.

**Acceptance criteria:**
- Given I have filled in vitals + SOAP + at least 1 diagnosis, when I click "Sign Off", then a confirmation modal appears: "Sign off this encounter? This action is irreversible."
- Given the SOAP Assessment field is empty, when I try to sign off, then I get an error: "Assessment is required before sign-off"
- Given I confirm sign-off, when events fire, then: (1) encounter status → `signed_off`, (2) billing creates a draft invoice, (3) prescription event fires if Rx exists
- Given the encounter is signed off, when I try to edit it, then all fields are read-only

---

## Billing

### US-040: Auto-Invoice on Sign-Off
**As a** receptionist, **I want** the system to automatically create an invoice when the doctor finishes **so that** no appointment goes unbilled.

**Acceptance criteria:**
- Given the doctor signs off Encounter X, when I open the billing module within 5 seconds, then I see a new draft invoice linked to Encounter X
- Given the invoice is auto-created, when I open it, then line items match the services catalog for the encounter's diagnoses/procedures
- Given no services catalog is configured, when the invoice is auto-created, then it has a single line item: "Consultation" at the facility's default consultation fee

### US-041: Invoice Management
**As a** receptionist, **I want to** edit, send, and collect payment on invoices **so that** the clinic gets paid accurately.

**Acceptance criteria:**
- Given a draft invoice, when I add a line item from the services catalog, then subtotal and total recalculate automatically
- Given I apply a 10% discount, when I view the invoice, then the discount amount and new total are displayed correctly
- Given I click "Send", when the patient has an email on file, then they receive the invoice as a PDF email attachment
- Given a patient pays cash, when I record the payment, then the invoice status transitions to PAID

### US-042: Online Payment
**As a** patient (via receptionist in MVP), **I want to** pay an invoice via Stripe **so that** I don't need to carry cash.

**Acceptance criteria:**
- Given the receptionist clicks "Pay Online", when the Stripe payment form loads, then the patient can enter card details
- Given payment succeeds, when Stripe webhook fires, then the invoice status changes to PAID and paid_at timestamp is set
- Given payment fails, when the webhook reports failure, then the invoice remains in SENT status

---

## AI Copilot

### US-050: Patient Summary
**As a** doctor opening an encounter, **I want to** see an AI-generated patient summary in the sidebar **so that** I have context before the consultation starts.

**Acceptance criteria:**
- Given I open an encounter for a patient with 2+ past visits, when the sidebar loads, then I see a structured summary: key demographics, active allergies, active problems, recent encounter highlights
- Given the patient has 0 past visits, when the sidebar loads, then I see: "New patient — no prior history"
- Given the AI service is down, when the sidebar fails to load, then I see: "AI unavailable — check patient history manually" (graceful degradation)

### US-051: Differential Suggestions
**As a** doctor writing SOAP notes, **I want** the AI to suggest possible diagnoses based on my Subjective text **so that** I consider conditions I might have overlooked.

**Acceptance criteria:**
- Given I've typed at least 20 words in the Subjective field, when I click "Suggest Differentials", then 3–5 conditions appear as clickable chips in the sidebar
- Given a chip shows "J18.9 — Pneumonia", when I click it, then it's added to the encounter's diagnoses with type "differential"
- Given I've already exceeded my AI rate limit (20/hour), when I click "Suggest Differentials", then I see: "Rate limit reached — try again in X minutes"

---

## Communication

### US-060: Appointment SMS
**As a** patient, **I want to** receive an SMS when my appointment is booked and a reminder 24 hours before **so that** I don't forget my visit.

**Acceptance criteria:**
- Given I'm registered with phone +212661XXXXXX, when a receptionist books my appointment, then I receive an SMS: "Your appointment with Dr. [Name] at [Clinic] is confirmed for [Date] at [Time]"
- Given my appointment is tomorrow at 14:00, when the scheduled job runs today at 14:00, then I receive a reminder SMS
- Given the SMS fails (Twilio error), when the system retries, then it tries up to 3 times before logging the failure

---

## Admin & Analytics

### US-070: Revenue Dashboard
**As a** clinic owner (Dr. Amina), **I want to** see revenue per facility per time period **so that** I know which location is performing well.

**Acceptance criteria:**
- Given I select "This Month" and "All Facilities", when the dashboard loads, then I see total revenue, revenue by facility (bar chart), and revenue by service type
- Given I select Facility A only, when the dashboard filters, then I see only Facility A's revenue data
- Given there are no invoices this month, when the dashboard loads, then I see "$0" and "No invoices this period" — not a broken chart

### US-071: Audit Trail
**As an** admin, **I want to** see who accessed or modified patient records **so that** I can ensure data handling compliance.

**Acceptance criteria:**
- Given a doctor modifies a patient's allergy list, when I open the audit log, then I see: user, action ("patient.allergy.added"), entity_id, timestamp
- Given I filter by user, when I select Dr. Youssef, then I see only his actions
- Given I filter by entity type "Encounter", when results load, then I see all encounter-related actions across the org

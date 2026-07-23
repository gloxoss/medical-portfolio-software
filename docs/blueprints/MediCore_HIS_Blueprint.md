**EPIOSO**

**MediCore HIS**

Hospital & Clinic Information System

**Pre-Development Blueprint**

MVP + Full Product Specification

Prepared by: Oussama Zaki (zakio)

Studio: EPIOSO

Stack: Next.js + FastAPI + MongoDB

April 2026 - Version 1.0

# **1\. Executive Summary**

MediCore HIS is a multi-tenant SaaS Hospital Information System targeting the spectrum from solo practitioners to multi-hospital enterprise networks. It combines a full clinical operations core with an AI copilot layer, an imaging/RIS integration bridge, and a no-code workflow automation engine - positioning it ahead of existing CodeCanyon products in intelligence, scalability, and automation depth.

## **1.1 Product Vision**

- A single platform that serves solo doctors, clinic chains, and multi-hospital groups under one codebase
- Three-tier SaaS plans: Solo, Clinic, Hospital Enterprise
- AI built in - not bolted on: copilot, imaging analysis, triage chat, discharge summaries
- Workflow automation engine: admin-configurable event → condition → action rules
- RIS-lite bridge to PACS/DICOM without rebuilding a PACS from scratch

## **1.2 Target Market**

| **Segment**                 | **Example Customer**          | **Key Pain Point**                | **Plan**    |
| --------------------------- | ----------------------------- | --------------------------------- | ----------- |
| Solo doctor / GP            | 1 doctor, 1 assistant         | Paper-based records, no billing   | Solo        |
| Clinic / Polyclinic         | 3-15 doctors, multi-site      | Fragmented tools, no telemedicine | Clinic      |
| Hospital / Network          | 50+ staff, multi-facility     | Siloed departments, no BI         | Enterprise  |
| Independent lab / radiology | Standalone diagnostics center | No worklist, manual results       | Diagnostics |

## **1.3 Key Differentiators vs. Competitors**

| **Feature**  | **CodeCanyon Products**         | **MediCore HIS**                                         |
| ------------ | ------------------------------- | -------------------------------------------------------- |
| AI copilot   | Basic LLM endpoint bolted on    | Integrated sidebar: summary, diff-dx, Rx draft           |
| Imaging      | Screenshot upload               | PACS/DICOM bridge + AI findings in report UI             |
| Automation   | Hard-coded workflows            | Admin-configurable rules engine (event→condition→action) |
| Architecture | Monolith, single-tenant install | True multi-tenant SaaS, event-driven modules             |
| Tech stack   | Laravel/PHP (mostly)            | Next.js + FastAPI + MongoDB - modern, scalable           |

# **2\. System Architecture**

## **2.1 Technology Stack**

| **Layer**    | **Technology**                                 | **Rationale**                                                       |
| ------------ | ---------------------------------------------- | ------------------------------------------------------------------- |
| Frontend     | Next.js 14 (App Router, TypeScript)            | SSR + client components, route groups per portal, middleware auth   |
| Backend      | FastAPI (Python 3.11)                          | Async, modular, easy LLM integration, strong type hints             |
| Database     | MongoDB Atlas                                  | Flexible schema for clinical data, natural multi-tenancy via fields |
| Cache / Bus  | Redis (Upstash or self-hosted)                 | Pub/sub for event bus, session cache, queue tokens                  |
| AI / LLM     | OpenAI API / Anthropic API                     | Copilot, triage chat, discharge summaries                           |
| Imaging AI   | External REST API (e.g. Nines, AWS HealthLake) | Provisional DICOM findings without building ML infra                |
| PACS Bridge  | Orthanc (open-source DICOM server)             | Stores DICOM, exposes REST; HIS stores StudyInstanceUID ref         |
| DICOM Viewer | OHIF Viewer (open-source)                      | Launched in-context from radiology portal                           |
| Telemedicine | Jitsi Meet (self-hosted or cloud)              | Free, open-source, no per-minute billing                            |
| Payments     | Stripe + Paystack                              | Global + Africa coverage                                            |
| SMS / Email  | Twilio + SendGrid                              | Appointment reminders, lab alerts, invoices                         |
| File Storage | AWS S3 / Cloudflare R2                         | Documents, uploaded reports, profile images                         |
| Hosting      | Vercel (frontend) + Railway/Fly.io (API)       | Easy CI/CD, auto-scaling                                            |

## **2.2 Multi-Tenancy Model**

Every MongoDB document carries two mandatory scoping fields:

_org_id + facility_id - present on every operational collection. Queries never run without both fields in the filter. This is the single most important architectural rule in the system._

Hierarchy:

- Organization (tenant) - e.g., a hospital group or clinic chain
- Facility - individual hospital, clinic, or lab under the org
- Department - radiology, pathology, cardiology, etc. under a facility
- User - belongs to org, scoped to one or more facilities + roles

## **2.3 Backend Module Map**

| **Module**    | **Owns**                                                         | **Publishes Events**                                     |
| ------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| auth          | JWT, RBAC, sessions, MFA, audit logs                             | user.login, user.logout                                  |
| tenancy       | Orgs, facilities, depts, settings, branding                      | facility.created, settings.updated                       |
| patients      | Patient demographics, MRN, identifiers, dedup                    | patient.registered, patient.updated                      |
| clinics       | Appointments, encounters, SOAP, vitals, diagnoses, prescriptions | appointment.\*, encounter.completed, prescription.issued |
| ipd           | Admissions, beds, wards, OT scheduling, nursing notes            | admission.created, bed.assigned, discharge.completed     |
| labs          | Lab catalog, orders, sample tracking, results, external labs     | lab.order.created, lab.result.ready, lab.result.abnormal |
| radiology     | Radiology orders, worklists, PACS bridge, structured reports     | rad.order.created, rad.report.signed                     |
| pharmacy      | Drug catalog, stock, batches, expiry, dispensing                 | prescription.dispensed, stock.low                        |
| inventory     | Consumables, purchase orders, suppliers, GRN                     | stock.below_threshold, po.created                        |
| billing       | Invoices, payments, refunds, taxes, multi-currency               | invoice.generated, payment.received                      |
| hr            | Staff profiles, attendance, payroll, leaves, shifts              | attendance.marked, payroll.processed                     |
| communication | SMS/email/push templates, delivery logs, internal messaging      | notification.sent                                        |
| ai            | LLM orchestration, vector search, triage chat, copilot           | ai.summary.ready, ai.imaging.findings                    |
| automation    | Rules engine, event bus consumer, action executor                | automation.triggered, automation.action.completed        |

## **2.4 Event Bus Pattern**

All modules communicate exclusively through the Redis pub/sub event bus. No module imports another module's functions directly. This enforces clean boundaries and lets you split modules into microservices later without refactoring.

Example event flow when a doctor signs off an encounter:

- Doctor clicks "Sign off" in the clinical portal
- clinics module saves the encounter with status: signed_off
- clinics module publishes encounter.completed → event bus
- billing module receives the event → generates invoice automatically
- pharmacy module receives prescription.issued → queues for dispensing
- communication module receives encounter.completed → sends follow-up SMS to patient
- automation module checks registered rules → fires any matching actions

## **2.5 Frontend Portal Structure (Next.js App Router)**

| **Route Group** | **Users**                     | **Key Pages**                                                        |
| --------------- | ----------------------------- | -------------------------------------------------------------------- |
| /admin/\*       | Org admin, super admin        | Tenancy config, roles, services, automation rules, BI dashboards     |
| /clinical/\*    | Doctors, nurses               | Patient search, encounter editor, AI copilot sidebar, orders         |
| /ops/\*         | Receptionist, billing staff   | Appointment calendar, check-in, queue screen, invoices               |
| /lab/\*         | Lab technicians, pathologists | Lab worklist, result entry, report generation                        |
| /radiology/\*   | Radiologists, rad techs       | Radiology worklist, OHIF viewer launch, structured report editor     |
| /patient/\*     | Patients (self-service)       | Book appointment, view prescriptions, reports, invoices, teleconsult |
| /api/\*         | Internal + webhooks           | Next.js API routes for thin BFF layer before FastAPI                 |

# **3\. Core Data Model**

## **3.1 MongoDB Collections**

| **Collection**    | **Key Fields**                                                                                                                                                                       | **Notes**                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| organizations     | \_id, name, slug, plan, settings, created_at                                                                                                                                         | Root tenant entity                                                               |
| facilities        | \_id, org_id, name, type, address, departments\[\], settings                                                                                                                         | Hospital / clinic / lab under org                                                |
| users             | \_id, org_id, facility_ids\[\], role, email, password_hash, is_active                                                                                                                | All staff and patients                                                           |
| patients          | \_id, org_id, mrn, national_id, name, dob, gender, phone, emergency_contact                                                                                                          | One per org, shared across facilities                                            |
| doctor_profiles   | \_id, user_id, org_id, specialty, schedule, available_slots                                                                                                                          | Extends user for clinical staff                                                  |
| appointments      | \_id, org_id, facility_id, patient_id, doctor_id, slot, status, type, queue_token                                                                                                    | status: pending\|confirmed\|checked_in\|in_progress\|visited\|cancelled\|no_show |
| encounters        | \_id, org_id, facility_id, appointment_id, patient_id, doctor_id, soap{S,O,A,P}, vitals{}, diagnoses\[\], prescriptions\[\], lab_order_ids\[\], rad_order_ids\[\], status, signed_at | Central clinical record - most important collection                              |
| prescriptions     | \_id, org_id, encounter_id, patient_id, items\[{drug_id, dose, freq, duration, instructions}\], status, issued_at                                                                    | status: issued\|sent_to_pharmacy\|dispensed                                      |
| lab_orders        | \_id, org_id, facility_id, encounter_id, patient_id, tests\[\], status, sample_collected_at, result_pdf_url                                                                          | status: ordered\|sample_collected\|processing\|resulted\|reviewed                |
| lab_results       | \_id, lab_order_id, test_id, value, unit, reference_range, is_abnormal, reported_at                                                                                                  | Structured result per test                                                       |
| radiology_orders  | \_id, org_id, facility_id, encounter_id, patient_id, modality, body_part, accession_number, pacs_study_uid, status                                                                   | accession_number is the PACS bridge key                                          |
| radiology_reports | \_id, rad_order_id, radiologist_id, findings_text, impression_text, ai_suggestions{}, signed_at                                                                                      | Structured narrative report                                                      |
| invoices          | \_id, org_id, facility_id, patient_id, encounter_id, line_items\[\], subtotal, tax, discount, total, currency, status, paid_at                                                       | status: draft\|sent\|paid\|partially_paid\|refunded                              |
| inventory_items   | \_id, org_id, facility_id, name, type, unit, current_stock, reorder_threshold, batches\[\]                                                                                           | Covers drugs (pharmacy) and consumables                                          |
| automation_rules  | \_id, org_id, event_pattern, conditions\[\], actions\[\], is_active                                                                                                                  | event_pattern: glob match on event name                                          |
| audit_logs        | \_id, org_id, user_id, action, entity_type, entity_id, diff, ip, created_at                                                                                                          | Immutable log - no updates, no deletes                                           |

## **3.2 Encounter Document (Detailed Schema)**

_The encounter is the most critical document in the system. Everything clinical in a visit hangs off one encounter. Design this carefully - changing it later is expensive._

Encounter MongoDB document structure:

{  
\_id, org_id, facility_id,  
appointment_id, patient_id, doctor_id,  
soap: { S: string, O: string, A: string, P: string },  
vitals: { bp_systolic, bp_diastolic, hr, temp, weight, height, spo2, rr },  
diagnoses: \[{ icd10_code, description, type: primary|secondary }\],  
prescriptions: \[{ drug_id, name, dose, frequency, duration, notes }\],  
lab_order_ids: \[ObjectId\],  
rad_order_ids: \[ObjectId\],  
attachments: \[{ url, type, name }\],  
ai_suggestions: { differentials\[\], rx_draft, summary },  
status: draft | in_progress | pending_review | signed_off | archived,  
signed_at: ISODate, created_at: ISODate, updated_at: ISODate  
}

# **4\. API Contracts (FastAPI)**

## **4.1 Base URL & Auth**

- Base URL: <https://api.medicore.app/v1>
- Auth: Bearer JWT in Authorization header
- All endpoints require org_id + facility_id scope (from JWT claims)
- Rate limiting: 100 req/min per user, 1000 req/min per org (Redis-backed)

## **4.2 Core Endpoints**

### **Patients**

| **Method** | **Path**                | **Description**                                  | **Auth Role**        |
| ---------- | ----------------------- | ------------------------------------------------ | -------------------- |
| POST       | /patients               | Register new patient + generate MRN              | receptionist, doctor |
| GET        | /patients               | Search patients (fuzzy name, MRN, phone)         | all clinical roles   |
| GET        | /patients/:id           | Get patient profile + summary                    | all clinical roles   |
| PUT        | /patients/:id           | Update demographics                              | receptionist, admin  |
| GET        | /patients/:id/history   | Get full clinical history (encounters, labs, Rx) | doctor, nurse        |
| GET        | /patients/:id/allergies | Get allergy register                             | doctor, pharmacist   |
| POST       | /patients/:id/allergies | Add allergy entry                                | doctor               |

### **Appointments**

| **Method** | **Path**                  | **Description**                                 | **Auth Role**         |
| ---------- | ------------------------- | ----------------------------------------------- | --------------------- |
| GET        | /appointments/slots       | Get available slots for doctor+date             | all                   |
| POST       | /appointments             | Create appointment                              | receptionist, patient |
| PUT        | /appointments/:id/status  | Update status (confirm/cancel/check-in)         | receptionist, doctor  |
| GET        | /appointments/calendar    | Get appointments for calendar view (date range) | doctor, receptionist  |
| POST       | /appointments/:id/checkin | QR/manual check-in → assign queue token         | receptionist          |
| GET        | /appointments/queue       | Live queue for facility (SSE stream)            | receptionist, screen  |

### **Encounters (EMR)**

| **Method** | **Path**                   | **Description**                                | **Auth Role** |
| ---------- | -------------------------- | ---------------------------------------------- | ------------- |
| POST       | /encounters                | Create encounter from appointment              | doctor        |
| GET        | /encounters/:id            | Get full encounter data                        | doctor, nurse |
| PUT        | /encounters/:id            | Update SOAP, vitals, diagnoses, Rx             | doctor        |
| POST       | /encounters/:id/signoff    | Sign off → triggers billing + pharmacy events  | doctor        |
| POST       | /encounters/:id/lab-orders | Add lab order to encounter                     | doctor        |
| POST       | /encounters/:id/rad-orders | Add radiology order to encounter               | doctor        |
| GET        | /encounters/:id/ai-summary | Get AI-generated patient summary + suggestions | doctor        |

### **Billing**

| **Method** | **Path**             | **Description**                 | **Auth Role**         |
| ---------- | -------------------- | ------------------------------- | --------------------- |
| POST       | /invoices            | Create invoice (auto or manual) | billing, receptionist |
| GET        | /invoices/:id        | Get invoice details             | billing, patient      |
| POST       | /invoices/:id/pay    | Record payment (online or cash) | billing               |
| POST       | /invoices/:id/refund | Partial or full refund          | billing, admin        |
| GET        | /invoices            | List invoices with filters      | billing, admin        |

### **AI**

| **Method** | **Path**              | **Description**                                   | **Auth Role**   |
| ---------- | --------------------- | ------------------------------------------------- | --------------- |
| POST       | /ai/summary           | Patient summary from history (LLM)                | doctor          |
| POST       | /ai/differentials     | Differential diagnoses from SOAP S+O fields       | doctor          |
| POST       | /ai/triage-chat       | Patient-facing symptom → specialty recommendation | patient, public |
| POST       | /ai/discharge-summary | Draft discharge summary from encounter            | doctor          |
| POST       | /ai/imaging-analysis  | Submit DICOM study UID for AI analysis            | radiologist     |

### **Automation**

| **Method** | **Path**              | **Description**                              | **Auth Role** |
| ---------- | --------------------- | -------------------------------------------- | ------------- |
| GET        | /automation/rules     | List all rules for the facility              | admin         |
| POST       | /automation/rules     | Create new rule (event, conditions, actions) | admin         |
| PUT        | /automation/rules/:id | Update rule                                  | admin         |
| DELETE     | /automation/rules/:id | Delete rule                                  | admin         |
| GET        | /automation/logs      | Rule execution history                       | admin         |

# **5\. Module Specifications**

## **5.1 Patients Module**

Owns all demographic and identity data. The clinics module NEVER stores demographics - it references patient_id only. This separation protects privacy and simplifies GDPR compliance.

- Patient registration with MRN auto-generation (format: ORG-YEAR-XXXXX)
- Fuzzy search by name, phone, DOB, national ID, MRN
- Deduplication engine: flag probable duplicates before registering
- MRN is per-org; a patient can have different MRNs at different org tenants
- Allergy register with drug interaction check during prescription writing
- Chronic problem list, vaccination history, uploaded documents

## **5.2 Clinics Module**

The largest module. Owns appointments, encounters, prescriptions, and the clinical history sub-domain.

### **Appointments**

- Doctor schedules define available slots (days, times, duration per slot)
- Conflict detection prevents double-booking
- Appointment types: in-person OPD, teleconsult (Jitsi), home visit
- Status lifecycle: draft → confirmed → checked_in → in_progress → visited → completed
- QR code generated per appointment; patient scans at reception to check in
- Queue tokens assigned on check-in; live queue screen via SSE stream

### **Encounters (EMR)**

- SOAP note with S / O / A / P free-text fields
- Structured vitals entry: BP (sys/dia), HR, temperature, weight, height, SpO2, RR
- Diagnosis picker with ICD-10 code search (primary + secondary diagnoses)
- Allergy check fires when prescribing - warns doctor before save
- AI copilot sidebar: reads S field in real time, returns diff-dx suggestions as drafts
- Sign-off triggers: encounter.completed, billing invoice auto-generation, pharmacy queue

### **Prescriptions**

- Drug catalog with generic/brand names, form (tablet/syrup/injection), strength
- Dosage, frequency (TID, BD, QDS, custom), duration, patient instructions
- Print/digital prescription slip (PDF generation)
- Status: issued → sent_to_pharmacy → dispensed

## **5.3 Labs Module**

- Lab test catalog: tests, panels, profiles (e.g., CBC, LFT, lipid profile)
- Lab orders created from encounter - linked via lab_order_id
- Sample collection tracking with timestamps and collector staff ID
- Result entry: structured per-test values with reference ranges
- Abnormal result auto-flag (value outside reference range)
- PDF report generation and delivery to patient portal
- External lab integration: MRN-based linking to external pathology centers
- Events: lab.result.ready (patient notification), lab.result.abnormal (doctor alert)

## **5.4 Radiology Module (RIS-lite)**

- Radiology orders: modality (X-ray, CT, MRI, US, NM), body part, clinical indication
- Accession number generated on order creation - key for PACS bridge
- Worklist: radiologist sees pending exams ordered from HIS
- PACS bridge: order pushed to Orthanc; on image acquisition, StudyInstanceUID stored in HIS
- OHIF viewer launched from HIS with study context (org StudyInstanceUID)
- Structured report editor: findings + impression text fields + AI suggestions overlay
- AI imaging: POST /ai/imaging-analysis → external model returns findings dict → shown as suggestions
- Report sign-off: rad.report.signed event → notifies referring doctor

## **5.5 AI Module**

### **Clinical Copilot**

- Input: patient history (last 5 encounters, active diagnoses, allergies, recent labs)
- Prompt: structured context sent to LLM (OpenAI GPT-4o or Anthropic Claude)
- Output: 3-sentence patient summary + list of differential diagnoses + draft prescription
- All outputs are clearly marked as AI-generated drafts - doctor must accept/edit/discard
- Vector search (pgvector or MongoDB Atlas Vector) over past encounters for RAG

### **Triage Chatbot (Patient-facing)**

- Multi-turn conversation: collects chief complaint, duration, severity, associated symptoms
- Maps symptom clusters to specialties using LLM + local specialty-symptom map
- Returns: recommended specialty + 3 doctor profiles + direct book CTA
- Language: Arabic, French, English (auto-detect)

### **Automation Rules Engine**

- Rule structure: { event_pattern, conditions\[\], actions\[\] }
- Event pattern: glob string, e.g. "lab.result.\*" or "appointment.confirmed"
- Condition operators: equals, greater_than, less_than, contains, is_null, in_list
- Action types: send_sms, send_email, create_task, create_invoice, send_push, webhook, create_purchase_order
- Admin flow builder UI: drag-and-drop condition/action chain (or JSON editor for power users)
- Execution log: every rule fire recorded with event payload, condition results, actions taken

# **6\. MVP Scope & Build Phases**

_The MVP targets the Solo and Clinic plan tiers. Enterprise modules (IPD, OT, HR, payroll) are Phase 3. Ship something valuable fast - then expand._

## **6.1 Phase 1 - Core HIS MVP (Weeks 1-8)**

Goal: A working clinic system that a solo doctor or small clinic can use on day one.

| **Module**             | **Scope in Phase 1**                                               | **Priority** |
| ---------------------- | ------------------------------------------------------------------ | ------------ |
| Auth + Tenancy         | Org/facility creation, user roles, JWT auth, basic RBAC            | P0           |
| Patients               | Registration, MRN, search, deduplication, allergy register         | P0           |
| Clinics - Appointments | Doctor schedules, slot booking, lifecycle, QR check-in, queue      | P0           |
| Clinics - Encounters   | SOAP, vitals, ICD diagnoses, prescription writer, sign-off         | P0           |
| Billing (basic)        | Auto-invoice on encounter sign-off, manual invoice, Stripe payment | P1           |
| Communication          | Appointment reminder SMS (Twilio), result notification email       | P1           |
| AI - Triage chat       | Patient symptom → specialty recommendation                         | P1           |
| Patient portal         | Book appointment, view prescriptions, view invoices                | P1           |
| Doctor portal          | Worklist, encounter editor, prescription writer                    | P0           |
| Receptionist portal    | Calendar, check-in, queue screen, manual billing                   | P0           |
| Admin portal           | Org/facility settings, user management, service catalog            | P1           |

## **6.2 Phase 2 - Diagnostics + Telemedicine (Weeks 9-16)**

Goal: Full diagnostic loop and remote consultation capability.

| **Module**               | **Scope in Phase 2**                                                        | **Priority** |
| ------------------------ | --------------------------------------------------------------------------- | ------------ |
| Labs (full)              | Test catalog, orders, sample tracking, results, PDF reports, MRN linking    | P0           |
| Radiology (RIS-lite)     | Orders, worklist, PACS/Orthanc bridge, OHIF viewer, structured reports      | P0           |
| AI - Copilot             | Doctor sidebar: patient summary, diff-dx, Rx draft, discharge summary       | P0           |
| AI - Imaging analysis    | POST study UID → external model → findings in report UI                     | P1           |
| Telemedicine             | Jitsi Meet integration, teleconsult appointment type, auto meeting creation | P0           |
| Pharmacy (basic)         | Drug catalog, prescription → pharmacy queue, dispensing status              | P1           |
| Notifications (advanced) | Push notifications, WhatsApp integration (Twilio)                           | P2           |
| Analytics dashboard      | Appointments/day, revenue/week, top diagnoses, lab workload                 | P1           |

## **6.3 Phase 3 - Enterprise + Automation (Weeks 17-26)**

Goal: Hospital-grade modules and the automation engine that makes MediCore defensible.

| **Module**          | **Scope in Phase 3**                                                   | **Priority** |
| ------------------- | ---------------------------------------------------------------------- | ------------ |
| IPD                 | Admissions, bed management, wards, transfer, discharge                 | P0           |
| OT scheduling       | Surgery scheduling, pre-op/post-op notes, OT resource booking          | P1           |
| HR                  | Staff profiles, attendance, leave management, shift scheduling         | P0           |
| Payroll             | Salary structure, payslip generation, deductions                       | P2           |
| Inventory (full)    | Purchase orders, suppliers, GRN, multi-store, low-stock rules          | P0           |
| Automation engine   | Rules builder UI, condition evaluator, action executor, execution logs | P0           |
| Multi-hospital BI   | Cross-facility dashboards, revenue comparison, occupancy rates         | P1           |
| Super admin console | SaaS management: tenant provisioning, plan limits, usage analytics     | P0           |
| Blood bank          | Blood group inventory, cross-matching, donation records                | P2           |

# **7\. Repository & File Structure**

## **7.1 Monorepo Layout**

_Use a monorepo (Turborepo). Frontend and backend in separate packages, shared types in /packages/types._

medicore/  
├── apps/  
│ ├── web/ # Next.js frontend  
│ └── api/ # FastAPI backend  
├── packages/  
│ ├── types/ # Shared TypeScript + Pydantic types  
│ └── ui/ # Shared component library  
├── docs/ # Pre-dev docs (this file lives here)  
├── .github/workflows/ # CI/CD pipelines  
└── turbo.json

## **7.2 Frontend Structure (apps/web)**

apps/web/  
├── app/  
│ ├── (admin)/ # Admin portal route group  
│ │ ├── settings/  
│ │ ├── users/  
│ │ └── automation/  
│ ├── (clinical)/ # Doctor / nurse portal  
│ │ ├── patients/\[id\]/  
│ │ ├── encounters/\[id\]/  
│ │ └── worklist/  
│ ├── (ops)/ # Receptionist / billing portal  
│ │ ├── calendar/  
│ │ ├── queue/  
│ │ └── billing/  
│ ├── (lab)/  
│ ├── (radiology)/  
│ ├── (patient)/ # Patient self-service portal  
│ └── api/ # Next.js API routes (BFF layer)  
├── components/  
│ ├── ui/ # Base components (Button, Input, etc.)  
│ ├── clinical/ # Encounter editor, SOAP form, vitals  
│ ├── ai/ # Copilot sidebar, triage chat widget  
│ └── shared/ # Nav, layouts, modals  
├── lib/  
│ ├── api.ts # Typed API client (fetch wrapper)  
│ ├── auth.ts # NextAuth / custom JWT helper  
│ └── utils.ts  
├── middleware.ts # Route protection by role  
└── next.config.ts

## **7.3 Backend Structure (apps/api)**

apps/api/  
├── main.py # FastAPI app entry, middleware, CORS  
├── core/  
│ ├── config.py # Env vars (pydantic-settings)  
│ ├── database.py # MongoDB client (motor)  
│ ├── redis.py # Redis client + event bus  
│ └── security.py # JWT, password hashing, RBAC  
├── modules/  
│ ├── auth/  
│ │ ├── router.py # FastAPI router  
│ │ ├── service.py # Business logic  
│ │ └── schemas.py # Pydantic models  
│ ├── patients/ # Same structure: router, service, schemas  
│ ├── clinics/  
│ ├── labs/  
│ ├── radiology/  
│ ├── billing/  
│ ├── pharmacy/  
│ ├── inventory/  
│ ├── hr/  
│ ├── communication/  
│ ├── ai/  
│ └── automation/  
├── shared/  
│ ├── events.py # Event bus publisher/subscriber  
│ ├── dependencies.py # FastAPI dependency injections  
│ └── exceptions.py # Custom HTTP exceptions  
└── tests/

# **8\. Environment Variables & Configuration**

## **8.1 Frontend (.env.local)**

| **Variable**             | **Value / Source**                 |
| ------------------------ | ---------------------------------- |
| NEXT_PUBLIC_API_URL      | <https://api.medicore.app/v1>      |
| NEXT_PUBLIC_JITSI_DOMAIN | meet.jit.si (or self-hosted)       |
| NEXT_PUBLIC_STRIPE_PK    | Stripe dashboard → Publishable key |
| NEXTAUTH_SECRET          | openssl rand -base64 32            |
| NEXTAUTH_URL             | <https://app.medicore.app>         |

## **8.2 Backend (.env)**

| **Variable**          | **Value / Source**                               |
| --------------------- | ------------------------------------------------ |
| MONGODB_URI           | MongoDB Atlas connection string                  |
| REDIS_URL             | Redis connection string (Upstash or self-hosted) |
| JWT_SECRET            | openssl rand -base64 64                          |
| JWT_EXPIRY_HOURS      | 24                                               |
| OPENAI_API_KEY        | OpenAI platform dashboard                        |
| ANTHROPIC_API_KEY     | Anthropic console (for Claude)                   |
| TWILIO_ACCOUNT_SID    | Twilio console                                   |
| TWILIO_AUTH_TOKEN     | Twilio console                                   |
| TWILIO_PHONE_NUMBER   | Twilio console                                   |
| SENDGRID_API_KEY      | SendGrid dashboard                               |
| STRIPE_SECRET_KEY     | Stripe dashboard → Secret key                    |
| STRIPE_WEBHOOK_SECRET | Stripe dashboard → Webhook signing secret        |
| AWS_S3_BUCKET         | S3 bucket name                                   |
| AWS_ACCESS_KEY_ID     | IAM user credentials                             |
| AWS_SECRET_ACCESS_KEY | IAM user credentials                             |
| ORTHANC_URL           | Orthanc REST API URL (PACS)                      |
| ORTHANC_USERNAME      | Orthanc admin credentials                        |
| ORTHANC_PASSWORD      | Orthanc admin credentials                        |
| IMAGING_AI_API_URL    | External imaging AI REST endpoint                |
| IMAGING_AI_API_KEY    | External imaging AI API key                      |

# **9\. Development Workflow & Conventions**

## **9.1 Git Branch Strategy**

| **Branch**   | **Purpose**             | **Rule**                                          |
| ------------ | ----------------------- | ------------------------------------------------- |
| main         | Production code only    | Protected - no direct push, requires PR + CI pass |
| develop      | Integration branch      | All features merge here first                     |
| feature/XXX  | New feature development | Branch from develop, PR back to develop           |
| fix/XXX      | Bug fixes               | Branch from develop (or main for hotfixes)        |
| release/vX.X | Release candidates      | Cut from develop, merge to main + develop         |

## **9.2 Commit Convention**

- Format: type(scope): description - e.g. feat(clinics): add allergy check on prescription save
- Types: feat | fix | refactor | chore | docs | test | perf
- Scope: module name (auth, patients, clinics, labs, billing, etc.)

## **9.3 PR Checklist**

- All tests pass (pytest for API, Jest for frontend)
- No new TypeScript errors (tsc --noEmit)
- All new endpoints have Pydantic input validation
- New collections have org_id + facility_id indexed
- Events published to bus (not direct module imports)
- No secrets committed (pre-commit hook with detect-secrets)

## **9.4 Testing Strategy**

| **Level**   | **Tool**                | **Coverage Target** | **What to Test**                                   |
| ----------- | ----------------------- | ------------------- | -------------------------------------------------- |
| Unit        | pytest (API), Jest (FE) | 80%                 | Service logic, data transformations, validation    |
| Integration | pytest + testcontainers | 60%                 | DB operations, event publishing, module boundaries |
| E2E         | Playwright              | Key flows only      | Book appointment, complete encounter, pay invoice  |
| Contract    | Schemathesis            | All endpoints       | API schema conformance, error cases                |

## **9.5 CI/CD Pipeline (GitHub Actions)**

- Lint: ESLint (FE) + Ruff (API) - fail fast
- Type check: tsc + mypy
- Unit + integration tests
- Build: next build + docker build API
- Deploy preview: Vercel preview URL for every PR
- On merge to main: deploy to production

# **10\. Immediate Next Steps (Start Here)**

_Do these in order. Do not start Module 2 before Module 1 is complete and tested. The tenancy model is load-bearing - getting it wrong early is very expensive to fix._

## **Step 1 - Project Setup (Day 1)**

- Init monorepo with Turborepo: npx create-turbo@latest medicore
- Create apps/web (Next.js 14) and apps/api (FastAPI)
- Set up MongoDB Atlas cluster + Redis (Upstash free tier)
- Configure .env files (use .env.example as template)
- Set up GitHub repo + branch protection + GitHub Actions lint workflow
- Install and configure ESLint, Prettier, Ruff, mypy

## **Step 2 - Auth + Tenancy (Days 2-4)**

- Build Organization + Facility MongoDB models
- Build User model with roles array and facility_ids scoping
- Implement JWT auth: /auth/login, /auth/refresh, /auth/logout
- Build RBAC dependency in FastAPI: get_current_user() + require_role()
- Build Next.js middleware.ts: route group protection by JWT role
- Create org setup wizard in admin portal (create org → create facility → invite staff)

## **Step 3 - Patients (Days 5-7)**

- Build Patient collection with MRN auto-generation
- Build POST /patients + GET /patients (search) + GET /patients/:id
- Implement fuzzy search with MongoDB \$text index on name, phone, MRN
- Build deduplication check (flag when new patient matches existing phone + DOB)
- Build patient registration form in receptionist portal
- Build allergy register endpoints and allergy entry form

## **Step 4 - Appointments (Days 8-12)**

- Build DoctorProfile + Schedule documents
- Build slot availability calculator (schedule - existing appointments)
- Build full CRUD for appointments + status transitions
- QR code generation (qrcode library, encode appointment_id)
- Check-in endpoint: POST /appointments/:id/checkin → assign queue token
- SSE stream endpoint: GET /appointments/queue (live queue for screen display)
- Calendar view in receptionist portal (react-big-calendar)

## **Step 5 - Encounters / EMR (Days 13-18)**

- Build Encounter MongoDB model (full schema from Section 3.2)
- Build SOAP note form with auto-save every 30s
- Build vitals entry component
- Build ICD-10 diagnosis picker (local JSON + fuzzy search)
- Build prescription writer with drug catalog + allergy check
- Build sign-off flow: encounter.completed event → billing invoice auto-created
- Wire up event bus: Redis pub/sub publisher in clinics module

## **Step 6 - AI Triage Chat (Days 19-21)**

- Build POST /ai/triage-chat endpoint (FastAPI)
- System prompt: map symptoms to specialties, return structured JSON
- Build triage chat widget component in patient portal
- Connect to booking flow: specialty recommendation → show doctors → book CTA

## **Step 7 - Basic Billing + Patient Portal (Days 22-26)**

- Build Invoice model + auto-generate on encounter.completed event
- Build Stripe integration: POST /invoices/:id/pay → Stripe PaymentIntent
- Build billing dashboard in ops portal (invoice list + status filter)
- Build patient portal: book appointment, view prescriptions, view invoices
- Set up Twilio SMS: appointment reminder 24h before (cron job)

_End of Phase 1 MVP. By Day 26 you should have a working clinic system that a doctor, receptionist, and patient can all use end-to-end. Ship it. Get feedback. Then start Phase 2._

## **Document Versions**

| **Version** | **Date**   | **Author**   | **Changes**                                    |
| ----------- | ---------- | ------------ | ---------------------------------------------- |
| 1.0         | April 2026 | Oussama Zaki | Initial pre-dev blueprint - all sections       |
| -           | -          | -            | Update here as architecture decisions are made |
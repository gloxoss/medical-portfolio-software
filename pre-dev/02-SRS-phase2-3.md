# Phase 2 & 3 — Software Requirements Specification (Expansion)

## MediCore HIS — Functional Requirements FR-100 to FR-350

> Extends `02-SRS.md` (FR-001 to FR-083, NFR-001 to NFR-022). Phase 1 requirements unchanged.

---

## Patient Portal — FR-100 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-100 | System SHALL send 6-digit OTP via SMS when patient submits phone number | Must | OTP received within 10s |
| FR-101 | System SHALL store OTP in Redis with 10-minute TTL | Must | OTP expires after 10 min |
| FR-102 | System SHALL limit OTP requests to 3 per phone per hour | Must | 4th request returns 429 |
| FR-103 | System SHALL issue JWT with role=PATIENT on valid OTP verification | Must | JWT contains patient_id, org_id, role |
| FR-104 | Portal SHALL display patient's encounter history (reverse chronological) | Must | Encounters sorted newest first |
| FR-105 | Portal SHALL NOT display doctor's private notes or internal comments | Must | Private fields excluded from response |
| FR-106 | Portal SHALL allow patients to book appointments from available slots | Must | Same conflict prevention as staff booking |
| FR-107 | Portal SHALL allow patients to cancel future appointments | Must | Past appointments cannot be cancelled |
| FR-108 | Portal SHALL display unpaid invoices with "Pay Now" action | Must | Invoice list shows status badges |
| FR-109 | Portal SHALL process Stripe payments and update invoice status | Must | Payment → invoice PAID within 10s |
| FR-110 | Portal SHALL allow patients to download prescription PDFs | Should | PDF contains drug, dose, frequency, prescribing doctor |
| FR-111 | Portal SHALL provide consent toggles (SMS, email, AI analysis) | Must | Toggle OFF reflects in doctor's encounter (AI disabled) |
| FR-112 | Portal SHALL accept GDPR data export requests | Must | Export queued, delivered within 24h via email |
| FR-113 | Portal SHALL accept account deletion requests (forwarded to admin) | Must | Admin receives notification |
| FR-114 | Portal SHALL enforce patient self-scoping (can only see own data) | Must | Patient A cannot see Patient B's records |

---

## Lab Module — FR-120 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-120 | System SHALL maintain a lab test catalog per org (name, category, specimen type, normal ranges, price) | Must | CRUD operations work, searchable |
| FR-121 | Doctors SHALL be able to order lab tests from within an encounter | Must | Lab order created, event fired |
| FR-122 | Lab orders SHALL appear in the lab tech's queue within 2 seconds | Must | SSE or polling updates queue |
| FR-123 | Lab techs SHALL mark specimen as collected with specimen ID | Should | Status transitions: ordered → specimen_collected |
| FR-124 | Lab techs SHALL enter results per test parameter | Must | Numeric and text results supported |
| FR-125 | System SHALL auto-flag values outside normal ranges as ABNORMAL | Must | Flagged values highlighted in red |
| FR-126 | Lab results SHALL require authorization by a qualified doctor | Must | Unauthorized results not visible in encounter |
| FR-127 | System SHALL publish `lab.result.authorized` event on authorization | Must | Event triggers billing + encounter update |
| FR-128 | Lab charges SHALL auto-add to patient invoice on authorization | Must | Invoice line item matches catalog price |
| FR-129 | System SHALL generate lab result PDF with all test values | Should | PDF downloadable by doctor and patient (portal) |
| FR-130 | Lab results SHALL appear in the patient's encounter timeline | Must | Chronological in encounter view |

---

## Pharmacy Module — FR-140 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-140 | System SHALL maintain a drug catalog per org (name, form, strength, manufacturer, price) | Must | CRUD with search |
| FR-141 | System SHALL track pharmacy inventory with batch numbers and expiry dates | Must | Inventory shows batch/expiry per drug |
| FR-142 | System SHALL alert when stock falls below reorder level | Must | Low stock alert on dashboard + email |
| FR-143 | System SHALL alert when drugs are within 30 days of expiry | Should | Expiring badge in inventory UI |
| FR-144 | Encounter sign-off SHALL push prescription to pharmacy queue | Must | `pharmacy.rx.received` event → queue entry |
| FR-145 | Pharmacist SHALL verify and dispense medication with batch selection | Must | Dispensing form with batch picker |
| FR-146 | System SHALL check patient allergies before dispensing | Must | Warning if drug matches allergy |
| FR-147 | Dispensing SHALL decrement stock for selected batch | Must | Stock accurate after dispense |
| FR-148 | System SHALL publish `pharmacy.dispensed` event on dispense | Must | Billing and encounter update |
| FR-149 | Purchase orders SHALL follow workflow: DRAFT → SUBMITTED → APPROVED → RECEIVED | Must | Status transitions enforced |
| FR-150 | Receiving a PO SHALL auto-increment stock | Must | Stock quantity increases |
| FR-151 | System SHALL maintain supplier directory | Should | CRUD with contact info |

---

## Telemedicine — FR-160 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-160 | System SHALL create Daily.co video room for telemedicine appointments | Must | Room URL generated |
| FR-161 | System SHALL send join links to patient (SMS) and doctor (notification) | Must | Both receive links |
| FR-162 | Patient SHALL see waiting room until doctor joins | Must | "Doctor will join shortly" message |
| FR-163 | Doctor SHALL be able to edit encounter during video session | Must | Split-screen: video + encounter form |
| FR-164 | System SHALL calculate session duration on end | Must | Duration stored in minutes |
| FR-165 | Session end SHALL create telemedicine billing charge | Must | Charge added to invoice |
| FR-166 | Video recording SHALL require explicit patient consent toggle | Should | Recording only with consent=true |

---

## IPD Module — FR-180 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-180 | System SHALL manage wards with type, bed count, and daily rate | Must | Ward CRUD |
| FR-181 | System SHALL manage beds with unique numbers and real-time status | Must | Bed map shows status |
| FR-182 | System SHALL admit patients with bed allocation and conflict prevention | Must | Cannot assign occupied bed |
| FR-183 | System SHALL track bed transfers with history | Must | Transfer log in admission record |
| FR-184 | System SHALL maintain nursing station tasks (vitals due, meds due) | Must | Scheduled tasks per patient |
| FR-185 | Nurses SHALL record vitals and medication administration | Must | Timestamped entries |
| FR-186 | Doctors SHALL add daily round notes to admissions | Must | Round notes in admission timeline |
| FR-187 | System SHALL generate discharge summary with follow-up instructions | Must | PDF generated |
| FR-188 | Discharge SHALL free bed and finalize billing | Must | Bed = AVAILABLE, charges calculated |
| FR-189 | Daily cron SHALL add bed charges at midnight for active admissions | Must | Charge = ward.daily_rate × 1 day |
| FR-190 | Admission SHALL support types: elective, emergency, transfer | Must | Type stored in admission record |

---

## Radiology — FR-220 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-220 | System SHALL maintain radiology test catalog | Must | CRUD |
| FR-221 | Doctors SHALL order imaging from encounters | Must | Order created, event fired |
| FR-222 | Radiologists SHALL enter findings, impression, and conclusion | Must | Report saved to order |
| FR-223 | Reports SHALL require authorization before appearing in encounter | Must | Authorization workflow |
| FR-224 | Authorization SHALL trigger billing charge | Must | Invoice line item created |
| FR-225 | System SHALL optionally integrate with Orthanc DICOM viewer | Could | Iframe or Cornerstone.js |

---

## Messaging — FR-240 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-240 | Staff SHALL send direct messages to other staff in same org | Must | Message delivery <1s (WebSocket) |
| FR-241 | Staff SHALL create group conversations | Should | 3+ participants |
| FR-242 | Messages SHALL support text, image, and file types | Should | Attachments upload to R2 |
| FR-243 | Conversations SHALL optionally link to patient context | Should | Patient header in conversation |
| FR-244 | Unread message count SHALL update in real-time | Must | Badge count via WebSocket |

---

## Triage — FR-260 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-260 | Public triage page SHALL collect symptoms without authentication | Must | No login required |
| FR-261 | AI SHALL classify urgency as RED (ER), AMBER (24h), GREEN (routine) | Must | Classification returned |
| FR-262 | Triage SHALL suggest appointment booking for AMBER/GREEN | Should | Link to booking widget |
| FR-263 | Triage data SHALL attach to resulting appointment and encounter | Should | Doctor sees triage summary |
| FR-264 | System SHALL display medical disclaimer on all triage outputs | Must | "This is not a medical diagnosis" |

---

## Ambient Audio AI — FR-270 Series

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-270 | System SHALL capture audio via browser MediaRecorder API | Must | Audio stream captured |
| FR-271 | System SHALL transcribe audio using Deepgram or Whisper | Must | Text transcription returned |
| FR-272 | System SHALL structure transcription into SOAP format | Must | SOAP fields pre-populated |
| FR-273 | All AI-generated SOAP SHALL be labeled "transcription — verify" | Must | Label visible in UI |
| FR-274 | Audio SHALL only be saved to R2 if patient consent toggle = true | Must | Consent enforced |

---

## Platform Features — FR-280 to FR-350

| ID | Requirement | Priority | Testable Criterion |
|----|-------------|----------|-------------------|
| FR-280 | System SHALL support embeddable booking widget (iframe) | Should | Widget renders in external site |
| FR-281 | Widget SHALL list doctors by specialty with available slots | Should | Public endpoint, no auth |
| FR-282 | Guest booking SHALL require only name and phone (no account) | Should | Appointment created, SMS sent |
| FR-290 | Admins SHALL create SMS/email campaigns with audience filters | Should | Campaign created |
| FR-291 | Campaigns SHALL check consent before sending | Must | Only consented recipients |
| FR-292 | Campaign analytics SHALL show delivered/failed/opt-out counts | Should | Counts accurate |
| FR-300 | System SHALL display clinical quality KPIs (encounter duration, follow-up rate) | Should | Data computed from encounters |
| FR-301 | System SHALL display AI copilot usage stats (requests, acceptance rate) | Should | Data from AI logs |
| FR-302 | System SHALL export reports as PDF or CSV | Should | Files download correctly |
| FR-310 | System SHALL support French (default), Arabic (RTL), English | Must | Language switcher works |
| FR-311 | Arabic SHALL render right-to-left correctly | Must | RTL layout |
| FR-312 | Per-org language default SHALL be configurable | Should | Admin setting |
| FR-320 | CMS SHALL auto-generate clinic marketing page from org profile | Should | Public URL renders page |
| FR-321 | CMS SHALL support section builder (hero, services, doctors, contact) | Should | Drag sections to build page |
| FR-322 | CMS SHALL support custom domain mapping | Could | DNS CNAME + SSL |
| FR-330 | Admins SHALL toggle modules per org (enable/disable) | Must | Disabled module = 403 on endpoints |
| FR-331 | Admins SHALL define custom fields per entity type | Should | Fields appear in forms |
| FR-340 | Admins SHALL trigger manual database backups | Should | Backup initiated |
| FR-341 | Admins SHALL view backup history | Should | History list displayed |
| FR-342 | Admins SHALL request point-in-time restore | Could | Restore queued |
| FR-350 | System SHALL integrate helpdesk widget (Tawk.to/Crisp) | Should | Widget visible on all staff pages |

---

## Phase 3 — FR-400 to FR-460 (Summary)

| ID | Requirement | Module |
|----|-------------|--------|
| FR-400–406 | Staff profiles, department roster, attendance, leave, payroll, reports | HR |
| FR-420–425 | Rule engine, visual builder, triggers, actions, execution log, templates | Workflow |
| FR-440–449 | Patient app (OTP, records, booking, payments, push), Doctor app (schedule, patients, encounters, AI, push) | Mobile |
| FR-460–464 | FHIR R4 resources (Patient, Encounter, Observation, MedicationRequest, DiagnosticReport), OAuth2 | FHIR |
| FR-480–482 | Demand forecasting, population risk scoring, longitudinal trend detection | AI Advanced |
| FR-500–502 | Fleet management, dispatch, ambulance billing | Ambulance |

---

## Updated NFRs for Phase 2/3

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-023 | WebSocket messaging latency SHALL be <1 second P95 | Messaging and queue |
| NFR-024 | Video call connection time SHALL be <5 seconds | Telemedicine |
| NFR-025 | Portal pages SHALL load within 2 seconds on 3G connection | Patient portal |
| NFR-026 | System SHALL support 200 concurrent users (up from 50 in MVP) | Phase 2 scale |
| NFR-027 | Mobile apps SHALL support iOS 15+ and Android 10+ | React Native |
| NFR-028 | FHIR API responses SHALL conform to HL7 FHIR R4 spec | Validated with HAPI FHIR validator |
| NFR-029 | RTL layout SHALL render correctly in Arabic across all screens | i18n |
| NFR-030 | Background jobs (cron) SHALL recover from crashes without data loss | BullMQ with retries |

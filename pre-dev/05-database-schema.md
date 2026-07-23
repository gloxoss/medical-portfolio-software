# Phase 5 — Database Schema

## MediCore HIS — Full Schema Documentation

> The complete Prisma schema lives at `his-predev/schemas/postgres/schema.prisma` (376 lines).
> MongoDB schemas live at `his-predev/schemas/mongo/patient.schema.json` and `encounter.schema.json`.
> This document is the human-readable reference with design rationale.

---

## 1. PostgreSQL Schema (Prisma ORM)

### 1.1 Tenancy Layer

#### `organizations`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | Auto-generated |
| `name` | `String` | NOT NULL | Display name: "Cabinet Dr. El Amrani" |
| `slug` | `String` | UNIQUE, NOT NULL | URL-safe: "cabinet-el-amrani" |
| `logo_url` | `String?` | | S3/R2 URL |
| `mrn_prefix` | `String(10)` | NOT NULL | E.g., "CEA". Used in MRN format: `{prefix}-{YYYY}-{counter}` |
| `mrn_counter` | `Int` | Default 0 | Atomically incremented per registration |
| `plan` | `Enum(Plan)` | Default SOLO | SOLO / CLINIC / HOSPITAL / DIAGNOSTICS |
| `status` | `Enum(OrgStatus)` | Default TRIAL | ACTIVE / TRIAL / SUSPENDED / CANCELLED |
| `trial_ends_at` | `DateTime?` | | 14-day trial, then requires payment |
| `stripe_customer_id` | `String?` | UNIQUE | For SaaS billing |
| `stripe_subscription_id` | `String?` | UNIQUE | Active subscription reference |
| `settings` | `Json?` | | `{ default_currency, default_language, timezone, date_format }` |
| `created_at` | `DateTime` | Default now() | |
| `updated_at` | `DateTime` | @updatedAt | |

**Design rationale**: `mrn_counter` lives in PG (not Mongo) because it needs atomic `$transaction` increment to prevent duplicate MRNs under concurrent registration.

#### `facilities`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `org_id` | `String` | FK → organizations, INDEX | Cascade delete |
| `name` | `String` | NOT NULL | "Ain Diab Branch" |
| `address` | `Json?` | | `{ line1, city, region, country }` |
| `phone` | `String?` | | |
| `email` | `String?` | | |
| `settings` | `Json?` | | `{ consultation_fee, currency_override, queue_prefix }` |
| `status` | `Enum` | Default ACTIVE | ACTIVE / INACTIVE |

#### `departments`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `org_id` | `String` | INDEX | |
| `facility_id` | `String` | INDEX | |
| `name` | `String` | NOT NULL | "Cardiology" |
| `specialty` | `String?` | | |

**Phase note**: Departments are a stub in MVP. The table exists for the data model but no CRUD UI is built until Hospital tier (Phase 3).

---

### 1.2 Auth Layer

#### `users`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `email` | `String` | UNIQUE | Login identifier |
| `password_hash` | `String` | NOT NULL | bcrypt, cost factor 12 |
| `org_id` | `String` | FK → organizations, INDEX | |
| `name_first` | `String` | NOT NULL | |
| `name_last` | `String` | NOT NULL | |
| `phone` | `String?` | | |
| `photo_url` | `String?` | | |
| `is_super_admin` | `Boolean` | Default false | Platform-level admin (Oussama only) |
| `status` | `Enum` | Default ACTIVE | ACTIVE / INACTIVE / SUSPENDED |
| `doctor_specialties` | `String[]` | | `["Cardiology", "Internal Medicine"]` — null for non-doctors |
| `doctor_license_no` | `String?` | | Medical license number |
| `doctor_bio` | `String?` | | |
| `doctor_consult_fee` | `Decimal(10,2)?` | | Per-consultation fee in org currency |
| `last_login` | `DateTime?` | | |

**Index**: `(org_id, status)` — fast lookup of active users within an org.

**Design rationale**: Doctor-specific fields live on User (not a separate table) because a User IS a Doctor in this context. Separate tables would require JOINs on every encounter query. Null fields for non-doctors are acceptable at this scale.

#### `user_facility_roles`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `user_id` | `String` | FK → users | Cascade delete |
| `facility_id` | `String` | FK → facilities | Cascade delete |
| `role` | `Enum(Role)` | NOT NULL | ORG_ADMIN / FACILITY_ADMIN / DOCTOR / NURSE / RECEPTIONIST / etc. |
| `is_active` | `Boolean` | Default true | Soft-disable without deleting |

**Unique**: `(user_id, facility_id)` — one role per user per facility.
**Index**: `(facility_id, role)` — "list all doctors at Facility A".

#### `refresh_tokens`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `user_id` | `String` | FK → users, INDEX | |
| `token_hash` | `String` | UNIQUE | SHA-256 hash of the actual token |
| `expires_at` | `DateTime` | NOT NULL | 7 days from creation |
| `revoked` | `Boolean` | Default false | Set true on logout or rotation |

**Design rationale**: We store the hash, not the plaintext token. The actual token is only in the HttpOnly cookie. This way, a database breach doesn't give attackers valid tokens.

---

### 1.3 Billing Layer

#### `services` (Services Catalog)
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `org_id` | `String` | FK → organizations, INDEX | |
| `name` | `String` | NOT NULL | "General Consultation" |
| `description` | `String?` | | |
| `price` | `Decimal(10,2)` | NOT NULL | 300.00 |
| `currency` | `String` | Default "MAD" | |
| `category` | `String?` | | "consultation", "procedure", "lab", "radiology" |
| `is_active` | `Boolean` | Default true | |

#### `invoices`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `org_id` | `String` | FK → organizations | |
| `facility_id` | `String` | FK → facilities | |
| `patient_id` | `String` | NOT NULL | MongoDB Patient._id as string |
| `encounter_id` | `String?` | | MongoDB Encounter._id (null for manual invoices) |
| `invoice_no` | `String` | UNIQUE | `INV-2026-00142` |
| `status` | `Enum` | Default DRAFT | DRAFT / SENT / PAID / OVERDUE / VOID |
| `subtotal` | `Decimal(10,2)` | NOT NULL | Sum of line items |
| `tax_amount` | `Decimal(10,2)` | Default 0 | |
| `discount` | `Decimal(10,2)` | Default 0 | |
| `total` | `Decimal(10,2)` | NOT NULL | subtotal + tax - discount |
| `currency` | `String` | Default "MAD" | |
| `notes` | `String?` | | |
| `stripe_payment_intent_id` | `String?` | UNIQUE | |
| `stripe_payment_url` | `String?` | | |
| `created_by` | `String` | NOT NULL | User.id who created |

**Indexes**: `(org_id, facility_id, status)`, `(org_id, patient_id)`.

#### `payments`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `invoice_id` | `String` | FK → invoices, INDEX | |
| `amount` | `Decimal(10,2)` | NOT NULL | |
| `method` | `Enum` | NOT NULL | CASH / STRIPE / BANK_TRANSFER / INSURANCE |
| `status` | `Enum` | Default PENDING | PENDING / COMPLETED / FAILED / REFUNDED |
| `reference` | `String?` | | Stripe PI ID or cash receipt number |
| `paid_at` | `DateTime?` | | |
| `created_by` | `String` | NOT NULL | User.id |

---

### 1.4 Audit Layer

#### `audit_logs`
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| `id` | `String` (cuid) | PK | |
| `org_id` | `String` | NOT NULL | |
| `facility_id` | `String?` | | Null for org-level actions |
| `user_id` | `String` | NOT NULL | |
| `action` | `String` | NOT NULL | "patient.created", "encounter.signed_off" |
| `entity_type` | `String` | NOT NULL | "Patient", "Encounter", "Invoice" |
| `entity_id` | `String` | NOT NULL | ID of affected record |
| `changes` | `Json?` | | `{ before: {}, after: {} }` for updates |
| `ip_address` | `String?` | | |
| `created_at` | `DateTime` | Default now() | Immutable — no updated_at |

**Indexes**: `(org_id, entity_type, entity_id)`, `(org_id, user_id)`.

**Design rationale**: Audit logs are append-only. No UPDATE or DELETE operations ever. This is critical for compliance and forensic analysis.

---

## 2. MongoDB Schema (Mongoose ODM)

### 2.1 `patients` Collection

**Full JSON schema**: `his-predev/schemas/mongo/patient.schema.json` (104 lines)

**Key design decisions**:
- `org_id` is a **required field** on every patient document — tenant scoping
- `allergies[]` stores normalized substance names for drug matching: `substance_normalized: "penicillin"` (lowercase)
- `problem_list[]` includes `icd_code` for interoperability
- `documents[]` stores R2 URLs, not binary data — documents are never embedded in MongoDB
- `name.display` is a computed field (`first + " " + last`) used for text search index

**Indexes**:
- `{ org_id: 1, mrn: 1 }` — UNIQUE per org
- `{ org_id: 1, phone: 1 }`
- `{ org_id: 1, "name.last": 1, "name.first": 1 }`
- `{ org_id: 1, national_id: 1 }`
- Text index on `{ "name.display": "text", phone: "text", mrn: "text" }`

### 2.2 `encounters` Collection

**Full JSON schema**: `his-predev/schemas/mongo/encounter.schema.json` (129 lines)

**Key design decisions**:
- **One encounter per appointment** — enforced by unique index on `appointment_id`
- `vitals` is a partial-update object — not all fields required, autosaved on blur
- `soap.last_autosaved_at` tracks the last debounced save timestamp
- `soap.assessment` is the **only required field at sign-off** — validates before status transition
- `prescriptions[].allergy_override` tracks when a doctor knowingly prescribes despite allergy match
- `ai_context` tracks which AI features were shown — for quality analytics, never auto-applied
- `invoice_id` is a back-reference to PG — set by the billing event handler after sign-off
- `status` transitions: `draft → in_progress → signed_off → archived`. `signed_off` is irreversible

**Indexes**:
- `{ org_id: 1, facility_id: 1, patient_id: 1, created_at: -1 }` — patient timeline
- `{ org_id: 1, facility_id: 1, doctor_id: 1, status: 1 }` — doctor's active encounters
- `{ appointment_id: 1 }` — UNIQUE, one encounter per appointment

### 2.3 `appointments` Collection

**Stored in MongoDB** (not defined in his-predev JSON schema but modeled in his-predev architecture):

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `org_id` | ObjectId | Tenant scope |
| `facility_id` | ObjectId | |
| `patient_id` | ObjectId | |
| `doctor_id` | String | PG User.id |
| `start_time` | Date | |
| `end_time` | Date | Computed: start_time + slot_minutes |
| `type` | String | "consultation", "followup", "emergency" |
| `status` | String | "booked", "confirmed", "checked_in", "in_progress", "completed", "cancelled", "no_show" |
| `queue_token` | String | "T-042" — generated on check-in |
| `cancel_reason` | String? | Required when status = cancelled |
| `status_history` | Array | `[{ status, changed_at, changed_by }]` — full audit trail |
| `notes` | String? | Booking notes |
| `created_at` | Date | |
| `created_by` | String | User.id who booked |

**Indexes**:
- `{ org_id: 1, facility_id: 1, doctor_id: 1, start_time: 1 }` — availability lookup
- `{ org_id: 1, facility_id: 1, status: 1, start_time: 1 }` — queue/today's list
- `{ org_id: 1, patient_id: 1, start_time: -1 }` — patient appointment history

### 2.4 `notification_logs` Collection

| Field | Type | Notes |
|-------|------|-------|
| `_id` | ObjectId | |
| `org_id` | ObjectId | |
| `patient_id` | ObjectId | |
| `channel` | String | "sms", "email" |
| `event` | String | "appointment.confirmed", "invoice.sent" |
| `recipient` | String | Phone number or email |
| `content` | String | Rendered message body |
| `status` | String | "sent", "failed", "pending" |
| `provider_id` | String? | Twilio SID or SendGrid message ID |
| `error` | String? | Error message if failed |
| `sent_at` | Date | |
| `created_at` | Date | |

---

## 3. Redis Key Patterns

| Pattern | TTL | Type | Purpose |
|---------|-----|------|---------|
| `session:{userId}` | 15 min | Hash | `{ role, org_id, facility_id }` — active session state |
| `queue:{facilityId}` | 24h | Sorted Set | Live queue: score = check-in time, member = `{token}:{patientName}` |
| `ai_rate:{userId}` | 1h | Counter | AI request count per user per hour |
| `ai_context:{sessionId}` | 30 min | String (JSON) | Triage chatbot state (Phase 2) |
| `ai_cache:{promptHash}` | 1h | String (JSON) | Cached AI response for identical prompts |
| `otp:{phone}` | 10 min | String | Patient portal OTP (Phase 2) |
| `schedule_lock:{doctorId}:{slot}` | 30s | String | Optimistic booking lock |
| `clinics.*` | — | Pub/Sub channel | Encounter/appointment events |
| `billing.*` | — | Pub/Sub channel | Invoice/payment events |
| `patients.*` | — | Pub/Sub channel | Patient registration events |
| `tenancy.*` | — | Pub/Sub channel | Org/facility events |

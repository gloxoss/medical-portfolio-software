# 02 — Database Strategy
### PostgreSQL vs MongoDB vs Redis — What lives where and why

---

## The core decision rule

> **PostgreSQL** = anything with strict relationships, financial integrity, or that needs JOIN queries
> **MongoDB** = anything that is a clinical document, evolves its schema, or has deeply nested structure
> **Redis** = anything ephemeral, real-time, or that needs sub-millisecond access

This is not "use both databases because it's cool". It's a deliberate split based on data characteristics.

---

## PostgreSQL — Relational, structured, financially critical

**ORM**: Prisma  
**Host**: Railway Postgres plugin (dev) → Supabase or RDS (prod scale)

### Tables in PostgreSQL

| Table | Why PG | Key relationships |
|---|---|---|
| `organizations` | Immutable config, referenced everywhere | → facilities, users |
| `facilities` | Structured config per branch | → org, users |
| `departments` | Optional hospital structure | → facility |
| `users` | Auth, RBAC, strict constraints | → org, facilities |
| `user_facility_roles` | Many-to-many: user ↔ facility ↔ role | → user, facility |
| `refresh_tokens` | Security — needs hard deletes | → user |
| `doctor_schedules` | Structured time slots, conflict checks | → user (doctor), facility |
| `services_catalog` | Pricing, taxes — financial data | → org |
| `drug_catalog` | Structured drug data, not per-patient | → org |
| `invoices` | Financial records — ACID required | → org, facility, patient_id |
| `invoice_items` | Line items with amounts | → invoice |
| `payments` | Transaction records — ACID required | → invoice |
| `tax_configurations` | Financial config | → org |
| `audit_logs` | Immutable write log | → user, org |
| `notification_templates` | Structured template config | → org |
| `subscription_plans` | SaaS billing (Phase 2) | — |

### Why PG for financial data specifically
Invoices and payments MUST be ACID-compliant. If a payment fails halfway through writing, the database must roll it back atomically. MongoDB's multi-document transactions exist but are more complex to reason about. PostgreSQL's transaction model is battle-tested for financial records.

---

## MongoDB — Document-oriented, clinical, schema-flexible

**ODM**: Mongoose (via NestJS)  
**Host**: MongoDB Atlas (M0 free tier in dev, M10 in prod)

### Collections in MongoDB

| Collection | Why Mongo | Schema characteristics |
|---|---|---|
| `patients` | Deeply nested (allergies[], problems[], documents[]) | Evolves per deployment |
| `encounters` | Central clinical document — vitals + SOAP + diagnoses + Rx + lab orders all in one | Highly nested, variable structure |
| `appointments` | Status history array, evolves | Embedded status_history[] |
| `prescriptions` | Embedded in encounter, also queried standalone | Variable drug fields |
| `lab_orders` | Nested result values, variable test types | Variable result structure per test |
| `lab_results` | Result values vary by test type (numeric, text, range) | Polymorphic values |
| `radiology_reports` | Free-text structured reports | Evolves with templates |
| `notification_logs` | Event log — append-only, high volume | Time-series pattern |
| `ai_sessions` | Triage chatbot conversation history | Unstructured messages[] |
| `ai_prompt_templates` | Versioned AI prompts | Version + content fields |
| `automation_rules` | Flexible JSON rule definitions (Phase 3) | Arbitrary condition/action shapes |

### Why Mongo for clinical data specifically
A patient document needs arrays of allergies, arrays of past conditions, arrays of uploaded documents. An encounter needs to embed vitals, SOAP note, multiple diagnoses, multiple prescription items, and lab order references — all in one read. Joining 6 tables in PostgreSQL to reconstruct an encounter creates complexity and latency for the most common read operation in the system.

---

## Redis — Ephemeral, real-time, speed-critical

**Client**: ioredis  
**Host**: Railway Redis plugin

### What lives in Redis

| Key pattern | TTL | Purpose |
|---|---|---|
| `session:{userId}` | 15 min | Active session state (role, facility context) |
| `queue:{facilityId}` | 24h | Live queue state (current token, waiting list) |
| `ai_rate:{userId}` | 1h | AI call rate limit counter |
| `ai_context:{sessionId}` | 30 min | Triage chatbot conversation state |
| `ai_cache:{hash}` | 1h | Cached AI response for identical prompts |
| `otp:{phone}` | 10 min | Patient phone OTP for portal auth |
| `schedule_lock:{doctorId}:{slot}` | 30s | Optimistic lock during slot booking |
| Event channels | — | pub/sub channels (clinics.*, labs.*, billing.*) |

### Why Redis for queue state
The queue display screen updates in real time for every check-in. This is SSE — new events every few seconds. Reading queue state from PostgreSQL on every SSE push would create unnecessary DB load. Redis gives sub-millisecond reads for the queue object that's updated once per check-in.

### Why Redis for booking locks
When two receptionists try to book the same slot simultaneously, a 30-second Redis lock prevents double-booking at the slot level before the PostgreSQL write confirms. This is cheaper than a full DB transaction lock.

---

## Cross-database consistency patterns

The hybrid model creates one challenge: what happens when a PG write succeeds but a Mongo write fails (or vice versa)?

### Rule: PostgreSQL owns the source of truth for relationships

If an invoice is created in PG and the notification log write to Mongo fails — the invoice still exists. The notification simply didn't log. No data loss.

If a patient is registered in Mongo but the audit log write to PG fails — retry the audit log. The patient still exists.

### Pattern: Outbox + retry for critical cross-DB writes

For the one case where both writes MUST succeed (creating an invoice + marking the encounter as billed), use the outbox pattern:

1. Write invoice to PG with `status: 'pending_confirmation'`
2. Publish `billing.invoice.created` event to Redis
3. NestJS event handler updates encounter in Mongo with `invoice_id` reference
4. Handler updates invoice status to `active` in PG
5. If step 3 fails: retry queue in Redis retries it up to 3 times
6. If step 3 fails 3 times: alert logged, manual review flag set

---

## Prisma schema summary

```prisma
// schema.prisma (PostgreSQL)

model Organization {
  id          String     @id @default(cuid())
  name        String
  slug        String     @unique
  mrn_prefix  String
  mrn_counter Int        @default(0)
  plan        Plan       @default(SOLO)
  status      OrgStatus  @default(TRIAL)
  settings    Json?
  created_at  DateTime   @default(now())
  facilities  Facility[]
  users       User[]
  invoices    Invoice[]
}

model Facility {
  id           String       @id @default(cuid())
  org_id       String
  name         String
  address      Json?
  settings     Json?
  created_at   DateTime     @default(now())
  org          Organization @relation(fields: [org_id], references: [id])
  user_roles   UserFacilityRole[]
}

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  password_hash  String
  org_id         String
  name_first     String
  name_last      String
  phone          String?
  photo_url      String?
  is_super_admin Boolean   @default(false)
  status         UserStatus @default(ACTIVE)
  created_at     DateTime  @default(now())
  org            Organization @relation(fields: [org_id], references: [id])
  facility_roles UserFacilityRole[]
  refresh_tokens RefreshToken[]
}

model UserFacilityRole {
  id          String   @id @default(cuid())
  user_id     String
  facility_id String
  role        Role
  is_active   Boolean  @default(true)
  user        User     @relation(fields: [user_id], references: [id])
  facility    Facility @relation(fields: [facility_id], references: [id])
  @@unique([user_id, facility_id])
}

model Invoice {
  id          String        @id @default(cuid())
  org_id      String
  facility_id String
  patient_id  String        // MongoDB ObjectId stored as string
  encounter_id String?      // MongoDB ObjectId stored as string
  status      InvoiceStatus @default(DRAFT)
  subtotal    Decimal
  tax_amount  Decimal       @default(0)
  total       Decimal
  currency    String        @default("MAD")
  issued_at   DateTime?
  paid_at     DateTime?
  created_at  DateTime      @default(now())
  org         Organization  @relation(fields: [org_id], references: [id])
  items       InvoiceItem[]
  payments    Payment[]
}

enum Plan { SOLO CLINIC HOSPITAL DIAGNOSTICS }
enum OrgStatus { ACTIVE TRIAL SUSPENDED }
enum UserStatus { ACTIVE INACTIVE SUSPENDED }
enum Role { ORG_ADMIN FACILITY_ADMIN DOCTOR NURSE RECEPTIONIST LAB_TECH RADIOLOGIST PHARMACIST ACCOUNTANT }
enum InvoiceStatus { DRAFT SENT PAID VOID OVERDUE }
```

---

## MongoDB index strategy

All collections: compound index on `(org_id, facility_id)` first.

```javascript
// patients
db.patients.createIndex({ org_id: 1, mrn: 1 }, { unique: true })
db.patients.createIndex({ org_id: 1, phone: 1 })
db.patients.createIndex({ org_id: 1, "name.last": 1, "name.first": 1 })
db.patients.createIndex({ org_id: 1, national_id: 1 })

// encounters
db.encounters.createIndex({ org_id: 1, facility_id: 1, patient_id: 1, created_at: -1 })
db.encounters.createIndex({ org_id: 1, facility_id: 1, doctor_id: 1, status: 1 })
db.encounters.createIndex({ appointment_id: 1 }, { unique: true })

// appointments
db.appointments.createIndex({ org_id: 1, facility_id: 1, doctor_id: 1, start_time: 1 })
db.appointments.createIndex({ org_id: 1, facility_id: 1, status: 1, start_time: 1 })
db.appointments.createIndex({ org_id: 1, patient_id: 1, start_time: -1 })
```

# Phase 3 — Architecture Overview

## MediCore HIS — System Architecture

---

## 1. System Context

MediCore HIS is a multi-service SaaS platform with three runtime components, three data stores, and five external integrations:

```mermaid
C4Context
    title MediCore HIS — System Context Diagram

    Person(doctor, "Doctor", "Records encounters, prescriptions, uses AI copilot")
    Person(receptionist, "Receptionist", "Registers patients, books appointments, handles billing")
    Person(admin, "Org/Facility Admin", "Manages users, facilities, settings, views analytics")

    System(medicore, "MediCore HIS", "Multi-tenant SaaS HIS with AI copilot")

    System_Ext(openai, "OpenAI API", "GPT-4o / GPT-4o-mini for clinical AI")
    System_Ext(twilio, "Twilio", "SMS notifications + OTP")
    System_Ext(sendgrid, "SendGrid", "Email delivery")
    System_Ext(stripe, "Stripe", "Payment processing")
    System_Ext(r2, "Cloudflare R2", "File storage (patient documents)")

    Rel(doctor, medicore, "Uses", "HTTPS")
    Rel(receptionist, medicore, "Uses", "HTTPS")
    Rel(admin, medicore, "Uses", "HTTPS")
    Rel(medicore, openai, "Calls", "HTTPS")
    Rel(medicore, twilio, "Sends SMS", "HTTPS")
    Rel(medicore, sendgrid, "Sends email", "HTTPS")
    Rel(medicore, stripe, "Processes payments", "HTTPS + Webhooks")
    Rel(medicore, r2, "Stores files", "S3 API")
```

---

## 2. Major Components and Responsibilities

| Component | Technology | Responsibility | Port |
|-----------|-----------|---------------|------|
| **Web Frontend** | Next.js 14 (App Router, TypeScript) | UI rendering, route protection, API calls, SSE consumption | 3000 |
| **Core API** | NestJS (TypeScript, Prisma, Mongoose) | All business logic: auth, tenancy, patients, scheduling, encounters, billing, communication | 3001 |
| **AI Sidecar** | FastAPI (Python, Pydantic, LangChain) | AI inference: copilot summaries, differentials, investigations | 8000 |
| **PostgreSQL** | PostgreSQL 16 | Relational data: users, orgs, facilities, invoices, payments, schedules, audit logs | 5432 |
| **MongoDB** | MongoDB 7.0 | Document data: patients, encounters, appointments, prescriptions, notification logs | 27017 |
| **Redis** | Redis 7.2 | Event bus (pub/sub), session cache, queue state, AI rate limiting, booking locks | 6379 |

---

## 3. Data Flow Summary

### Write Path: Doctor Signs Off an Encounter

```mermaid
sequenceDiagram
    participant D as Doctor (Browser)
    participant FE as Next.js Frontend
    participant API as NestJS Core API
    participant Mongo as MongoDB
    participant Redis as Redis Event Bus
    participant PG as PostgreSQL
    participant AI as FastAPI AI

    D->>FE: Click "Sign Off"
    FE->>API: POST /encounters/:id/sign-off
    API->>Mongo: Update encounter status → signed_off
    API->>Redis: Publish clinics.encounter.signed_off
    Redis-->>API: Billing subscriber receives event
    API->>PG: CREATE Invoice (draft)
    API->>Redis: Publish billing.invoice.created
    Redis-->>API: Communication subscriber receives event
    API->>FE: 200 OK { encounter, invoice_id }
    FE->>D: Show "Encounter signed off. Invoice #INV-2026-00042 created."
```

### Read Path: AI Copilot Generates Patient Summary

```mermaid
sequenceDiagram
    participant D as Doctor (Browser)
    participant FE as Next.js Frontend
    participant API as NestJS Core API
    participant AI as FastAPI AI
    participant Redis as Redis
    participant OpenAI as OpenAI API
    participant Mongo as MongoDB

    D->>FE: Open encounter → sidebar loads
    FE->>API: POST /ai/copilot/summary { patient_id, encounter_id }
    API->>AI: POST /ai/copilot/summary (forward with JWT)
    AI->>Redis: Check rate limit (ai_rate:{userId})
    Redis-->>AI: Under limit (15/20)
    AI->>Redis: Check cache (ai_cache:{hash})
    Redis-->>AI: Cache miss
    AI->>API: GET /internal/patients/:id/context (X-Internal-Service-Key)
    API->>Mongo: Fetch patient + last 3 encounters
    Mongo-->>API: Patient document + encounters
    API-->>AI: Patient context JSON
    AI->>OpenAI: Chat completion (prompt + context)
    OpenAI-->>AI: Structured summary
    AI->>Redis: Cache response (TTL 1h)
    AI-->>API: Summary JSON
    API-->>FE: Summary JSON
    FE-->>D: AI sidebar renders patient summary
```

---

## 4. Third-Party Integration Map

| Service | Used By | Purpose | Auth Method | Cost Model |
|---------|---------|---------|-------------|------------|
| OpenAI API | FastAPI | GPT-4o/mini for clinical AI | API key | Pay-per-token ($0.005/1K tokens) |
| Twilio | NestJS | SMS (confirmations, reminders) | API key + SID | Pay-per-SMS ($0.02/SMS) |
| SendGrid | NestJS | Email (invoices, notifications) | API key | Free tier: 100/day |
| Stripe | NestJS + Next.js | Payment processing | API key + webhook secret | 2.9% + $0.30 per transaction |
| Cloudflare R2 | NestJS | Document upload/storage | S3-compatible keys | Free 10GB, then $0.015/GB |
| MongoDB Atlas | NestJS | Clinical document database | Connection URI + credentials | Free M0 → $57/mo M10 |
| Railway | All services | PaaS hosting + PG + Redis | Dashboard config | $5/service/mo |
| Vercel | Next.js | Frontend hosting + SSR | Git integration | Free hobby tier |

---

## 5. Communication Patterns

### Module-to-Module Communication

Modules inside NestJS communicate **exclusively via Redis events**. No module imports another module's service directly.

| Event | Publisher | Subscriber(s) | Action |
|-------|----------|---------------|--------|
| `tenancy.facility.created` | Tenancy | (future: analytics) | Log new facility |
| `patients.patient.registered` | Patients | (future: communication) | Welcome SMS |
| `clinics.appointment.confirmed` | Scheduling | Communication | Send confirmation SMS |
| `clinics.appointment.checked_in` | Scheduling | (SSE broadcaster) | Push to queue display |
| `clinics.encounter.signed_off` | Encounters | Billing, Communication | Create invoice, send notification |
| `clinics.prescription.issued` | Encounters | (Phase 2: Pharmacy) | Notify pharmacy |
| `clinics.lab-order.created` | Encounters | (Phase 2: Labs) | Notify lab |
| `billing.invoice.created` | Billing | Communication | Send invoice email |
| `billing.invoice.paid` | Billing | Communication | Send payment confirmation |

### Event Envelope Format

```json
{
  "event": "clinics.encounter.signed_off",
  "org_id": "clx123abc",
  "facility_id": "clx456def",
  "actor_id": "clx789ghi",
  "timestamp": "2026-04-07T14:30:00.000Z",
  "payload": {
    "encounter_id": "6612abc...",
    "patient_id": "6612def...",
    "doctor_id": "clx789ghi"
  }
}
```

---

## 6. Deployment Overview

```mermaid
graph TB
    subgraph "Vercel (Free Tier)"
        FE[Next.js 14 Frontend]
    end

    subgraph "Railway ($15/mo total)"
        API[NestJS Core API<br/>Starter $5]
        AI[FastAPI AI Sidecar<br/>Starter $5]
        PG[(PostgreSQL 16<br/>Plugin $5)]
        RD[(Redis 7.2<br/>Plugin $5)]
    end

    subgraph "MongoDB Atlas"
        MG[(MongoDB 7.0<br/>M0 Free → M10)]
    end

    subgraph "External Services"
        OAI[OpenAI API]
        TW[Twilio SMS]
        SG[SendGrid Email]
        ST[Stripe Payments]
        R2[Cloudflare R2]
    end

    FE -->|REST + SSE| API
    FE -.->|AI sidebar| AI
    API --> PG
    API --> MG
    API --> RD
    AI --> RD
    API --> TW
    API --> SG
    API --> ST
    API --> R2
    AI --> OAI
```

**Total cost**: ~$20/mo (dev) → ~$80–120/mo (first clinic live)

# Phase 3 — C4 Diagrams

## MediCore HIS — Architecture Diagrams (C4 Model)

---

## 1. C4 Context Diagram (Level 1)

Shows MediCore as a single system interacting with users and external services.

```mermaid
graph TB
    subgraph Users
        DOC["👨‍⚕️ Doctor<br/>Records encounters, uses AI copilot"]
        REC["👩‍💼 Receptionist<br/>Registers patients, books appointments, billing"]
        ADM["👨‍💼 Org/Facility Admin<br/>Manages users, facilities, analytics"]
    end

    subgraph "MediCore HIS"
        MC["MediCore HIS Platform<br/>Multi-tenant SaaS<br/>Clinical operations + AI copilot"]
    end

    subgraph "External Services"
        OAI["OpenAI API<br/>Clinical AI inference"]
        TW["Twilio<br/>SMS notifications"]
        SG["SendGrid<br/>Email delivery"]
        ST["Stripe<br/>Payment processing"]
        R2["Cloudflare R2<br/>File storage"]
    end

    DOC -->|HTTPS| MC
    REC -->|HTTPS| MC
    ADM -->|HTTPS| MC

    MC -->|HTTPS| OAI
    MC -->|HTTPS| TW
    MC -->|HTTPS| SG
    MC <-->|HTTPS + Webhooks| ST
    MC -->|S3 API| R2
```

---

## 2. C4 Container Diagram (Level 2)

Shows the internal runtime containers and data stores.

```mermaid
graph TB
    subgraph Users
        U["Users<br/>(Doctor, Receptionist, Admin)"]
    end

    subgraph "MediCore HIS Platform"
        subgraph "Frontend - Vercel"
            WEB["Next.js 14<br/>App Router + TypeScript<br/>SSR + Client Components<br/>Port 3000"]
        end

        subgraph "Backend - Railway"
            API["NestJS Core API<br/>TypeScript + Prisma + Mongoose<br/>12 Domain Modules<br/>Port 3001"]
            AIS["FastAPI AI Sidecar<br/>Python + LangChain<br/>Copilot + Differentials<br/>Port 8000"]
        end

        subgraph "Data Stores - Railway + Atlas"
            PG[("PostgreSQL 16<br/>Prisma ORM<br/>Users, Orgs, Invoices,<br/>Schedules, Audit Logs")]
            MG[("MongoDB 7.0<br/>Mongoose ODM<br/>Patients, Encounters,<br/>Appointments, Prescriptions")]
            RD[("Redis 7.2<br/>ioredis<br/>Events, Cache, Queue,<br/>Rate Limits, Locks")]
        end
    end

    subgraph "External"
        OAI["OpenAI API"]
    end

    U -->|HTTPS| WEB
    WEB -->|REST + SSE| API
    API -->|HTTP + JWT| AIS
    AIS -->|GET /internal/*| API

    API --> PG
    API --> MG
    API --> RD
    AIS --> RD
    AIS --> OAI
```

---

## 3. C4 Component Diagram (Level 3) — NestJS Core API

Shows the internal modules of the main backend service.

```mermaid
graph TB
    subgraph "NestJS Core API (apps/api)"
        subgraph "Common Layer"
            JWT["JwtAuthGuard"]
            PERM["PermissionsGuard"]
            TENANT["TenantScope Decorator"]
            AUDIT["AuditInterceptor"]
        end

        subgraph "Domain Modules"
            AUTH["Auth Module<br/>login, refresh, logout, me<br/>→ PostgreSQL"]
            TNCY["Tenancy Module<br/>orgs, facilities, onboard<br/>→ PostgreSQL"]
            PAT["Patients Module<br/>register, search, allergies<br/>→ MongoDB"]
            SCHED["Scheduling Module<br/>schedules, appointments, queue<br/>→ MongoDB + Redis"]
            ENC["Encounters Module<br/>vitals, SOAP, diagnoses, Rx, sign-off<br/>→ MongoDB"]
            BILL["Billing Module<br/>invoices, payments, revenue<br/>→ PostgreSQL"]
            COMM["Communication Module<br/>SMS, email, notifications<br/>→ Twilio + SendGrid"]
        end

        subgraph "Infrastructure"
            PRISMA["Prisma Service<br/>PostgreSQL client"]
            MONGOOSE["Mongo Service<br/>Mongoose connection"]
            REDIS["Redis Module<br/>ioredis pub/sub + cache"]
        end
    end

    JWT --> AUTH
    PERM --> AUTH
    TENANT --> TNCY

    AUTH --> PRISMA
    TNCY --> PRISMA
    BILL --> PRISMA

    PAT --> MONGOOSE
    SCHED --> MONGOOSE
    ENC --> MONGOOSE

    SCHED --> REDIS
    ENC -->|publish events| REDIS
    BILL -->|subscribe events| REDIS
    COMM -->|subscribe events| REDIS
```

---

## 4. C4 Component Diagram (Level 3) — FastAPI AI Sidecar

```mermaid
graph TB
    subgraph "FastAPI AI Sidecar (apps/ai)"
        subgraph "Middleware"
            JWTV["JWT Validator<br/>Shared JWT_SECRET"]
            RATE["Rate Limiter<br/>Redis counter"]
        end

        subgraph "Routers"
            COP["Copilot Router<br/>/ai/copilot/summary<br/>/ai/copilot/differentials<br/>/ai/copilot/investigations"]
        end

        subgraph "Services"
            LLM["LLM Service<br/>OpenAI client<br/>Prompt management"]
            CTX["Context Service<br/>Fetches patient data<br/>from NestJS API"]
            CACHE["Cache Service<br/>Redis response cache"]
        end

        subgraph "Prompts"
            TP["Jinja2 Templates<br/>copilot_summary_v1.j2<br/>copilot_differentials_v1.j2"]
        end
    end

    JWTV --> COP
    RATE --> COP
    COP --> CTX
    COP --> LLM
    COP --> CACHE
    LLM --> TP

    CTX -->|GET /internal/*| NESTJS["NestJS API"]
    LLM -->|Chat completion| OAI["OpenAI API"]
    CACHE --> RD["Redis"]
    RATE --> RD
```

---

## 5. Data Ownership Map

Each NestJS module owns specific data stores. No module crosses data boundaries.

```mermaid
graph LR
    subgraph "PostgreSQL (Prisma)"
        PG_AUTH["users<br/>refresh_tokens"]
        PG_TNCY["organizations<br/>facilities<br/>departments"]
        PG_SCHED["doctor_schedules"]
        PG_BILL["invoices<br/>invoice_items<br/>payments<br/>services<br/>tax_configs"]
        PG_COMM["notification_templates"]
        PG_AUDIT["audit_logs"]
    end

    subgraph "MongoDB (Mongoose)"
        MG_PAT["patients"]
        MG_ENC["encounters"]
        MG_APT["appointments"]
        MG_NOTIF["notification_logs"]
    end

    subgraph "Redis"
        RD_EVT["Event channels<br/>clinics.* billing.* patients.*"]
        RD_QUEUE["Queue state<br/>queue:{facilityId}"]
        RD_SESS["Sessions<br/>session:{userId}"]
        RD_AI["AI cache + rate limits"]
        RD_LOCK["Booking locks<br/>schedule_lock:*"]
    end

    AUTH_MOD["Auth Module"] --> PG_AUTH
    TNCY_MOD["Tenancy Module"] --> PG_TNCY
    PAT_MOD["Patients Module"] --> MG_PAT
    SCHED_MOD["Scheduling Module"] --> MG_APT
    SCHED_MOD --> PG_SCHED
    SCHED_MOD --> RD_QUEUE
    SCHED_MOD --> RD_LOCK
    ENC_MOD["Encounters Module"] --> MG_ENC
    BILL_MOD["Billing Module"] --> PG_BILL
    COMM_MOD["Communication Module"] --> PG_COMM
    COMM_MOD --> MG_NOTIF
```

> **Exception**: The Scheduling module touches both PostgreSQL (doctor_schedules) and MongoDB (appointments). This is intentional — schedules are structured/relational (JOINed with Users), while appointments are document-like (embedded status_history). The module internally uses two repository classes: `sched-pg.repository.ts` and `sched-mongo.repository.ts`.

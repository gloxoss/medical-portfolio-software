# Phase 5 — Data Flow

## MediCore HIS — End-to-End Data Flow Diagrams

---

## 1. Patient Registration Flow

```mermaid
flowchart TD
    A["Receptionist submits<br/>POST /patients"] --> B["NestJS: ValidationPipe<br/>Validate DTO"]
    B --> C{"Validation passed?"}
    C -->|No| D["400 Bad Request<br/>{errors}"]
    C -->|Yes| E["JwtAuthGuard<br/>Extract user from token"]
    E --> F["TenantScope<br/>Inject org_id + facility_id"]
    F --> G["PatientsService<br/>.register()"]
    G --> H["Prisma Transaction:<br/>Increment Organization.mrn_counter"]
    H --> I["Format MRN:<br/>{prefix}-{YYYY}-{counter:05}"]
    I --> J["Mongoose:<br/>Create Patient document<br/>with org_id + MRN"]
    J --> K{"Mongo write success?"}
    K -->|No| L["500 Internal Error<br/>Prisma counter already incremented<br/>(acceptable: gap in MRN sequence)"]
    K -->|Yes| M["AuditInterceptor:<br/>Log patient.created to PG audit_logs"]
    M --> N["Redis: Publish<br/>patients.patient.registered"]
    N --> O["201 Created<br/>{patient with MRN}"]

    style H fill:#FF9800,color:#fff
    style J fill:#4CAF50,color:#fff
```

**Cross-DB note**: MRN counter is in PostgreSQL (atomic increment), patient document is in MongoDB. If Mongo write fails after PG counter increments, we accept a gap in MRN sequence (next registration gets counter+1). This is acceptable — MRN gaps are common in medical systems.

---

## 2. Appointment Booking Flow

```mermaid
flowchart TD
    A["Receptionist submits<br/>POST /appointments"] --> B["Validate DTO:<br/>patient_id, doctor_id, date, slot"]
    B --> C["Check doctor schedule<br/>(PG: doctor_schedules)"]
    C --> D{"Slot within schedule<br/>and not during break?"}
    D -->|No| E["422: Slot not available"]
    D -->|Yes| F["Redis: SET schedule_lock:{doctorId}:{slot}<br/>NX EX 30"]
    F --> G{"Lock acquired?"}
    G -->|No| H["409 Conflict:<br/>Slot being booked by another user"]
    G -->|Yes| I["Mongo: Check no existing<br/>appointment at same doctor+slot"]
    I --> J{"Slot free in DB?"}
    J -->|No| K["409 Conflict:<br/>Slot already booked"]
    J -->|Yes| L["Mongo: Create appointment<br/>status: 'booked'"]
    L --> M["Redis: DELETE lock"]
    M --> N["Redis: Publish<br/>clinics.appointment.confirmed"]
    N --> O["Communication subscriber:<br/>Send SMS via Twilio"]
    O --> P["201 Created<br/>{appointment}"]

    style F fill:#FF9800,color:#fff
    style L fill:#4CAF50,color:#fff
```

**Double-booking prevention**: The Redis lock (30-second TTL, NX flag) ensures that even under concurrent requests, only one booking for a given doctor+slot can proceed at a time. The lock is deleted immediately after the Mongo write succeeds. If the process crashes mid-booking, the lock auto-expires after 30 seconds.

---

## 3. Encounter Sign-Off Flow (Most Complex)

```mermaid
flowchart TD
    A["Doctor clicks Sign Off<br/>POST /encounters/:id/sign-off"] --> B["Validate: SOAP.assessment<br/>is non-empty"]
    B --> C{"Assessment present?"}
    C -->|No| D["422: Assessment required"]
    C -->|Yes| E["Mongo: Update encounter<br/>status → signed_off<br/>signed_off_at, signed_off_by"]
    E --> F["Redis: Publish<br/>clinics.encounter.signed_off"]

    F --> G["Billing Subscriber<br/>(async)"]
    F --> H["Communication Subscriber<br/>(async)"]
    F --> I{"Has prescriptions?"}

    G --> G1["Fetch services catalog<br/>(PG: services)"]
    G1 --> G2["Prisma Transaction:<br/>Create Invoice + InvoiceItems"]
    G2 --> G3["Mongo: Update encounter<br/>set invoice_id"]
    G3 --> G4["Redis: Publish<br/>billing.invoice.created"]

    I -->|Yes| J["Redis: Publish<br/>clinics.prescription.issued"]
    I -->|No| K["No Rx event"]

    J --> J1["(Phase 2: Pharmacy subscriber)"]

    H --> H1["Log notification_logs<br/>(Mongo)"]

    E --> L["200 OK<br/>{encounter, invoice_id}"]

    style E fill:#4CAF50,color:#fff
    style G2 fill:#FF9800,color:#fff
    style G3 fill:#FF9800,color:#fff
```

**Cross-DB consistency**: The sign-off creates data in both MongoDB (encounter status) and PostgreSQL (invoice). The outbox pattern ensures:
1. Encounter updated in Mongo (source of truth for clinical data)
2. Event published to Redis
3. Billing subscriber creates invoice in PG
4. Billing subscriber updates encounter in Mongo with `invoice_id` back-reference
5. If step 4 fails: retry up to 3× via Redis retry queue
6. If all retries fail: alert logged, manual review flag set

---

## 4. AI Copilot Request Flow

```mermaid
flowchart TD
    A["Doctor clicks 'AI Expand'<br/>or sidebar loads"] --> B["Frontend: POST /api/v1/ai/copilot/summary<br/>{patient_id, encounter_id}"]
    B --> C["NestJS: Forward to FastAPI<br/>POST :8000/ai/copilot/summary<br/>Pass JWT in header"]
    C --> D["FastAPI: Validate JWT<br/>(shared JWT_SECRET)"]
    D --> E{"Valid token?"}
    E -->|No| F["401 Unauthorized"]
    E -->|Yes| G["Redis: Check rate limit<br/>INCR ai_rate:{userId}"]
    G --> H{"Under 20/hour?"}
    H -->|No| I["429 Too Many Requests"]
    H -->|Yes| J["Redis: Check cache<br/>GET ai_cache:{hash(prompt+context)}"]
    J --> K{"Cache hit?"}
    K -->|Yes| L["Return cached response"]
    K -->|No| M["FastAPI → NestJS:<br/>GET /internal/patients/:id/context<br/>X-Internal-Service-Key header"]
    M --> N["NestJS: Fetch from Mongo<br/>Patient + last 3 encounters"]
    N --> O["Return patient context JSON"]
    O --> P["FastAPI: Build prompt<br/>(Jinja2 template + context)"]
    P --> Q["FastAPI → OpenAI:<br/>Chat completion<br/>Model: GPT-4o-mini"]
    Q --> R["OpenAI returns response"]
    R --> S["FastAPI: Parse + structure<br/>JSON response"]
    S --> T["Redis: Cache response<br/>SET ai_cache:{hash} EX 3600"]
    T --> U["Return to NestJS → Frontend"]

    style Q fill:#9C27B0,color:#fff
    style T fill:#FF9800,color:#fff
```

**Key design rules**:
- FastAPI NEVER touches databases directly — all context comes from NestJS internal API
- Rate limiting happens BEFORE the expensive OpenAI call
- Cache key is a hash of (prompt template version + patient_id + encounter context hash) — ensures clinically relevant changes bust the cache
- OpenAI model fallback: if GPT-4o-mini fails, retry once with GPT-4o. If both fail, return graceful error to frontend

---

## 5. SSE Queue Update Flow

```mermaid
flowchart TD
    A["Receptionist clicks 'Check In'<br/>PATCH /appointments/:id/status"] --> B["Mongo: Update appointment<br/>status → checked_in<br/>queue_token = 'T-042'"]
    B --> C["Redis: ZADD queue:{facilityId}<br/>score=timestamp, member=token:name"]
    C --> D["Redis: Publish<br/>clinics.appointment.checked_in"]
    D --> E["NestJS SSE Controller<br/>receives event"]
    E --> F["Push to all connected<br/>SSE clients for this facilityId"]

    G["Queue Display TV<br/>EventSource connection"] --> H["Receives SSE event"]
    H --> I["DOM update:<br/>New token appears on screen"]

    J["Ops Queue Screen<br/>EventSource connection"] --> K["Receives SSE event"]
    K --> L["React state update:<br/>Patient row moves to 'Checked In'"]

    style C fill:#FF9800,color:#fff
    style F fill:#4CAF50,color:#fff
```

**SSE architecture**: NestJS uses `@Sse()` decorator with Redis subscriber. Each connected client specifies their `facilityId`. The SSE controller filters events and only pushes to clients watching the relevant facility. The public queue display (`/queue-display/:facilityId`) uses the same SSE stream but requires no authentication.

---

## 6. End-to-End Data Flow Summary

```mermaid
flowchart LR
    subgraph "User Input"
        UI["Browser<br/>(Next.js)"]
    end

    subgraph "API Layer"
        NEST["NestJS<br/>Validation → Guards →<br/>Service → Repository"]
        FAST["FastAPI<br/>JWT → Rate Limit →<br/>Context → AI → Cache"]
    end

    subgraph "Event Layer"
        REDIS_PUB["Redis Pub/Sub"]
    end

    subgraph "Storage"
        PG["PostgreSQL<br/>(Prisma)"]
        MONGO["MongoDB<br/>(Mongoose)"]
        REDIS_DATA["Redis<br/>(Cache/Queue)"]
        R2["Cloudflare R2<br/>(Files)"]
    end

    subgraph "External"
        OPENAI["OpenAI"]
        TWILIO["Twilio"]
        SENDGRID["SendGrid"]
        STRIPE["Stripe"]
    end

    UI -->|REST + SSE| NEST
    NEST -->|HTTP + JWT| FAST
    NEST --> PG
    NEST --> MONGO
    NEST --> REDIS_PUB
    NEST --> REDIS_DATA
    NEST --> R2
    FAST --> REDIS_DATA
    FAST --> OPENAI
    REDIS_PUB --> NEST
    NEST --> TWILIO
    NEST --> SENDGRID
    NEST --> STRIPE
    STRIPE -->|Webhooks| NEST
```

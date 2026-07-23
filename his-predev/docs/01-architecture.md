# 01 — Architecture
### NestJS + PostgreSQL + MongoDB + Redis + FastAPI (AI)

---

## System overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER LAYER                                 │
│  Doctor │ Nurse │ Receptionist │ Admin │ Patient │ Lab │ Pharmacist │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS
┌──────────────────────────────▼──────────────────────────────────────┐
│                Next.js 14 App Router — Vercel                       │
│   (admin) (clinical) (ops) (patient) (lab) (radiology) (pharmacy)   │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST / JSON / SSE
              ┌────────────────┴────────────────────┐
              │                                     │
┌─────────────▼──────────────┐     ┌───────────────▼────────────────┐
│  NestJS — Main Backend     │     │  FastAPI — AI Microservice      │
│  Railway · Port 3001       │     │  Railway · Port 8000            │
│                            │     │                                 │
│  Modules:                  │     │  /ai/copilot/summary            │
│  auth · tenancy · patients │     │  /ai/copilot/differentials      │
│  clinics · labs · billing  │     │  /ai/copilot/investigations     │
│  pharmacy · radiology      │     │  /ai/triage/message             │
│  communication · hr        │     │  /ai/imaging/analyze            │
│  inventory · automation    │     │  /ai/documents/summarize        │
│                            │     │                                 │
│  TypeScript · Prisma ORM   │     │  Python · Pydantic · LangChain  │
└──────┬─────────────────────┘     └───────────────┬────────────────┘
       │                                           │
       │                                    ┌──────▼──────┐
       │                                    │  OpenAI API │
       │                                    │  GPT-4o     │
       │                                    └─────────────┘
       │
┌──────▼──────────────────────────────────────────────────┐
│                  REDIS (Railway)                         │
│  Event bus (pub/sub) · Session cache · Queue state       │
│  Rate limiting · AI response cache · SSE broadcast       │
└──────┬──────────────────────────────────────────────────┘
       │
┌──────┴──────────────────────────────────────────────────┐
│                  DATA LAYER                              │
│                                                         │
│  ┌─────────────────────┐    ┌────────────────────────┐  │
│  │  PostgreSQL (Atlas) │    │   MongoDB (Atlas)      │  │
│  │                     │    │                        │  │
│  │  Structured data:   │    │  Document data:        │  │
│  │  • users & auth     │    │  • patients            │  │
│  │  • organizations    │    │  • encounters (EMR)    │  │
│  │  • facilities       │    │  • appointments        │  │
│  │  • invoices         │    │  • prescriptions       │  │
│  │  • payments         │    │  • lab orders/results  │  │
│  │  • services catalog │    │  • radiology reports   │  │
│  │  • drug catalog     │    │  • notification logs   │  │
│  │  • staff/HR         │    │  • ai_sessions         │  │
│  │  • audit logs       │    │  • automation rules    │  │
│  └─────────────────────┘    └────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## Why two backends?

NestJS handles structured, transactional business logic where TypeScript types and relational integrity matter. FastAPI handles AI/ML where Python's ecosystem (LangChain, LlamaIndex, Transformers, NumPy) is irreplaceable.

They communicate via:
1. **NestJS → FastAPI**: HTTP calls for AI features (copilot, triage, imaging)
2. **FastAPI → Redis**: FastAPI publishes events when AI analysis is complete
3. **Shared Redis**: Both services subscribe to the same event bus

The AI service is stateless — it reads from Redis context but writes nothing to the databases directly.

---

## NestJS backend structure

```
apps/api/                           ← NestJS app
├── src/
│   ├── main.ts                     ← Bootstrap, global pipes, CORS
│   ├── app.module.ts               ← Root module — imports all domain modules
│   ├── config/
│   │   ├── configuration.ts        ← Typed config from env vars
│   │   └── database.config.ts      ← PG + Mongo connection configs
│   ├── common/
│   │   ├── decorators/             ← @CurrentUser, @Permissions, @TenantScope
│   │   ├── guards/                 ← JwtAuthGuard, PermissionsGuard
│   │   ├── interceptors/           ← LoggingInterceptor, AuditInterceptor
│   │   ├── filters/                ← GlobalExceptionFilter
│   │   └── pipes/                  ← ValidationPipe config
│   ├── prisma/
│   │   └── prisma.service.ts       ← Prisma client singleton
│   ├── mongo/
│   │   └── mongo.service.ts        ← Mongoose connection singleton
│   └── modules/
│       ├── auth/                   ← JWT, refresh, RBAC
│       ├── tenancy/                ← Orgs, facilities, settings
│       ├── patients/               ← Patient CRUD, MRN, search
│       ├── clinics/                ← Appointments, encounters, prescriptions
│       ├── labs/                   ← Lab orders, results
│       ├── radiology/              ← Radiology orders, PACS bridge (Phase 2)
│       ├── pharmacy/               ← Drug catalog, dispensing
│       ├── billing/                ← Invoices, payments
│       ├── communication/          ← SMS, email, push
│       ├── hr/                     ← Staff, attendance (Phase 3)
│       ├── inventory/              ← Stock, procurement (Phase 2/3)
│       └── automation/             ← Rules engine (Phase 3)
└── prisma/
    └── schema.prisma               ← Single Prisma schema for all PG tables
```

### NestJS module anatomy (every module follows this pattern)

```
modules/clinics/
├── clinics.module.ts          ← Module definition, imports, providers
├── clinics.controller.ts      ← Route handlers, DTOs, guards
├── clinics.service.ts         ← Business logic, calls repositories
├── clinics-pg.repository.ts   ← Prisma queries (if module touches PG)
├── clinics-mongo.repository.ts← Mongoose queries (if module touches Mongo)
├── clinics.events.ts          ← Redis events this module publishes/subscribes
├── dto/
│   ├── create-appointment.dto.ts
│   └── update-encounter.dto.ts
└── schemas/
    └── encounter.schema.ts    ← Mongoose schema definition
```

---

## FastAPI AI service structure

```
apps/ai/                            ← FastAPI app (Python)
├── main.py                         ← FastAPI app, CORS, health check
├── config.py                       ← Settings (OpenAI key, Redis URL)
├── dependencies.py                 ← Auth validation (validates NestJS JWT)
├── routers/
│   ├── copilot.py                  ← Clinical copilot endpoints
│   ├── triage.py                   ← Patient triage chatbot
│   ├── imaging.py                  ← Imaging AI (Phase 2)
│   └── documents.py                ← Discharge summary, reports
├── services/
│   ├── llm_service.py              ← OpenAI client, prompt management
│   ├── context_service.py          ← Fetches patient context from NestJS API
│   └── triage_state.py             ← Triage conversation state machine
├── prompts/                        ← Jinja2 prompt templates (versioned)
│   ├── copilot_summary_v1.j2
│   ├── copilot_differentials_v1.j2
│   └── triage_v1.j2
└── requirements.txt
```

**Key design rule**: The AI service never talks to PostgreSQL or MongoDB directly. It calls NestJS API endpoints to fetch patient context. This keeps the data access layer clean and the AI service truly stateless.

---

## Tenancy model

Every row in PostgreSQL and every document in MongoDB that stores operational data MUST carry `org_id` and `facility_id`. No exceptions.

```
Organization
  └── Facility (1..N per org)
        └── Department (optional, hospital tier)
              └── All operational data
```

### PostgreSQL tenancy enforcement
Prisma middleware injects `org_id` into every query automatically. Set in `prisma.service.ts`:

```typescript
prisma.$use(async (params, next) => {
  const tenantContext = getTenantContext() // from AsyncLocalStorage
  if (tenantContext && TENANT_SCOPED_MODELS.includes(params.model)) {
    params.args.where = { ...params.args.where, org_id: tenantContext.orgId }
  }
  return next(params)
})
```

### MongoDB tenancy enforcement
NestJS guard injects org_id + facility_id into request. Repository layer always includes them in queries:

```typescript
// In any Mongo repository method:
return this.patientModel.find({
  org_id: new Types.ObjectId(context.orgId),
  facility_id: new Types.ObjectId(context.facilityId),
  ...filters,
})
```

---

## Event bus (Redis)

Both NestJS and FastAPI use the same Redis instance for events.

### NestJS publishes events

```typescript
// In clinics.events.ts
@Injectable()
export class ClinicsEventPublisher {
  constructor(@Inject(REDIS_CLIENT) private redis: Redis) {}

  async encounterSignedOff(payload: EncounterSignedOffPayload) {
    await this.redis.publish('clinics.encounter.signed_off', JSON.stringify({
      event: 'clinics.encounter.signed_off',
      org_id: payload.orgId,
      facility_id: payload.facilityId,
      actor_id: payload.doctorId,
      timestamp: new Date().toISOString(),
      payload,
    }))
  }
}
```

### NestJS subscribes to events

```typescript
// In billing.module.ts — subscribes to encounter sign-off
@Injectable()
export class BillingEventSubscriber implements OnModuleInit {
  onModuleInit() {
    this.redis.subscribe('clinics.encounter.signed_off')
    this.redis.on('message', (channel, message) => {
      if (channel === 'clinics.encounter.signed_off') {
        const event = JSON.parse(message)
        this.billingService.createInvoiceFromEncounter(event.payload)
      }
    })
  }
}
```

---

## Authentication flow

```
1. POST /auth/login (NestJS)
   → validate email + password (PG: users table)
   → return { access_token (15min JWT), refresh_token (7d, HttpOnly cookie) }

2. All subsequent requests:
   → Authorization: Bearer <access_token>
   → JwtAuthGuard validates token
   → PermissionsGuard checks required permission
   → TenantScope decorator injects org_id + facility_id into handler

3. Token refresh:
   → POST /auth/refresh (sends HttpOnly cookie automatically)
   → NestJS validates refresh token (stored in PG: refresh_tokens)
   → Returns new access_token

4. AI service auth:
   → FastAPI receives the same JWT from the request
   → Validates it (shared JWT_SECRET) — no separate auth system
   → Extracts user context to fetch relevant patient data from NestJS API
```

---

## Deployment architecture

| Service | Platform | Tier | Monthly cost |
|---|---|---|---|
| Next.js frontend | Vercel | Hobby (free) | $0 |
| NestJS API | Railway | Starter | $5 |
| FastAPI AI | Railway | Starter | $5 |
| PostgreSQL | Railway (Postgres plugin) | 1GB | $5 |
| MongoDB | Atlas | M0 free → M10 | $0 → $57 |
| Redis | Railway (Redis plugin) | 256MB | $5 |
| File storage | Cloudflare R2 | Free 10GB | $0 |
| **Total (dev)** | | | **~$20/mo** |
| **Total (prod)** | | | **~$77/mo** |

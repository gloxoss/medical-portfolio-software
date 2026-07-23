# PLAN-lab-and-portal

# PART A: Step 16 — Lab Module (Build First, Portal depends on it)

## Module Goal
Enable doctors to place lab orders from the Encounter Workspace (PG-040), lab technicians to record results, and results to surface in the Patient Timeline and Portal.

## Data Architecture Decision
- PostgreSQL table `lab_orders`: id, patient_id, encounter_id, org_id, facility_id, ordered_by (doctor_id), panel_code, status, ordered_at, resulted_at, tenant scope columns
- MongoDB collection `lab_results`: { order_id, panel_code, components: [{ name, value, unit, ref_range_low, ref_range_high, flag: 'normal'|'low'|'high'|'critical' }], freetext_note, resulted_by, resulted_at, org_id }
- `panel_code` is the shared FK between the two stores. Strict TypeScript interfaces in `packages/shared-types/src/lab.ts` enforce the contract at compile time.

## Dependency Graph
```text
T1 (Shared Types) → T2 (PG Entity + Migration) → T3 (Mongo Schema + Repo)
                                                 ↓
T4 (Lab Service) → T5 (Lab Controller) → T6 (API Client) → T7 (Hook)
                                         ↓                 ↓
      T8 (Order Panel — Doctor UI)                 T9 (Results Entry — Lab Tech UI)
                                         ↓
      T10 (Results Display — Patient Timeline + Portal)
```

## Tasks

- [ ] **T1: Shared Types**
  **File:** `packages/shared-types/src/lab.ts`
  **What:** Define `LabOrder`, `LabResult`, `LabComponent`, `LabStatus`, `LabFlag` TypeScript interfaces shared between `apps/api` and `apps/web`. No `any`. Export from `packages/shared-types/src/index.ts`.
  **Key types to define:**
  - `LabStatus`: `'pending' | 'collected' | 'in_progress' | 'completed' | 'cancelled'`
  - `LabFlag`: `'normal' | 'low' | 'high' | 'critical'`
  - `LabComponent`: `{ name: string; value: number | string; unit: string; refRangeLow?: number; refRangeHigh?: number; flag: LabFlag }`
  - `LabResult`: `{ orderId: string; panelCode: string; components: LabComponent[]; freetextNote?: string; resultedBy: string; resultedAt: Date; orgId: string }`
  - `LabOrder`: Full PostgreSQL-backed shape with all tenant scope columns
  **Done When:** `npx tsc --noEmit` passes across all packages consuming shared-types.

- [ ] **T2: Lab Order PostgreSQL Entity + Migration**
  **Files:**
  - `apps/api/src/modules/lab/entities/lab-order.entity.ts`
  - `apps/api/database/migrations/XXXX-create-lab-orders.ts`
  **What:** TypeORM entity matching the PostgreSQL schema above. Tenant-scoped.
  Relations: `ManyToOne` → Patient, Encounter, User (ordered_by).
  Migration must be reversible (`up` + `down`).
  **Columns:** id (uuid), patient_id, encounter_id, org_id, facility_id, ordered_by, panel_code (FK to a future `lab_panels` lookup table — use string for now), status (enum), ordered_at (timestamptz), resulted_at (timestamptz nullable), created_at, updated_at.
  **Done When:** Migration runs cleanly. `npx tsc --noEmit` passes.

- [ ] **T3: Lab Result MongoDB Schema + Repository**
  **Files:**
  - `apps/api/src/modules/lab/schemas/lab-result.schema.ts` (Mongoose)
  - `apps/api/src/modules/lab/repositories/lab-result.repository.ts`
  **What:** Mongoose schema for `lab_results` collection. Strict validation via class-validator decorators ON the DTO layer (not the Mongoose schema — schema stays loose, TypeScript + DTO is the guard).
  Repository methods: `create(result: CreateLabResultDto)`, `findByOrderId(orderId: string)`, `findByPatientId(patientId: string, orgId: string)`.
  **Critical:** Every method must receive `orgId` for tenant isolation — Mongo has no built-in RLS so the WHERE equivalent must be in every query.
  **Done When:** Repository unit test (`lab-result.repository.spec.ts`) passes 3 tests: create, findByOrderId, cross-tenant isolation (returns null for wrong orgId).

- [ ] **T4: Lab Service**
  **File:** `apps/api/src/modules/lab/lab.service.ts`
  **What:** Business logic layer. Methods:
  - `placeOrder(tenant, dto: PlaceLabOrderDto): Promise<Result<LabOrder>>`
    → Validates encounter is `in_progress` (not `signed_off`) before allowing orders
    → Publishes `lab.order.placed` Redis event
  - `updateStatus(tenant, orderId, status: LabStatus): Promise<Result<LabOrder>>`
    → Enforces state machine: `pending → collected → in_progress → completed`
    → Blocks backwards transitions (cannot go `completed → pending`)
  - `recordResult(tenant, orderId, dto: RecordLabResultDto): Promise<Result<LabResult>>`
    → Validates `orderId` belongs to tenant before writing to Mongo
    → Sets `resulted_at` on PG row, transitions status to `completed`
    → Publishes `lab.result.ready` Redis event (patient portal notification)
  - `getResultsForPatient(tenant, patientId): Promise<LabResult[]>`
  **State machine enforcement:** Use the same pattern as Encounter state machine (code-quality-patterns.md §12).
  **Done When:** Unit tests pass — 6 tests covering happy path + invalid transitions + cross-tenant rejection.

- [ ] **T5: Lab Controller**
  **File:** `apps/api/src/modules/lab/lab.controller.ts`
  **Routes:**
  - `POST /lab/orders` → `placeOrder` — Guards: `JwtAuthGuard`, `Roles(DOCTOR, NURSE)`
  - `GET /lab/orders?patientId=&encounterId=` → list orders for encounter — `Roles(DOCTOR, NURSE, LAB_TECH)`
  - `PATCH /lab/orders/:id/status` → `updateStatus` — `Roles(LAB_TECH)`
  - `POST /lab/orders/:id/result` → `recordResult` — `Roles(LAB_TECH)`
  - `GET /lab/orders/:id/result` → fetch result — `Roles(DOCTOR, NURSE, LAB_TECH)`
  - `GET /lab/patients/:patientId/results` → patient history — `Roles(DOCTOR, NURSE)`
  All routes: `TenantScoped` decorator, `AuditLogInterceptor` on state-changing routes.
  **Done When:** Integration tests with Supertest pass — all 6 routes return correct status codes. 401 without token. 403 for wrong role. 404 for cross-tenant resource.

- [ ] **T6: Lab API Client (Frontend)**
  **File:** `apps/web/src/lib/api/lab.api.ts`
  **What:** Typed Axios wrapper matching all 6 controller routes exactly.
  Export `labApi` object with: `placeOrder`, `listOrders`, `updateStatus`, `recordResult`, `getResult`, `getPatientResults`.
  All methods use `apiClient` (with token interceptor) from `lib/api/client.ts`.
  **Done When:** TypeScript compiles. All return types match `packages/shared-types/src/lab.ts`.

- [ ] **T7: Lab React Query Hooks**
  **File:** `apps/web/src/lib/hooks/useLab.ts`
  **What:**
  - `labKeys` query key factory (same pattern as `patientKeys`)
  - `useLabOrders(encounterId)` → `useQuery`
  - `usePlaceOrder()` → `useMutation` with `onSuccess` invalidating `labKeys.byEncounter(id)`
  - `useRecordResult(orderId)` → `useMutation` with `onSuccess` invalidating patient timeline
  - `useLabResults(patientId)` → `useQuery`, `staleTime: 60_000`
  **Done When:** Hook tests pass using MSW. `usePlaceOrder` optimistic update rolls back on error (pattern from code-quality-patterns.md §7).

- [ ] **T8: Lab Order Panel — Doctor UI (PG-040 Extension)**
  **File:** `apps/web/src/components/encounters/LabOrderPanel.tsx`
  **What:** Component rendered inside `EncounterLayout.Main` below `RxWriter`.
  - Panel catalog dropdown: list of `panel_code` values (static list for Phase 1, e.g. CBC, BMP, LFT, Urinalysis, HbA1c, Lipid Panel, TSH, Coagulation, Blood Culture)
  - "Order Lab" button → `usePlaceOrder()` mutation
  - Ordered labs list: renders `StatusBadge` per order status
  - Locked when `encounter.status === 'signed_off'` (same read-only pattern as PG-043)
  - Empty state: "No lab orders for this encounter" with lab tube icon
  **Done When:** Doctor can order a lab from the encounter. Order appears with `pending` badge. Component is read-only after sign-off.

- [ ] **T9: Results Entry — Lab Tech UI**
  **New Route:** `apps/web/src/app/(lab)/orders/[id]/result/page.tsx`
  **File:** `apps/web/src/components/lab/ResultEntryForm.tsx`
  **What:**
  - Server Component fetches order by ID
  - Renders dynamic component fields based on `panel_code` (map of panel → expected components)
    e.g. CBC panel renders: WBC, RBC, Hemoglobin, Hematocrit, Platelets input fields
    Biopsy panel renders: single `<textarea>` for freetext result
  - Each numeric field: value input + unit (read-only from panel config) + auto-flag calculation: if value < ref_range_low → `low`, > ref_range_high → `high`
  - `flag: 'critical'` manually selectable via checkbox override
  - React Hook Form + Zod validation
  - `useRecordResult(orderId)` mutation on submit
  - Status update to `completed` happens server-side in `recordResult` service method
  **Done When:** Lab tech can enter CBC values. Flags auto-calculate. Submission updates PG status to `completed` and writes Mongo result document.

- [ ] **T10: Results Display — Patient Timeline + Portal**
  **Modified Files:**
  - `apps/web/src/components/patients/PatientTimeline.tsx` — add `LabResultCard` to timeline
  **New Files:**
  - `apps/web/src/components/lab/LabResultCard.tsx`
  - `apps/web/src/components/lab/LabResultTable.tsx` (for portal use)
  **What:**
  - Compact timeline card: panel name, date, ordered by, status badge
  - Expandable: click reveals `LabResultTable` with all components
  - Flag coloring: `normal` → `--status-success`, `low/high` → `--status-warning`, `critical` → `--status-danger` with pulsing indicator
  - Freetext results render in a `<pre>` block with monospace font
  **Done When:** CBC result with flagged Hemoglobin renders correctly in Patient Timeline. Critical flag shows pulsing danger indicator.

---

# PART B: Step 15 — Patient Portal (Phase 2)

## Module Goal
Authenticated patient-facing portal: view encounters, download invoices, pay online via Stripe Checkout, toggle AI consent, and view lab results.

## Auth Strategy
- Separate JWT audience: `aud: 'patient-portal'` — patients cannot hit clinical API routes
- Portal routes live under `apps/web/src/app/(portal)/` route group
- Separate middleware: `apps/web/src/middleware.ts` must route `(portal)` to portal JWT guard
- Patients authenticate via OTP on registered phone number (no password) — see PRD

## Dependency Graph
```text
T1 (Portal Auth) → T2 (Portal Layout) → T3 (Encounter History)
                                      → T4 (Invoice View + Stripe)
                                      → T5 (Lab Results View)
                                      → T6 (AI Consent Toggle)
```

## Tasks

- [ ] **T1: Portal Authentication**
  **Files:**
  - `apps/api/src/modules/auth/portal-auth.service.ts`
  - `apps/api/src/modules/auth/portal-auth.controller.ts`
  - `apps/web/src/app/(portal)/login/page.tsx`
  **What:**
  - `POST /portal/auth/otp/request` — sends OTP to patient phone (SMS via org-configured provider — env var `SMS_PROVIDER_URL`, not hardcoded)
  - `POST /portal/auth/otp/verify` — validates OTP, issues JWT with `aud: 'patient-portal'`, `sub: patient_id`, `orgId`, 24h expiry
  - Frontend: phone input → OTP input (6-digit) → redirect to `/portal/dashboard`
  - No password. No email. Phone OTP only.
  - Rate limit: max 3 OTP requests per phone per 10 minutes (Redis counter)
  **Done When:** Patient can log in via OTP. JWT has correct audience claim. Wrong OTP returns 401. Expired OTP (5 min TTL) returns 410.

- [ ] **T2: Portal Layout Shell**
  **Files:**
  - `apps/web/src/app/(portal)/layout.tsx`
  - `apps/web/src/components/portal/PortalShell.tsx`
  **What:**
  - Minimal patient-facing shell — NOT the clinical sidebar layout
  - Top nav: MediCore logo, patient name, logout button
  - Bottom tab bar on mobile: Home, Encounters, Labs, Invoices, Profile
  - Sidebar on desktop: same 5 sections as tabs
  - GDPR/HIPAA consent banner on first login (session flag, not localStorage — sandboxed). Banner must require affirmative click before portal content is accessible
  **Done When:** Portal layout renders. Clinical components are NOT importable in portal routes (enforce via barrel export boundaries — portal cannot import from `components/encounters/`).

- [ ] **T3: Encounter History**
  **File:** `apps/web/src/app/(portal)/encounters/page.tsx`
  **What:**
  - `GET /portal/encounters?patientId=` — portal-specific endpoint returning ONLY `signed_off` encounters (never `draft` or `in_progress` — patients cannot see encounters in progress)
  - List view: date, doctor name, chief complaint, status badge
  - Detail view: `/portal/encounters/[id]` — full read-only SOAP + diagnoses + prescriptions (same read-only rendering as PG-043 locked state, reusing `SoapField` component)
  - Empty state: "No encounter records yet"
  **Done When:** Patient sees only signed-off encounters. In-progress encounters are invisible. Detail page is fully read-only.

- [ ] **T4: Invoice View + Stripe Checkout Payment**
  **Files:**
  - `apps/web/src/app/(portal)/invoices/page.tsx`, `apps/web/src/app/(portal)/invoices/[id]/page.tsx`, `apps/web/src/app/(portal)/invoices/[id]/success/page.tsx`
  - `apps/api/src/modules/billing/portal-payment.controller.ts`
  **Backend:**
  - `POST /portal/billing/invoices/:id/checkout` — Guards: portal JWT only. Creates Stripe Checkout Session:
    ```
    mode: 'payment'
    line_items: invoice line items mapped to Stripe format
    success_url: ${PORTAL_URL}/portal/invoices/{id}/success?session_id={CHECKOUT_SESSION_ID}
    cancel_url: ${PORTAL_URL}/portal/invoices/{id}
    metadata: { invoiceId, orgId, patientId }
    ```
  - `POST /portal/billing/webhooks/stripe` — Stripe webhook endpoint (no JWT guard, Stripe signature verification via `stripe.webhooks.constructEvent`).
  **Frontend invoice list:**
  - Invoice cards: date, amount (MAD), status badge, "Pay Now" button
  - `draft` invoices: show "Pending" — no pay button (patient cannot pay unfinalized invoices)
  - `paid` invoices: show receipt download button (`GET /portal/billing/invoices/:id/receipt`)
  **Success page (`/portal/invoices/[id]/success`):**
  - Verify payment on server side via `stripe.checkout.sessions.retrieve(session_id)`
  - Display: "Payment confirmed ✓" + invoice summary + "Download Receipt" button
  **Done When:** Patient can click "Pay Now", complete Stripe Checkout, return to success page, and see invoice status updated to `paid`.

- [ ] **T5: Lab Results in Portal**
  **File:** `apps/web/src/app/(portal)/labs/page.tsx`
  **What:**
  - Calls `GET /portal/lab/results?patientId=` — portal-scoped endpoint (returns only `completed` results)
  - Reuses `LabResultTable` component from Lab Module T10
  - Critical flags: show prominent warning banner — "One or more results require your doctor's attention. Please contact your clinic."
  - NO interpretation text — portal never suggests diagnosis. Display raw values only.
  - PDF download: `GET /portal/lab/results/:orderId/pdf` (Puppeteer-generated on backend)
  **Done When:** Patient sees completed lab results. Critical flags trigger warning banner. In-progress results are invisible.

- [ ] **T6: AI Consent Toggle**
  **File:** `apps/web/src/app/(portal)/profile/page.tsx`
  **What:**
  - AI Ambient Audio Consent section in patient profile. Default state: OPT-IN = false
  - Toggle UI: `<Switch>` component with clear label + Expandable "What does this mean?"
  - Consent record stored in PostgreSQL `patient_consents` table:
    `{ patient_id, org_id, consent_type: 'ai_ambient_audio', granted: boolean, granted_at, revoked_at, ip_address, user_agent }`
  - `PATCH /portal/patients/:id/consent` endpoint — logs every change
  **Compliance requirements (non-negotiable):**
  - Consent cannot be granted by a pre-checked box
  - Revocation must be instant and must publish `consent.revoked` Redis event
  - Consent record must be exportable (GDPR Right of Access)
  **Done When:** Toggle defaults to OFF. Toggling ON creates a `patient_consents` record. Encounter Workspace shows correct consent badge.

---

# Cross-Cutting Architecture Rules (Both Modules)

## Security Checklist (enforce on EVERY new endpoint)
- [ ] Portal endpoints use `aud: 'patient-portal'` JWT guard — clinical guards reject portal tokens
- [ ] Lab endpoints use `aud: 'clinical'` JWT guard — portal tokens cannot hit lab admin routes
- [ ] Every MongoDB query includes `orgId` filter (no built-in RLS)
- [ ] Stripe webhook uses `stripe.webhooks.constructEvent` signature verification — raw body required
- [ ] OTP rate limiting: Redis counter, max 3 per 10 min per phone
- [ ] Lab results visible to patients ONLY when `status === 'completed'`
- [ ] Encounters visible to patients ONLY when `status === 'signed_off'`
- [ ] AI consent changes audited with IP + user agent in `patient_consents` table

## Event Map (Redis PubSub channels)
| Event | Publisher | Subscribers |
|---|---|---|
| `lab.order.placed` | LabService | Notification → Lab Tech dashboard |
| `lab.result.ready` | LabService | Patient portal notification |
| `invoice.paid` | Stripe webhook handler | BillingService (mark paid), PatientPortal |
| `consent.revoked` | ConsentService | AI Sidecar (stop processing) |

## Stripe Environment Variables (never hardcode)
```shell
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY= # Frontend only
PORTAL_URL=             # For success/cancel redirect URLs
```

## MongoDB Collections (Lab Module)
`lab_results` — `{ orderId, panelCode, components[], freetextNote, resultedBy, resultedAt, orgId }`
Index: `{ orgId: 1, orderId: 1 }` (compound, for tenant-isolated lookups)

## PostgreSQL Tables (New)
`lab_orders` — tenant-scoped, relations to patients/encounters/users
`patient_consents` — consent audit trail, never deleted (GDPR audit requirement)

---

## Done When (Global — Both Steps)
### Lab Module (Step 16)
- [ ] Doctor can place a lab order from PG-040 Encounter Workspace
- [ ] Lab tech can record CBC results with auto-flagging
- [ ] Critical results show pulsing danger indicator in Patient Timeline
- [ ] Lab orders are read-only after encounter sign-off (PG-043 lock respected)
- [ ] Cross-tenant isolation verified: lab result from Org A is 404 for Org B request
- [ ] `lab.result.ready` Redis event fires on result submission
- [ ] 14 tests passing (T2–T5 unit + T5 integration)

### Patient Portal (Step 15)
- [ ] Patient can log in via phone OTP (wrong OTP = 401, expired = 410)
- [ ] Patient sees ONLY signed-off encounters (in-progress encounters invisible)
- [ ] Patient can pay invoice via Stripe Checkout and return to success page
- [ ] Stripe webhook independently marks invoice paid (browser-close edge case handled)
- [ ] Lab results show with correct flag colors; critical results show warning banner
- [ ] AI consent toggle defaults to OFF; toggling creates audit record
- [ ] Portal JWT cannot access clinical routes (403 on attempt)
- [ ] Clinical JWT cannot access portal routes (403 on attempt)
- [ ] CHANGELOG.md updated with Steps 15 + 16 entries

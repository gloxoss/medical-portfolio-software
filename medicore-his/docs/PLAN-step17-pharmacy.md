# MediCore HIS - Step 17 Pharmacy Module (Enhanced Execution Plan)
> Plan updated: 2026-04-11
> Workflow: medicore-his-dev Socratic Gate -> Micro-Blueprint -> TDD -> Adversarial Validation
> Scope: Blueprint Step 17 only (Pharmacy)

---

## 1) Resolved Decisions (Socratic Gate)

| Decision | Choice | Rationale |
|---|---|---|
| P0 Drug catalog source | Pre-seeded | Better day-1 usability for Rx and pharmacy queue demos.
| P1 Dispense billing mode | Merge into encounter invoice when available, fallback to standalone invoice | Unified patient billing while still supporting walk-ins.
| P2 Stock tracking depth | Batch + expiry tracking (FEFO) | Required for clinical safety and recall traceability.

---

## 2) Source-of-Truth Mapping

| Source | Requirement Coverage |
|---|---|
| `pre-dev/07-blueprint-phase2-3.md` Step 17 | Drug catalog, inventory, dispensing, stock alerts, suppliers, PO flow |
| `pre-dev/02-PRD-phase2-3.md` P2.3 | Prescription-to-dispensing flow + billing integration |
| `pre-dev/02-SRS-phase2-3.md` FR-140..FR-151 | Must/Should requirements for pharmacy |
| `pre-dev/04-pages-bible-part4.md` PG-060..PG-065 | Queue, dispense detail, inventory, drugs, suppliers, purchase orders |
| `pre-dev/05-api-contracts/openapi-phase2.yaml` | `/pharmacy/*` route contracts |
| `pre-dev/03-architecture-phase2-3.md` | Event bus channels + ownership boundaries |

---

## 3) Scope Boundaries

### In Scope
- Drug catalog CRUD with search/filter.
- Facility-scoped inventory with batch number + expiry + reorder level.
- Queue intake from encounter sign-off event (`pharmacy.rx.received`).
- Dispense flow with pharmacist verification, allergy warning, FEFO batch allocation.
- Stock decrement + low stock event + admin notification.
- Supplier CRUD + purchase order lifecycle: DRAFT -> SUBMITTED -> APPROVED -> RECEIVED.
- Billing integration via `pharmacy.dispensed` event.

### Out of Scope (Step 18+)
- Telemedicine, Radiology, IPD implementation.
- New AI sidecar features.
- Mobile-native pharmacy app.

---

## 4) Contract Freeze (API + Events + Data)

## 4.1 OpenAPI Endpoints to Implement

From `openapi-phase2.yaml`:
- `GET /pharmacy/drugs`
- `POST /pharmacy/drugs`
- `GET /pharmacy/inventory`
- `POST /pharmacy/inventory/adjust`
- `GET /pharmacy/queue`
- `POST /pharmacy/dispense`
- `GET /pharmacy/suppliers`
- `POST /pharmacy/suppliers`
- `GET /pharmacy/purchase-orders`
- `POST /pharmacy/purchase-orders`
- `POST /pharmacy/purchase-orders/{id}/approve`
- `POST /pharmacy/purchase-orders/{id}/receive`

## 4.2 Event Contracts

### Inbound events consumed by Pharmacy
- `pharmacy.rx.received`
  - minimum payload:
    - `prescription_id`
    - `patient_id`
    - `encounter_id`
    - `org_id`
    - `facility_id`
    - `drugs[]` (`drug_id`, `dose`, `frequency`, `duration`, `quantity`)

### Outbound events published by Pharmacy
- `pharmacy.dispensed`
  - payload:
    - `prescription_id`
    - `encounter_id`
    - `patient_id`
    - `org_id`
    - `facility_id`
    - `dispensed_items[]` (`drug_id`, `quantity`, `batch_number`, `unit_price`, `line_total`)
    - `dispensed_by`
    - `dispensed_at`
- `pharmacy.stock.low`
  - payload:
    - `drug_id`
    - `facility_id`
    - `current_qty`
    - `reorder_level`

### Compatibility note
If encounter currently emits `clinics.prescription.issued`, add a temporary bridge handler that republishes to `pharmacy.rx.received`. Remove bridge once publisher is normalized.

## 4.3 Data Ownership

### PostgreSQL
- `drugs`
- `pharmacy_inventory`
- `suppliers`
- `purchase_orders`
- `purchase_order_items`

### MongoDB
- `dispensing_logs`

---

## 5) Micro-Blueprint (8 Tasks, Dependency Driven)

```text
T1 Prisma models + migration
  -> T2 Pharmacy module skeleton + repositories
  -> T3 Queue ingestion subscriber (rx.received)
  -> T4 Dispense use-case (FEFO + allergy + decrement)
  -> T5 Billing + encounter subscribers (dispensed)
  -> T6 Suppliers + purchase orders workflow
  -> T7 Frontend pages + API hooks + SSE queue
  -> T8 Tests, validation gates, changelog
```

### T1 - Prisma Models and Migration

**Files**
- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/migrations/*_step17_pharmacy/*`

**Implement**
- Add models: `Drug`, `PharmacyInventory`, `Supplier`, `PurchaseOrder`, `PurchaseOrderItem`.
- Add constraints and indexes:
  - unique `(orgId, name, form, strength)` for `Drug`
  - unique `(orgId, facilityId, drugId, batchNumber)` for `PharmacyInventory`
  - index `(orgId, facilityId, expiryDate)` for FEFO lookup
- Add PO status enum: `DRAFT | SUBMITTED | APPROVED | RECEIVED`.

**Done When**
- Migration applies and rolls back cleanly.
- Prisma client generates without errors.

### T2 - Pharmacy Module Skeleton + Repository Layer

**Files**
- `apps/api/src/pharmacy/pharmacy.module.ts`
- `apps/api/src/pharmacy/pharmacy.repository.ts`
- `apps/api/src/pharmacy/inventory.repository.ts`
- `apps/api/src/pharmacy/supplier.repository.ts`
- `apps/api/src/pharmacy/purchase-order.repository.ts`

**Implement**
- Repo methods always accept tenant context (`orgId`, `facilityId` where relevant).
- No direct Prisma access in service layer.

**Done When**
- Repositories compile and unit tests can mock interfaces.

### T3 - Queue Ingestion (`pharmacy.rx.received`)

**Files**
- `apps/api/src/pharmacy/subscribers/rx-received.subscriber.ts`
- `apps/api/src/pharmacy/schemas/queue-item.schema.ts` (if queue persisted in Mongo)

**Implement**
- Subscribe to `pharmacy.rx.received` and persist queue item with status `PENDING`.
- Add idempotency key (event id or `prescription_id`) to prevent duplicates.

**Done When**
- Replaying the same event does not duplicate queue entries.
- `GET /pharmacy/queue` shows new item.

### T4 - Dispense Use Case (Critical Path)

**Files**
- `apps/api/src/pharmacy/pharmacy.service.ts`
- `apps/api/src/pharmacy/dto/dispense.dto.ts`
- `apps/api/src/pharmacy/schemas/dispensing-log.schema.ts`

**Implement**
- Pre-dispense checks:
  - tenant scope validation
  - queue item status not completed
  - stock sufficiency by selected/allocation batches
  - allergy warning generation from patient record
- FEFO allocation by expiry date ascending.
- Atomic stock decrement transaction.
- Write `dispensing_logs` Mongo document.
- Publish `pharmacy.dispensed`.
- Emit `pharmacy.stock.low` if below reorder level.

**Done When**
- Successful dispense decrements exact batch qty and marks queue item completed.
- Insufficient stock returns 422 and no partial writes.

### T5 - Downstream Integration (Billing + Encounters)

**Files**
- `apps/api/src/billing/subscribers/pharmacy-dispensed.subscriber.ts`
- `apps/api/src/encounters/subscribers/pharmacy-dispensed.subscriber.ts`

**Implement**
- Billing subscriber adds dispensed items to existing draft encounter invoice.
- Fallback: create standalone draft invoice if no encounter invoice exists.
- Encounter subscriber updates Rx status to dispensed.

**Done When**
- End-to-end event results in invoice line items and encounter Rx status update.

### T6 - Suppliers + Purchase Order Workflow

**Files**
- `apps/api/src/pharmacy/pharmacy.controller.ts`
- `apps/api/src/pharmacy/pharmacy.service.ts`
- `apps/api/src/pharmacy/dto/*`

**Implement**
- Supplier CRUD (`GET/POST /pharmacy/suppliers`).
- PO list/create/approve/receive endpoints.
- Enforce transition rules:
  - only `DRAFT -> SUBMITTED`
  - only `SUBMITTED -> APPROVED`
  - only `APPROVED -> RECEIVED`
- On receive: inventory auto-increment by PO items.

**Done When**
- Invalid status transition returns 400.
- Receive transition updates stock and PO status.

### T7 - Frontend Pharmacy Shell and Pages

**Files**
- `apps/web/src/app/(pharmacy)/pharmacy/queue/page.tsx`
- `apps/web/src/app/(pharmacy)/pharmacy/dispense/[rxId]/page.tsx`
- `apps/web/src/app/(pharmacy)/pharmacy/inventory/page.tsx`
- `apps/web/src/app/(pharmacy)/pharmacy/drugs/page.tsx`
- `apps/web/src/app/(pharmacy)/pharmacy/suppliers/page.tsx`
- `apps/web/src/app/(pharmacy)/pharmacy/purchase-orders/page.tsx`
- `apps/web/src/lib/api/pharmacy.api.ts`
- `apps/web/src/lib/hooks/usePharmacy.ts`

**Implement**
- Build PG-060..PG-065 pages with loading/error/empty/data states.
- Queue page receives live updates (SSE) for new prescriptions.
- Dispense detail page supports batch picker and confirm/reject actions.
- Use design tokens only (no raw hex values).

**Done When**
- Pharmacist role can complete queue -> dispense flow from UI without console errors.

### T8 - Test Pyramid + Validation + Changelog

**Files**
- `apps/api/src/pharmacy/*.spec.ts`
- `apps/web/src/components/pharmacy/*.test.tsx`
- `apps/web/e2e/pharmacy-dispense.spec.ts`
- `CHANGELOG.md`

**Implement**
- Add tests (see section 6).
- Run typecheck for `apps/api` and `apps/web`.
- Add session changelog entry with outcomes and metrics.

**Done When**
- Validation commands pass.
- Coverage targets met.
- Changelog updated.

---

## 6) Test-Behavior Map (Write tests first)

| Behavior | Layer | Test Name |
|---|---|---|
| Queue item created on `pharmacy.rx.received` | Integration | `should create pending queue item when rx event received` |
| Duplicate rx event ignored | Unit/Integration | `should be idempotent for same prescription_id` |
| FEFO allocation chooses earliest expiry batches first | Service | `should allocate from earliest expiry inventory first` |
| Allergy warning appears but dispense can proceed with confirm | Service/API | `should return allergy warning metadata during dispense` |
| Stock decrement atomicity | Repository/Service | `should rollback all stock updates when one batch update fails` |
| `pharmacy.dispensed` published after success | Service | `should publish pharmacy.dispensed after dispense commit` |
| Billing line item auto-added | Integration | `should append dispensed items to draft invoice` |
| PO transition guard | Service | `should reject invalid po status transitions` |
| PO receive increments stock | Integration | `should increase inventory quantities on receive` |
| Queue UI live update | E2E | `should display new rx in queue without page refresh` |

Coverage targets:
- Service and repository: >= 85%
- Critical module floor: >= 80%

---

## 7) Security and Compliance Gate

All endpoint and query paths must satisfy:
- JWT auth + permission guard (`pharmacy.rx.read`, `pharmacy.dispense`, `pharmacy.stock.manage`).
- Tenant scoping on all DB access (`orgId` and `facilityId` where needed).
- DTO validation for all writes.
- Audit log for state-changing actions:
  - dispense confirm/reject
  - inventory adjust
  - PO approve/receive
- No secrets or provider credentials in code.
- No direct business logic in React components.

---

## 8) Validation Commands (Execution Gate)

- API tests (targeted): run pharmacy and subscriber specs.
- Web tests (targeted): run pharmacy component tests.
- E2E: run pharmacy dispense journey.
- Type safety:
  - API typecheck
  - Web typecheck
- Lint: api and web lint for touched files.

The feature is not complete unless all validation commands pass.

---

## 9) Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Event name mismatch (`clinics.prescription.issued` vs `pharmacy.rx.received`) | Queue not populated | Add compatibility bridge and monitor event metrics. |
| Concurrent dispense race on same batch | Negative stock or double dispense | Use transaction + row-level locking + idempotency key. |
| Missing invoice at dispense time | Billing gap | Fallback standalone draft invoice creation. |
| Alert fatigue on low stock | Ignored notifications | Debounce duplicate low-stock events per drug/facility/time window. |

---

## 10) Definition of Done (Step 17)

- [ ] FR-140..FR-151 implemented or explicitly deferred with rationale.
- [ ] PG-060..PG-065 screens implemented and role-gated.
- [ ] All `/pharmacy/*` OpenAPI routes return contract-compliant responses.
- [ ] `pharmacy.rx.received`, `pharmacy.dispensed`, and `pharmacy.stock.low` fully wired.
- [ ] Dispense flow updates stock, encounter status, and billing in one end-to-end path.
- [ ] Validation gate passes (tests, typecheck, lint).
- [ ] `CHANGELOG.md` updated with Step 17 completion details.

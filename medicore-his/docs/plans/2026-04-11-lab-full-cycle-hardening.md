# Lab Full Cycle Hardening Implementation Plan

> For Claude: REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

Goal: Close the Lab Full Cycle quality gap by adding complete API and web test coverage, while fixing the API/UI contract drift that can break the facility queue.

Architecture: Keep the current Lab domain architecture (NestJS service + Prisma + Mongo result repository + React Query web hooks), but align list-order filters across shared contracts, API DTO/service, and web hooks. Use TDD for each rule-heavy service path and UI flow path.

Tech Stack: NestJS, Jest, Prisma, Mongo repository pattern, Next.js 14, React Query v5, Vitest, Testing Library.

---

## Task 1: Align Lab list-order contract before adding tests

Files:
- Modify: apps/api/src/lab/lab.dto.ts
- Modify: apps/api/src/lab/lab.service.ts
- Modify: apps/api/src/lab/lab.controller.ts
- Modify: apps/web/src/lib/api/lab.api.ts
- Modify: apps/web/src/lib/hooks/useLab.ts
- Modify: packages/shared-types/src/lab.ts

Step 1: Add optional status filter in shared and API query contracts.

Step 2: Update service listOrders to support facility-wide listing when no patientId/encounterId is provided, and apply optional status filter server-side.

Step 3: Update web API client and hooks to pass status filter to server and include status in React Query keys.

Step 4: Keep controller summary/docs accurate with the final supported filters.

Verify:
- Typecheck passes in API and web after signature changes.
- Hook usage in ops lab queue no longer depends on client-side status filtering only.

---

## Task 2: Create Lab service test harness and base fixtures

Files:
- Create: apps/api/src/lab/lab.service.spec.ts

Step 1: Build mock providers for PrismaService, EncountersService, LabResultRepository, and RedisPublisherService.

Step 2: Add canonical fixtures for tenant-scoped order/result data and utility builders for Prisma and Mongo-style documents.

Step 3: Add beforeEach cleanup and stable timestamps to avoid flaky assertions.

Verify:
- Spec file compiles and can run with zero tests skipped.

---

## Task 3: Cover placeOrder rules and event emission

Files:
- Modify: apps/api/src/lab/lab.service.spec.ts

Step 1: Add failing tests for encounter-facility mismatch, patient mismatch, and locked encounter rejection.

Step 2: Add success test asserting created order fields and published lab.order.placed payload.

Step 3: Implement only missing production changes if tests reveal behavior mismatch.

Verify:
- All placeOrder tests pass and event payload includes tenant and clinical identifiers.

---

## Task 4: Cover list/get order behavior with tenant scope and filters

Files:
- Modify: apps/api/src/lab/lab.service.spec.ts

Step 1: Add failing tests for facility-wide listing without patient/encounter filters.

Step 2: Add tests for patientId-only, encounterId-only, and status-only filtering.

Step 3: Add test ensuring getOrderById enforces org + facility scoping.

Step 4: Implement minimal service adjustments needed to satisfy tests.

Verify:
- listOrders returns expected rows for each filter combination.
- No BadRequest for empty filters in facility queue use-case.

---

## Task 5: Cover status transition state machine

Files:
- Modify: apps/api/src/lab/lab.service.spec.ts

Step 1: Add tests for allowed transitions: pending->collected, collected->in_progress, in_progress->completed.

Step 2: Add invalid transition tests (for example pending->completed, completed->collected).

Step 3: Add idempotent update test (same status returns current order without update write).

Step 4: Assert resultedAt behavior when status becomes completed.

Verify:
- Transition matrix is enforced exactly and deterministic.

---

## Task 6: Cover result recording, conflict safety, and retrieval

Files:
- Modify: apps/api/src/lab/lab.service.spec.ts

Step 1: Add tests for cancelled-order rejection and duplicate result conflict (existing result + duplicate key 11000).

Step 2: Add success test asserting Mongo result creation mapping, order status completion update, and lab.result.ready event publish.

Step 3: Add getResult not-found test and success path.

Step 4: Add getResultsForPatient test ensuring only completed-order-linked results are returned.

Verify:
- Conflict and safety paths are locked with explicit assertions.
- Event publishing and status synchronization are covered.

---

## Task 7: Add Lab controller forwarding/guarded-input tests

Files:
- Create: apps/api/src/lab/lab.controller.spec.ts

Step 1: Use direct-controller harness (service mock) to avoid guard DI coupling.

Step 2: Add tests that x-facility-id is required across endpoints.

Step 3: Add forwarding tests for list filters (patientId, encounterId, status), status update body, and recordResult using authenticated user.id as resultedBy.

Step 4: Add patient results route forwarding test.

Verify:
- Controller tests pass and prove parameter/header/body wiring.

---

## Task 8: Add Ops Lab queue page tests

Files:
- Create: apps/web/src/app/(ops)/lab/page.test.tsx

Step 1: Mock useAuth and useAllLabOrders; render no-facility branch.

Step 2: Add loading, error, and empty-state tests.

Step 3: Add table rendering test for multiple statuses with formatted timestamps.

Step 4: Add interaction tests for status tabs and search filtering.

Step 5: Add action visibility test (Enter Result button only for in_progress).

Verify:
- Queue UI behavior is deterministic and aligned with pages bible workflow.

---

## Task 9: Add Lab detail and result-entry UI tests

Files:
- Create: apps/web/src/app/(ops)/lab/orders/[id]/page.test.tsx
- Create: apps/web/src/components/lab/ResultEntryForm.test.tsx

Step 1: For detail page, test order-not-found, workflow action rendering by status, and completed-result rendering path.

Step 2: For ResultEntryForm, test panel-driven component population (CBC and BLOOD_CULTURE).

Step 3: Add flag derivation assertions (high/low/normal and critical override).

Step 4: Add freetext-only validation test (BLOOD_CULTURE requires notes).

Step 5: Add successful submit payload test to ensure normalized component values and mutate call.

Verify:
- Core lab technician workflow (view order -> advance -> enter result) is guarded by tests.

---

## Task 10: Final validation, changelog, and merge readiness

Files:
- Modify: CHANGELOG.md

Step 1: Run focused API tests:
- pnpm test -- src/lab/lab.service.spec.ts src/lab/lab.controller.spec.ts

Step 2: Run focused web tests:
- pnpm test -- src/app/(ops)/lab/page.test.tsx src/app/(ops)/lab/orders/[id]/page.test.tsx src/components/lab/ResultEntryForm.test.tsx

Step 3: Run typecheck gates:
- apps/api: pnpm typecheck
- apps/web: pnpm typecheck

Step 4: Add changelog session entry summarizing lab hardening outcomes.

Verify:
- All targeted tests pass.
- Typecheck passes in API and web.
- Changelog records scope and validation evidence.

---

## Done When

- Lab service rules are covered by deterministic tests across place, list, status transitions, result recording, and retrieval.
- Lab controller forwarding and header requirements are covered.
- Ops Lab queue/detail/result-entry UI flow has stable tests.
- Contract drift between API filters and web hook usage is resolved and tested.
- API and web typechecks pass with no new errors.
- Changelog entry added.

## Risks and Mitigations

- Risk: Existing callers may rely on listOrders filter rejection.
- Mitigation: Keep behavior tenant-safe and document facility-wide list as intended default for ops queue.

- Risk: UI tests become brittle due date formatting/timezone.
- Mitigation: Use fixed ISO fixtures and assert stable visible patterns.

- Risk: React Query cache assertions flaky.
- Mitigation: Prefer behavior assertions over internal cache snapshots unless strictly required.

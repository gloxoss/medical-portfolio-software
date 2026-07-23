# MediCore HIS Remaining Testing Backlog Plan

## Goal
Create and execute a complete, file-level testing backlog so feature delivery can continue now while preserving a clear path to full test coverage catch-up later.

## Baseline Snapshot (2026-04-11)

- Web page tests: 30/40 covered, 10 missing.
- API controller specs: 9/16 covered, 7 missing.
- API service specs: 11/19 covered, 8 missing.
- API repository specs: 1/9 covered by basename parity, 8 missing.
- Web component tests: 2/33 covered, 31 missing.
- Web e2e specs: 1.
- API e2e specs: 0.

Total missing tests in current backlog: 64 unit/page tests + API/Web e2e expansion.

## Rules While Feature Work Continues

- Every new or changed feature must ship with tests in the same PR.
- Do not increase the missing backlog counts above this snapshot.
- When new files are added in covered areas, append them to this plan immediately.
- For PowerShell commands targeting route-group paths with parentheses, quote file paths.

## What Now (Feature-First, Backlog-Guarded)

Use this sequence when the team is prioritizing new feature delivery and deferring backlog execution.

### Immediate (this session)

1. Pick one feature from the active blueprint scope and run a Socratic Gate before coding.
2. Produce a micro-blueprint (max 8 tasks, each independently verifiable).
3. Define the Test Map for that feature so every behavior is tied to a unit/component/integration/e2e check.

### Always-On PR Gate (no new test debt)

- If a page is added or modified, add/update its page test in the same PR.
- If a component is added or modified, add/update a colocated component test in the same PR.
- If a controller/service/repository changes, add/update its corresponding spec in the same PR.
- If auth, billing, or encounter flows are changed, add/update at least one e2e journey assertion in the same PR.

### Backlog Burn-Down Cadence (while features continue)

- Weekly tranche target: 3 page tests + 2 API specs + 2 component tests.
- Keep feature PRs unblocked, but reserve one focused tranche window each week to reduce debt.
- Update the Baseline Snapshot counts after each tranche so deltas are explicit.

### Priority Order When Resuming Backlog

1. Phase 1 (web route-level gaps) - highest user-facing regression risk.
2. Phase 2A + 2B (API controllers/services) - highest contract and logic risk.
3. Phase 3 (components) - medium UX regression risk.
4. Phase 4 (e2e expansion) - release confidence and cross-module confidence.

## Phase 1 - Close Route-Level Page Gaps (Web)

Verification command (single file):

```bash
pnpm --filter @medicore/web test -- "src/app/(group)/path/page.test.tsx"
```

Verification command (all page tests):

```bash
pnpm --filter @medicore/web test -- "src/app/**/page.test.tsx"
```

Tasks:

- [ ] Add apps/web/src/app/(auth)/login/page.test.tsx covering auth form rendering, validation, and submit flow.
- [ ] Add apps/web/src/app/(clinical)/encounter/[id]/page.test.tsx covering data load, error state, and major encounter actions.
- [ ] Add apps/web/src/app/(clinical)/encounter/new/page.test.tsx covering create flow and form validity states.
- [ ] Add apps/web/src/app/(clinical)/encounters/[id]/page.test.tsx covering encounter detail rendering and fallback states.
- [ ] Add apps/web/src/app/(clinical)/patients/page.test.tsx covering list loading, empty state, and key table actions.
- [ ] Add apps/web/src/app/(clinical)/patients/[id]/page.test.tsx covering patient profile sections and failure path.
- [ ] Add apps/web/src/app/(clinical)/schedule/page.test.tsx covering schedule list/calendar state transitions.
- [ ] Add apps/web/src/app/(ops)/appointments/page.test.tsx covering appointment queue loading and status transitions.
- [ ] Add apps/web/src/app/(ops)/ops/patients/new/page.test.tsx covering registration form happy/invalid paths.
- [ ] Add apps/web/src/app/admin/onboarding/page.test.tsx covering onboarding step shell, progress, and submit branch.

Phase 1 done when:

- [ ] All 10 page tests exist and pass.
- [ ] Web page coverage count reaches 40/40.

## Phase 2 - Restore API Unit Parity

Verification command (single file):

```bash
pnpm --filter @medicore/api test -- src/path/to/file.spec.ts
```

Verification command (all API specs):

```bash
pnpm --filter @medicore/api test
```

### 2A) Controllers (7 missing)

- [ ] Add apps/api/src/app.controller.spec.ts.
- [ ] Add apps/api/src/audit-log/audit-log.controller.spec.ts.
- [ ] Add apps/api/src/billing/billing.webhook.controller.spec.ts.
- [ ] Add apps/api/src/encounters/encounters.controller.spec.ts.
- [ ] Add apps/api/src/modules/admin/admin.controller.spec.ts.
- [ ] Add apps/api/src/portal/portal-internal.controller.spec.ts.
- [ ] Add apps/api/src/tenancy/tenancy.controller.spec.ts.

### 2B) Services (8 missing)

- [ ] Add apps/api/src/ai-context/ai-context.service.spec.ts.
- [ ] Add apps/api/src/billing/billing.service.spec.ts.
- [ ] Add apps/api/src/common/events/redis-publisher.service.spec.ts.
- [ ] Add apps/api/src/modules/admin/admin.service.spec.ts.
- [ ] Add apps/api/src/portal/portal-auth.service.spec.ts.
- [ ] Add apps/api/src/portal/portal.service.spec.ts.
- [ ] Add apps/api/src/prisma/prisma.service.spec.ts.
- [ ] Add apps/api/src/scheduling/redis-queue.service.spec.ts.

### 2C) Repositories (8 missing)

- [ ] Add apps/api/src/communication/communication.repository.spec.ts.
- [ ] Add apps/api/src/encounters/encounters.repository.spec.ts.
- [ ] Add apps/api/src/lab/lab-result.repository.spec.ts.
- [ ] Add apps/api/src/patients/patients.repository.spec.ts.
- [ ] Add apps/api/src/pharmacy/pharmacy-queue.repository.spec.ts.
- [ ] Add apps/api/src/pharmacy/pharmacy.repository.spec.ts.
- [ ] Add apps/api/src/scheduling/sched-mongo.repository.spec.ts.
- [ ] Add apps/api/src/scheduling/sched-pg.repository.spec.ts.

Phase 2 done when:

- [ ] All missing API controller/service/repository specs exist and pass.
- [ ] API spec parity reaches 100% for controller/service/repository basename matching.

## Phase 3 - Component Test Coverage Tranche (Web)

Verification command (single file):

```bash
pnpm --filter @medicore/web test -- src/components/path/Component.test.tsx
```

Verification command (all component tests):

```bash
pnpm --filter @medicore/web test -- "src/components/**/*.test.tsx"
```

### 3A) UI primitives

- [ ] Add apps/web/src/components/ui/avatar.test.tsx.
- [ ] Add apps/web/src/components/ui/badge.test.tsx.
- [ ] Add apps/web/src/components/ui/button.test.tsx.
- [ ] Add apps/web/src/components/ui/card.test.tsx.
- [ ] Add apps/web/src/components/ui/dialog.test.tsx.
- [ ] Add apps/web/src/components/ui/dropdown-menu.test.tsx.
- [ ] Add apps/web/src/components/ui/input.test.tsx.
- [ ] Add apps/web/src/components/ui/label.test.tsx.
- [ ] Add apps/web/src/components/ui/separator.test.tsx.
- [ ] Add apps/web/src/components/ui/skeleton.test.tsx.
- [ ] Add apps/web/src/components/ui/sonner.test.tsx.
- [ ] Add apps/web/src/components/ui/tooltip.test.tsx.

### 3B) Shell + admin + onboarding

- [ ] Add apps/web/src/components/shell/facility-switcher.test.tsx.
- [ ] Add apps/web/src/components/shell/shell-layout.test.tsx.
- [ ] Add apps/web/src/components/shell/sidebar.test.tsx.
- [ ] Add apps/web/src/components/shell/top-bar.test.tsx.
- [ ] Add apps/web/src/components/admin/OnboardingBanner.test.tsx.
- [ ] Add apps/web/src/components/onboarding/steps/AdminUserStep.test.tsx.
- [ ] Add apps/web/src/components/onboarding/steps/BrandingStep.test.tsx.
- [ ] Add apps/web/src/components/onboarding/steps/FacilitySetupStep.test.tsx.
- [ ] Add apps/web/src/components/onboarding/steps/GoLiveStep.test.tsx.

### 3C) Encounters + lab

- [ ] Add apps/web/src/components/encounters/DiagnosisSearch.test.tsx.
- [ ] Add apps/web/src/components/encounters/EncounterLayout.test.tsx.
- [ ] Add apps/web/src/components/encounters/LabOrderPanel.test.tsx.
- [ ] Add apps/web/src/components/encounters/LabOrderWidget.test.tsx.
- [ ] Add apps/web/src/components/encounters/RxWriter.test.tsx.
- [ ] Add apps/web/src/components/encounters/SignOffModal.test.tsx.
- [ ] Add apps/web/src/components/encounters/SoapEditor.test.tsx.
- [ ] Add apps/web/src/components/encounters/VitalsPanel.test.tsx.
- [ ] Add apps/web/src/components/lab/LabResultCard.test.tsx.
- [ ] Add apps/web/src/components/lab/LabResultTable.test.tsx.

Phase 3 done when:

- [ ] All 31 missing component tests exist and pass.
- [ ] Component parity reaches 33/33 source components with colocated tests.

## Phase 4 - E2E Expansion

### 4A) Web e2e

- [ ] Keep apps/web/e2e/core-journey.spec.ts green in CI.
- [ ] Add portal auth + dashboard journey spec.
- [ ] Add clinical encounter creation/edit journey spec.
- [ ] Add ops billing + payment callback journey spec.

Verification:

```bash
pnpm --filter @medicore/web test:e2e
```

### 4B) API e2e

- [ ] Add first API e2e harness files under apps/api/test using existing Jest e2e config.
- [ ] Add auth refresh/session lifecycle e2e spec.
- [ ] Add encounters create/update/read e2e spec.
- [ ] Add billing webhook idempotency e2e spec.

Verification:

```bash
pnpm --filter @medicore/api test:e2e
```

Phase 4 done when:

- [ ] Web e2e suite covers at least 4 core business journeys.
- [ ] API e2e suite exists and validates at least 3 critical backend workflows.

## Phase 5 - Full Regression Run and Sign-off

Run in this order:

```bash
pnpm --filter @medicore/web typecheck
pnpm --filter @medicore/api typecheck
pnpm --filter @medicore/web test
pnpm --filter @medicore/api test
pnpm --filter @medicore/web test:e2e
pnpm --filter @medicore/api test:e2e
pnpm test
```

Sign-off checklist:

- [ ] All tests added in Phases 1-4 are passing.
- [ ] No new untested routes/components/services/controllers/repositories introduced.
- [ ] CI execution time and flake rate are acceptable for merge gating.
- [ ] Backlog counts in this plan are updated to zero or remaining deltas are explicitly documented.

## Resume Protocol (When Returning to Testing)

1. Re-run inventory counts to refresh this snapshot before writing tests.
2. Start with Phase 1 and Phase 2 to secure highest product risk areas.
3. Run focused tests after each file to keep failures local.
4. Run full Phase 5 regression only after all tranche tasks are complete.
5. Update this plan with check marks and any newly discovered test debt.


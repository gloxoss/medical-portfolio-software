# 2026-04-11 Coverage Wave 2 - Pharmacy, Communication, AI Context, Audit Log, Frontend Breadth

## Summary
This wave closes backend test gaps in communication provider behavior, AI-context controller forwarding, and audit-log filtering/mapping while starting broad frontend page coverage with pharmacy-first tests and reusable smoke-test patterns.

## Scope
1. Communication service provider unit specs
2. AI-context NestJS controller spec
3. Audit-log service spec
4. Pharmacy ops web page tests
5. Frontend breadth tranche for additional pages (initial smoke-suite)

## Constraints
- Keep tests deterministic with no network access.
- Mock external providers (Twilio, SendGrid, PDFKit) at unit boundary.
- Focus on behavior and contract assertions over snapshot-heavy tests.
- Use focused test runs by file plus API/Web typechecks.

## Implementation Plan
1. Communication service specs:
- Validate template rendering behavior with fallback variables.
- Validate `sendSms` skip path when Twilio config is missing.
- Validate `sendSms` success and failure logging paths.
- Validate `sendEmail` skip path when SendGrid config is missing.
- Validate `sendEmail` success and failure logging paths.
- Validate `generateInvoicePdf` returns a buffer and populates key invoice fields.

2. AI-context controller spec:
- Validate patient context route forwards org and patient IDs to service.
- Validate controller returns service payload unchanged.

3. Audit-log service specs:
- Validate `log()` maps camelCase inputs to storage schema fields.
- Validate `getAuditLogs()` filter construction for search/entity/action.
- Validate pagination (`skip`, `limit`) and `{ data, total }` response shape.

4. Pharmacy frontend tests:
- Add queue page tests for loading/error/filter/status tabs.
- Add dispense page tests for missing context, success, and validation errors.
- Add targeted tests for drugs/inventory/suppliers/purchase-orders core actions.

5. Frontend breadth tranche (first pass of "30 other pages"):
- Add smoke tests for high-traffic non-pharmacy pages to establish baseline coverage.
- Reuse a stable test harness pattern (mock auth + page data hooks + action assertions).
- Keep tranche size practical for one session; expand in follow-up waves.

## Acceptance Criteria
- New specs exist and pass for communication, AI-context controller, and audit-log service.
- Pharmacy pages have meaningful frontend test coverage (beyond simple render smoke).
- At least one additional non-pharmacy page tranche is covered with smoke/happy-path tests.
- All new tests pass in focused runs.
- `pnpm --filter @medicore/api typecheck` passes.
- `pnpm --filter @medicore/web typecheck` passes.

## Verification Commands
1. `cd medicore-his/apps/api; pnpm jest src/communication/communication.service.spec.ts src/ai-context/ai-context.controller.spec.ts src/audit-log/audit-log.service.spec.ts`
2. `cd medicore-his/apps/web; pnpm vitest run "src/app/(ops)/pharmacy/**/*.test.tsx"`
3. `cd medicore-his/apps/web; pnpm vitest run "src/app/(portal)/**/*.test.tsx" "src/app/(ops)/lab/**/*.test.tsx"`
4. `cd medicore-his; pnpm --filter @medicore/api typecheck`
5. `cd medicore-his; pnpm --filter @medicore/web typecheck`

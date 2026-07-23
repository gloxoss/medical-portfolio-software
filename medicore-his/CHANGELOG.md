# Changelog

All notable changes to the MediCore HIS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), 
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-04-14 — Session 47 (Complete Editable Files Course + Comprehensive Documentation)

### Added
- **Complete Editable Files Course** (1000+ lines):
	- Added `docs/reports/learning-courses/COMPLETE-EDITABLE-FILES-COURSE.md` — Comprehensive line-by-line breakdown of ALL editable configuration files.
	- Covers 9 critical files: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.env.example`, `.gitignore`, `.dockerignore`, `apps/web/tsconfig.json`, `apps/web/next.config.js`, `apps/api/tsconfig.json`.
	- Explains purpose, when/how to edit, what changes mean, and why each line matters.
	- Documents 6 critical safety rules, 8 common mistakes with fixes, complete verification checklist.
- **Interactive course page** in Learn hub:
	- Added `apps/web/src/app/(ops)/learn/editable-files-course/page.tsx` with visual course overview.
	- Links sections by file difficulty, edit frequency, consequence of mistakes.
	- References critical rules, common mistakes, and verification process.

### Changed
- **Learn hub index page** (`apps/web/src/app/(ops)/learn/page.tsx`):
	- Added prominent link to Complete Editable Files Course at top of hub.
	- Highlighted as critical reference material for DevOps and platform maintainers.

### Validation
- TypeScript compilation: ✅ All files compile (0 errors on course pages + course doc)
- Markdown syntax: ✅ Valid formatting, links, code blocks
- Learn hub navigation: ✅ New course page accessible from `/learn` route

### Details
- **Course Structure:**
  - Part 1: Root Workspace Files (package.json, pnpm-workspace.yaml, turbo.json, .env.example, .gitignore, .dockerignore)
  - Part 2: Web App Configuration (tsconfig.json, next.config.js)
  - Part 3: API Configuration (tsconfig.json)
- **Safety Rules Covered:**
  1. Never commit `.env` with real secrets (data breach risk)
  2. Port changes require updating all references (frontend-backend connection failure)
  3. CORS origins must be domain-specific, never wildcard (CSRF attack risk)
  4. Breaking dependencies breaks everything (startup failures)
  5. JSON syntax errors fail silently (config ignored)
  6. One value per environment (leaked config, wrong values deployed)
- **Common Mistakes Reference:**
  - Committing .env to Git → Secrets in history forever
  - Port mismatch → API not reachable
  - Wildcard CORS → Patient data theft
  - Missing dependencies → "command not found"
  - JSON syntax errors → Config silently ignored
  - Wrong glob patterns → Artifacts committed
  - Mismatched pnpm versions → Lock file conflicts
  - Forgotten path alias updates → Import errors

## [Unreleased] - 2026-04-14 — Session 46 (Root Config Learning Pages + AI Script Enhancements)

### Added
- **Ops Learn hub routes**:
	- Added `apps/web/src/app/(ops)/learn/page.tsx` as a tutorial index page.
	- Added `apps/web/src/app/(ops)/learn/root-config-files/page.tsx` with practical guidance for editing root config files safely.
- **Learning document**:
	- Added `docs/reports/learning-courses/root-config-files-tutorial.md` with edit recipes for `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.env.example`, `.gitignore`, `.dockerignore`, and `CHANGELOG.md`.

### Changed
- **Root workflow scripts** in `package.json`:
	- Added `ai:dev` for local AI sidecar startup.
	- Added `ai:test` for AI sidecar test execution.
- **Ops navigation**:
	- Updated `apps/web/src/app/(ops)/layout.tsx` to include a `Learn` navigation item (`/learn`).

### Validation
- VS Code diagnostics check on touched files: ✅ no errors

## [Unreleased] - 2026-04-12 — Session 45 (Backend Refactor Completion: Modules Wiring + Notifications Merge + Cleanup)

### Added
- **Notifications module internalized communication infrastructure**:
	- Added `apps/api/src/modules/notifications/notification.repository.ts` for template fetch + notification log persistence.
	- Added `apps/api/src/modules/notifications/notification.event-handler.ts` for booking/invoice event handling.
	- Added `apps/api/src/modules/notifications/schemas/notification-log.schema.ts` and module wiring under `NotificationModule`.

### Changed
- **All API domain imports rewired to `src/modules/*`**:
	- Updated `apps/api/src/app.module.ts` to import domain modules from `./modules/*` and removed `AiContextModule`.
	- Updated moved module internals to use correct `../../core/*` and `../../infrastructure/*` paths after relocation.
- **Communication merged into single notifications service boundary**:
	- Merged SMS/Email/PDF capabilities into `apps/api/src/modules/notifications/notification.service.ts` using `ISmsProvider` and `IEmailProvider`.
	- Updated billing and notification subscribers/tests to consume merged `NotificationService` API.

### Removed
- Deleted legacy backend directories:
	- `apps/api/src/ai-context/`
	- `apps/api/src/common/`
	- `apps/api/src/prisma/`
- Deleted old nested communication boundary:
	- `apps/api/src/modules/notifications/communication/`
	- `apps/api/src/modules/notifications/providers/`

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`API_TSC_EXIT:0`)
- `pnpm test -- --runInBand src/modules/notifications/notification.service.spec.ts src/modules/notifications/notifications.integration.spec.ts src/modules/auth/auth.controller.spec.ts src/modules/billing/billing.controller.spec.ts src/modules/icd10/icd10.controller.spec.ts src/modules/icd10/icd10.service.spec.ts` in `apps/api`: ✅ (32/32 passed)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`WEB_TSC_EXIT:0`)
- Verified removed web duplicates/regression paths are absent:
	- `apps/web/src/app/clinical/**`
	- `apps/web/src/app/(clinical)/encounter/**`
	- `apps/web/src/app/(ops)/patients/**`

## [Unreleased] - 2026-04-12 — Session 44 (Backend Refactor: Communication Merge Path + ICD10 Module Relocation)

### Added
- **Storage provider abstraction scaffold** under `apps/api/src/infrastructure/providers/storage/`:
	- Added `storage.interface.ts` with `IStorageProvider` and `STORAGE_PROVIDER` token.
	- Added `r2.provider.ts` for HTTP-based upload/delete/public-URL adapter wiring.
	- Added `storage.module.ts` for DI registration.

### Changed
- **Communication module moved under notifications domain**:
	- Relocated `apps/api/src/communication/*` to `apps/api/src/modules/notifications/communication/*`.
	- Updated all references (AppModule, Billing, Notification providers/subscribers, tests) to new communication paths.
- **ICD10 module moved into modules tree**:
	- Relocated `apps/api/src/icd10/*` to `apps/api/src/modules/icd10/*`.
	- Updated `apps/api/src/app.module.ts` import to `./modules/icd10/icd10.module`.
	- Fixed moved controller core import depth to `../../core/*`.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm test -- --runInBand src/modules/notifications/communication/communication.service.spec.ts src/modules/notifications/notifications.integration.spec.ts src/auth/auth.controller.spec.ts src/billing/billing.controller.spec.ts src/modules/icd10/icd10.controller.spec.ts src/modules/icd10/icd10.service.spec.ts` in `apps/api`: ✅ (37/37 passed)

## [Unreleased] - 2026-04-12 — Session 43 (Backend Refactor: OTP Provider Migration to Infrastructure)

### Added
- **Infrastructure OTP provider layer** under `apps/api/src/infrastructure/providers/otp/`:
	- Added `otp.interface.ts` with `IOtpProvider` and `OTP_PROVIDER_TOKEN`.
	- Added concrete providers: `dev-otp.provider.ts`, `twilio-otp.provider.ts`, `infobip-otp.provider.ts`, `vonage-otp.provider.ts`.
	- Added provider factory and module: `otp.factory.ts`, `otp.module.ts`.

### Changed
- **Portal OTP wiring now uses infrastructure provider module**:
	- Updated `apps/api/src/portal/portal.module.ts` to import `OtpModule` from infrastructure and remove local factory registration.
	- Updated `apps/api/src/portal/portal-auth.service.ts` to import `IOtpProvider` and `OTP_PROVIDER_TOKEN` from infrastructure path.

### Removed
- **Legacy portal-local OTP provider implementation files** (migrated to infrastructure):
	- Removed `apps/api/src/portal/otp/otp-provider.interface.ts`.
	- Removed `apps/api/src/portal/otp/otp.factory.ts`.
	- Removed adapter files under `apps/api/src/portal/otp/adapters/`.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm test -- --runInBand src/communication/communication.service.spec.ts src/auth/auth.controller.spec.ts src/billing/billing.controller.spec.ts` in `apps/api`: ✅ (26/26 passed)

## [Unreleased] - 2026-04-12 — Session 42 (Backend Refactor: Telemedicine Video Provider Abstraction)

### Added
- **Infrastructure video provider layer** under `apps/api/src/infrastructure/providers/video/`:
	- Added `video.interface.ts` with `IVideoProvider` contract and `VIDEO_PROVIDER` token.
	- Added `daily.provider.ts` encapsulating Daily room/token lifecycle behavior (including existing mock fallback behavior when `DAILY_API_KEY` is missing).
	- Added `video.module.ts` for DI wiring.

### Changed
- **Telemedicine now depends on provider abstraction**:
	- Updated `apps/api/src/telemedicine/telemedicine.service.ts` to inject `IVideoProvider` and removed direct Daily HTTP/config logic from the service.
	- Updated `apps/api/src/telemedicine/telemedicine.module.ts` to import `VideoModule`.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm test -- --runInBand src/communication/communication.service.spec.ts src/auth/auth.controller.spec.ts src/billing/billing.controller.spec.ts` in `apps/api`: ✅ (26/26 passed)

## [Unreleased] - 2026-04-12 — Session 41 (Backend Refactor: SMS/Email Provider Abstraction)

### Added
- **Infrastructure provider contracts and modules** under `apps/api/src/infrastructure/providers/`:
	- Added SMS abstraction: `sms/sms.interface.ts`, `sms/twilio-sms.provider.ts`, `sms/sms.module.ts`.
	- Added Email abstraction: `email/email.interface.ts`, `email/sendgrid-email.provider.ts`, `email/email.module.ts`.

### Changed
- **Communication service decoupled from direct SDK calls** in `apps/api/src/communication/communication.service.ts`:
	- Replaced direct `twilio` and `@sendgrid/mail` usage with injected provider interfaces.
	- Preserved graceful-degradation behavior for missing provider configuration (`TWILIO_NOT_CONFIGURED`, `SENDGRID_NOT_CONFIGURED`).
- **Communication DI wiring updated** in `apps/api/src/communication/communication.module.ts`:
	- Added `SmsModule` and `EmailModule` imports.
- **Communication unit tests updated** in `apps/api/src/communication/communication.service.spec.ts`:
	- Replaced SDK mocks with provider-interface mocks.
	- Kept coverage for skip/sent/failed paths and PDF attachment payload behavior.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm test -- --runInBand src/communication/communication.service.spec.ts src/auth/auth.controller.spec.ts src/billing/billing.controller.spec.ts` in `apps/api`: ✅ (26/26 passed)

## [Unreleased] - 2026-04-11 — Session 20 (Portal Appointments Completion)

## [Unreleased] - 2026-04-12 — Session 31 (Encounter Workspace Implementation Slice)

## [Unreleased] - 2026-04-12 — Session 32 (ICD-10 API Integration)

## [Unreleased] - 2026-04-12 — Session 33 (Encounter Diagnosis Removal Persistence)

## [Unreleased] - 2026-04-12 — Session 34 (Encounter Diagnosis Route-Level Coverage)

## [Unreleased] - 2026-04-12 — Session 35 (Encounter Controller Coverage Expansion)

## [Unreleased] - 2026-04-12 — Session 36 (Encounter Controller Coverage Expansion II)

## [Unreleased] - 2026-04-12 — Session 37 (Encounter Controller Coverage Expansion III)

## [Unreleased] - 2026-04-12 — Session 38 (Encounter Controller Coverage Expansion IV)

## [Unreleased] - 2026-04-12 — Session 39 (API E2E Harness Restoration + Encounter E2E)

## [Unreleased] - 2026-04-12 — Session 40 (Encounter Web Page Coverage + Contract Notes)

### Added
- **Encounter workspace page-level web tests**:
	- Added `apps/web/src/app/(clinical)/encounters/[id]/page.test.tsx`.
	- Covered missing facility context state, diagnosis prop hydration to child panel, assessment-gated sign-off disable behavior, and signed-off read-only banner behavior.
- **Encounter API contract notes**:
	- Added `docs/encounter-api-contract-notes.md` documenting route-level method/permission/status/error expectations and current coverage map.

### Validation
- `pnpm vitest run "src/app/(clinical)/encounters/[id]/page.test.tsx"` in `apps/web`: ✅ (4/4 passed)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

### Added
- **API e2e harness restored** under `apps/api/test/`:
	- Added `apps/api/test/jest-e2e.json` to re-enable `pnpm test:e2e`.
	- Added `apps/api/test/encounters.e2e-spec.ts` with encounter route-level e2e coverage.
- **Encounter e2e scenarios added**:
	- `DELETE /api/v1/encounters/:id/diagnoses/:code` success and not-found mapping.
	- `POST /api/v1/encounters/:id/sign-off` success, clinical guard (`422`) mapping, and permissions guard denial (`403`) mapping.

### Validation
- `pnpm test:e2e -- --runInBand` in `apps/api`: ✅ (5/5 passed)
- `pnpm test -- --runInBand src/encounters/encounters.controller.spec.ts` in `apps/api`: ✅ (24/24 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

### Added
- **Encounter controller route coverage expansion (phase IV)** in `apps/api/src/encounters/encounters.controller.spec.ts`:
	- Added permissions-guard denial (`403`) coverage for `POST /encounters/:id/prescriptions`.
	- Added permissions-guard denial (`403`) coverage for `POST /encounters/:id/lab-orders`.
	- Added permissions-guard denial (`403`) coverage for `POST /encounters/:id/sign-off`.

### Validation
- `pnpm test -- --runInBand src/encounters/encounters.controller.spec.ts` in `apps/api`: ✅ (24/24 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)

### Added
- **Encounter controller route coverage expansion (phase III)** in `apps/api/src/encounters/encounters.controller.spec.ts`:
	- Added `POST /encounters/:id/prescriptions` forwarding, required-field validation failure, and service-level clinical guard (`422`) response mapping tests.
	- Added `POST /encounters/:id/lab-orders` forwarding and invalid payload validation failure tests.

### Validation
- `pnpm test -- --runInBand src/encounters/encounters.controller.spec.ts` in `apps/api`: ✅ (21/21 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)

### Added
- **Encounter controller route coverage expansion (phase II)** in `apps/api/src/encounters/encounters.controller.spec.ts`:
	- Added `GET /encounters/:id` forwarding and not-found response mapping tests.
	- Added `PUT /encounters/:id/vitals` forwarding and invalid numeric payload validation tests.
	- Added `PUT /encounters/:id/soap` forwarding and invalid field-type validation tests.
	- Added `GET /encounters/patients/:patientId/encounters` tests for default pagination (`page=1`, `limit=20`) and query parsing forwarding.

### Validation
- `pnpm test -- --runInBand src/encounters/encounters.controller.spec.ts` in `apps/api`: ✅ (16/16 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)

### Added
- **Encounter controller route coverage expansion** in `apps/api/src/encounters/encounters.controller.spec.ts`:
	- Added `POST /encounters` tests for header-driven facility forwarding and missing `x-facility-id` guard behavior.
	- Added `POST /encounters/:id/diagnoses` tests for DTO forwarding and invalid diagnosis-type validation failure.
	- Added `POST /encounters/:id/sign-off` forwarding test for org/doctor/encounter context propagation.

### Validation
- `pnpm test -- --runInBand src/encounters/encounters.controller.spec.ts` in `apps/api`: ✅ (8/8 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)

### Added
- **Encounter diagnosis removal controller coverage**:
	- Added `apps/api/src/encounters/encounters.controller.spec.ts`.
	- Added route-level assertions for `DELETE /encounters/:id/diagnoses/:code` success forwarding, diagnosis-not-found response mapping, and permission-denied guard behavior.

### Changed
- **Encounter diagnosis removal OpenAPI contract detail**:
	- Added explicit Swagger responses (`200`, `404`, `422`) for `DELETE /encounters/:id/diagnoses/:code` in `apps/api/src/encounters/encounters.controller.ts`.

### Validation
- `pnpm test -- --runInBand src/encounters/encounters.controller.spec.ts` in `apps/api`: ✅ (3/3 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)

### Added
- **Diagnosis removal API support for encounters**:
	- Added repository pull operation in `apps/api/src/encounters/encounters.repository.ts`.
	- Added service-layer `removeDiagnosis(...)` with signed-off lock enforcement and diagnosis-not-found handling in `apps/api/src/encounters/encounters.service.ts`.
	- Added endpoint `DELETE /api/v1/encounters/:id/diagnoses/:code` in `apps/api/src/encounters/encounters.controller.ts`.

### Changed
- **Encounter diagnosis chips are now fully server-persistent**:
	- Added `EncounterApi.removeDiagnosis(...)` in `apps/web/src/lib/api/encounter.api.ts`.
	- Updated `apps/web/src/components/encounters/DiagnosisSearch.tsx` to wire chip remove action to backend and refresh selected diagnoses from response payload.

### Added
- **Diagnosis removal test coverage**:
	- Extended `apps/api/src/encounters/encounters.service.spec.ts` with removal success, signed-off guard, and not-found diagnosis tests.
	- Extended `apps/web/src/components/encounters/DiagnosisSearch.test.tsx` with chip removal mutation coverage.

### Validation
- `pnpm test -- --runInBand src/encounters/encounters.service.spec.ts` in `apps/api`: ✅
- `pnpm vitest run "src/components/encounters/DiagnosisSearch.test.tsx"` in `apps/web`: ✅
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

### Added
- **ICD-10 search API endpoint**:
	- Added `GET /api/v1/icd10/search` via new module files:
		- `apps/api/src/icd10/icd10.controller.ts`
		- `apps/api/src/icd10/icd10.service.ts`
		- `apps/api/src/icd10/icd10.module.ts`
	- Wired `Icd10Module` into `apps/api/src/app.module.ts`.
	- Endpoint is staff-auth protected (`JwtAuthGuard` + `PermissionsGuard`) and requires `x-facility-id` header.
	- Search supports query by ICD code or description with bounded result limit.

### Changed
- **Encounter diagnosis search no longer uses frontend stub list**:
	- Replaced `icd10Api.search()` hardcoded code list in `apps/web/src/lib/api/patient.api.ts` with API-backed search against `/icd10/search` including tenant headers.
	- Updated `apps/web/src/components/encounters/DiagnosisSearch.tsx` to pass active facility/org context into ICD-10 search calls.

### Added
- **ICD-10 integration test coverage**:
	- Added `apps/api/src/icd10/icd10.controller.spec.ts` covering required `x-facility-id` header and query forwarding behavior.
	- Added `apps/api/src/icd10/icd10.service.spec.ts` covering default limits, max limit capping, code matching, and description matching.
	- Added `apps/web/src/components/encounters/DiagnosisSearch.test.tsx` covering tenant-scoped ICD lookup calls, diagnosis persistence submission, and signed-off lock behavior.

### Validation
- `pnpm test -- --runInBand src/icd10/icd10.controller.spec.ts src/icd10/icd10.service.spec.ts` in `apps/api`: ✅ (7/7 passed)
- `pnpm vitest run "src/components/encounters/DiagnosisSearch.test.tsx"` in `apps/web`: ✅ (3/3 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

### Changed
- **Encounter diagnosis flow is now persistence-backed**:
	- Updated `apps/web/src/components/encounters/DiagnosisSearch.tsx` to call `POST /encounters/:id/diagnoses` through `EncounterApi.addDiagnosis(...)` instead of local-only state updates.
	- Added diagnosis type selection (`primary` / `secondary`) in the workspace diagnosis panel before submitting ICD-10 codes.
	- Updated selected diagnosis state hydration to use the server-updated encounter payload after each successful add.
- **Encounter page wiring updated for diagnosis initialization**:
	- Updated `apps/web/src/app/(clinical)/encounters/[id]/page.tsx` to pass `encounterId` and initial diagnosis data into `DiagnosisSearch`.

### Validation
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 30 (Runtime Stabilization Regression Tests)

### Added
- **Patients search contract regression coverage**:
	- Updated `apps/api/src/patients/patients.controller.spec.ts` with explicit behavior checks for omitted `q` (200 + `q` undefined in DTO), empty `q` (400), and short `q` (400).
- **Staff auth bootstrap route-guard regression coverage**:
	- Added `apps/web/src/lib/auth/auth-context.test.tsx` verifying `AuthProvider.initialize()` runs on protected staff routes and is skipped for `/login`, `/forgot-password`, `/reset-password`, `/onboarding`, `/admin/onboarding`, and `/portal/*` routes.

### Validation
- `pnpm test -- --runInBand src/patients/patients.controller.spec.ts` in `apps/api`: ✅ (10/10 passed)
- `pnpm vitest run "src/lib/auth/auth-context.test.tsx"` in `apps/web`: ✅ (7/7 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 29 (Ops Billing + Patients Coverage Tranche)

### Added
- **Ops billing list coverage (PG-050)**:
	- Added `apps/web/src/app/(ops)/billing/page.test.tsx` covering facility-scope guard behavior, ledger row rendering, payment-intent initiation, and error fallback.
- **Ops invoice detail coverage (PG-051)**:
	- Added `apps/web/src/app/(ops)/billing/[invoiceId]/page.test.tsx` covering not-found fallback, cash payment action, and CMI form submission path.
- **Ops patients registry coverage**:
	- Added `apps/web/src/app/(ops)/ops/patients/page.test.tsx` covering facility-scoped query behavior, table/metadata rendering, and search-triggered re-query.
- **Lab result entry route coverage**:
	- Added `apps/web/src/app/(ops)/lab/orders/[id]/result/page.test.tsx` covering route param wiring to back-link target and `ResultEntryForm` prop forwarding.

### Validation
- `pnpm --filter @medicore/web test -- "src/app/(ops)/billing/page.test.tsx" "src/app/(ops)/billing/[invoiceId]/page.test.tsx" "src/app/(ops)/ops/patients/page.test.tsx" "src/app/(ops)/lab/orders/[id]/result/page.test.tsx"`: ✅ (10/10 passed)
- `pnpm --filter @medicore/web typecheck`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 28 (Admin + Ops Queue Coverage Tranche)

### Added
- **Admin dashboard coverage (PG-012)**:
	- Added `apps/web/src/app/(admin)/dashboard/page.test.tsx` covering no-facility guard behavior, KPI computation rendering, and recent billing rows.
- **Admin facilities coverage**:
	- Added `apps/web/src/app/(admin)/facilities/page.test.tsx` covering org-scope guard behavior, facility/doctor aggregate rendering, and add-facility action toast.
- **Admin services coverage**:
	- Added `apps/web/src/app/(admin)/services/page.test.tsx` covering no-facility guard behavior, invoice-line aggregation rendering, and service-name search filtering.
- **Ops queue coverage (PG-034)**:
	- Added `apps/web/src/app/(ops)/queue/page.test.tsx` covering no-facility and missing-token disconnect states, SSE connection contract (`/facilities/{id}/queue` + token query), and live queue update rendering from `init`/`completed` events.

### Validation
- `pnpm --filter @medicore/web test -- "src/app/(admin)/dashboard/page.test.tsx" "src/app/(admin)/facilities/page.test.tsx" "src/app/(admin)/services/page.test.tsx" "src/app/(ops)/queue/page.test.tsx"`: ✅ (11/11 passed)
- `pnpm --filter @medicore/web typecheck`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 27 (Admin Frontend Coverage Tranche)

### Added
- **Admin settings coverage (PG-130)**:
	- Added `apps/web/src/app/(admin)/settings/page.test.tsx` covering organisation fetch success/error states and active-facility details rendering.
- **Admin team coverage (PG-131)**:
	- Added `apps/web/src/app/(admin)/team/page.test.tsx` covering no-facility guard state, facilities/staff rendering, and invite-member toast action.
- **Admin audit log coverage (PG-132)**:
	- Added `apps/web/src/app/(admin)/audit-log/page.test.tsx` covering initial ledger rendering, Enter-triggered search, and query-error fallback.
- **Admin analytics coverage (PG-053)**:
	- Added `apps/web/src/app/(admin)/analytics/page.test.tsx` covering missing-facility state and KPI/breakdown rendering from billing + patient API responses.

### Validation
- `pnpm --filter @medicore/web test -- "src/app/(admin)/settings/page.test.tsx" "src/app/(admin)/team/page.test.tsx" "src/app/(admin)/audit-log/page.test.tsx" "src/app/(admin)/analytics/page.test.tsx"`: ✅ (10/10 passed)
- `pnpm --filter @medicore/web typecheck`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 26 (Portal Frontend Coverage Tranche 2)

### Added
- **Portal login page coverage**:
	- Added `apps/web/src/app/(portal)/login/page.test.tsx` covering phone validation, OTP send transition, OTP verify flow, and dashboard redirect.
- **Portal dashboard coverage**:
	- Added `apps/web/src/app/(portal)/dashboard/page.test.tsx` covering auth-loading state, upcoming-appointment filtering, unpaid invoice aggregation, and sign-out action.
- **Portal records coverage**:
	- Added `apps/web/src/app/(portal)/records/page.test.tsx` covering encounter sorting by recency and conditions/allergies tab rendering.
- **Portal invoices coverage**:
	- Added `apps/web/src/app/(portal)/invoices/page.test.tsx` covering billing table rendering, paid-receipt download flow, and unpaid invoice payment CTA alert.

### Validation
- `pnpm --filter @medicore/web test -- "src/app/(portal)/login/page.test.tsx" "src/app/(portal)/dashboard/page.test.tsx" "src/app/(portal)/records/page.test.tsx" "src/app/(portal)/invoices/page.test.tsx"`: ✅ (11/11 passed)
- `pnpm --filter @medicore/web typecheck`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 21 (Portal Guided Booking Flow)

### Added
- **Portal guided-booking read endpoints**:
	- `GET /api/v1/portal/appointments/facilities`
	- `GET /api/v1/portal/appointments/facilities/:facilityId/doctors`
	- `GET /api/v1/portal/appointments/availability?facilityId=&doctorId=&date=`
- **Portal service booking-read methods** in `apps/api/src/portal/portal.service.ts` with patient/org scope checks:
	- `getBookableFacilities(...)`
	- `getBookableDoctors(...)`
	- `getDoctorAvailabilityForPortal(...)`
- **Shared portal booking contracts** in `packages/shared-types/src/index.ts`:
	- `PortalFacilityOption`
	- `PortalDoctorOption`
	- `PortalAvailabilitySlot`
- **Web guided booking test**: added `apps/web/src/app/(portal)/appointments/page.test.tsx` covering facility -> doctor -> slot -> book flow.
- **API controller test**: added `apps/api/src/portal/portal.controller.spec.ts` covering facilities, doctors, availability, and invalid doctor/facility combination behavior.

### Changed
- **Portal booking client**: `apps/web/src/lib/portal/appointments.api.ts` now includes `listFacilities`, `listDoctorsByFacility`, and `listAvailability` methods.
- **Portal appointments page UX**: `apps/web/src/app/(portal)/appointments/page.tsx` now uses guided selectors for facility/doctor/date and a slot picker, removing manual ID entry for booking.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm test -- --runInBand src/portal/portal.controller.spec.ts` in `apps/api`: ✅ (4/4 passed)
- `pnpm vitest run "src/app/(portal)/appointments/page.test.tsx"` in `apps/web`: ✅ (1/1 passed)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 22 (Portal Settings S55)

## [Unreleased] - 2026-04-11 — Session 23 (Step 17 Pharmacy Frontend + Tests)

### Added
- **Pharmacy ops routes (Step 17 frontend closure pass)** under `apps/web/src/app/(ops)/pharmacy/`:
	- `/pharmacy` redirect route to `/pharmacy/queue`
	- `/pharmacy/queue` (PG-060 queue view with filters/search/live polling via React Query)
	- `/pharmacy/dispense/[id]` (PG-061 dispense detail with allergy visibility, quantity overrides, FEFO batch fallback)
	- `/pharmacy/inventory` (PG-063 inventory ledger with low-stock/expiring filters + stock adjustment form)
	- `/pharmacy/drugs` (PG-062 drug catalog list + create form)
	- `/pharmacy/suppliers` (PG-064 supplier management list + create form)
	- `/pharmacy/purchase-orders` (PG-065 purchase order create/list/approve/receive)
- **Ops shell navigation wiring** in `apps/web/src/app/(ops)/layout.tsx`:
	- Added `Pharmacy` nav item linking to `/pharmacy/queue`.
- **Pharmacy backend tests (new coverage)**:
	- `apps/api/src/pharmacy/pharmacy.controller.spec.ts` (query parsing + forwarding behavior)
	- `apps/api/src/pharmacy/pharmacy.service.spec.ts` (FEFO dispense allocation, insufficient stock rejection, allergy warning propagation)
- **Showcase artifact**:
	- Added `showcase/008-pharmacy-queue/index.html` for Step 17 social/demo coverage.

### Changed
- **Step 17 execution status**: moved from backend-only to backend + first full frontend route set, with initial pharmacy test safety net now in place.

### Validation
- `pnpm test -- --runInBand src/pharmacy/pharmacy.controller.spec.ts src/pharmacy/pharmacy.service.spec.ts` in `apps/api`: ✅ (8/8 passed)
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 24 (Lab Full Cycle Hardening)

### Added
- **Lab API service tests**:
	- Added `apps/api/src/lab/lab.service.spec.ts` with coverage for order placement guards, facility-wide list behavior, status filtering, state transitions, result recording conflict handling, and patient-result filtering.
- **Lab API controller tests**:
	- Added `apps/api/src/lab/lab.controller.spec.ts` covering `x-facility-id` requirement and endpoint forwarding (filters, status updates, result recording, patient-result lookup).
- **Ops Lab web tests**:
	- Added `apps/web/src/app/(ops)/lab/page.test.tsx` for no-facility, loading/error/empty states, status tab behavior, search filtering, and in-progress action visibility.
	- Added `apps/web/src/app/(ops)/lab/orders/[id]/page.test.tsx` for order-not-found, workflow actions by status, and completed result rendering.
	- Added `apps/web/src/components/lab/ResultEntryForm.test.tsx` for panel-driven fields, freetext-only validation, flag derivation, critical override, and submit payload normalization.

### Changed
- **Lab list filtering contract alignment**:
	- Added shared `ListLabOrdersQuery` contract in `packages/shared-types/src/lab.ts`.
	- Extended API DTO filter support with optional `status` in `apps/api/src/lab/lab.dto.ts`.
	- Updated list behavior in `apps/api/src/lab/lab.service.ts` to allow facility-wide listing with optional `patientId`, `encounterId`, and `status` filters.
	- Updated list endpoint summary in `apps/api/src/lab/lab.controller.ts` to reflect supported filters.
	- Updated `apps/web/src/lib/api/lab.api.ts` and `apps/web/src/lib/hooks/useLab.ts` to pass status filters server-side and include status in query keys.

### Validation
- `pnpm --filter @medicore/api test -- src/lab/lab.service.spec.ts src/lab/lab.controller.spec.ts`: ✅ (28/28 passed)
- `pnpm --filter @medicore/web test -- "src/app/(ops)/lab/page.test.tsx" "src/app/(ops)/lab/orders/[id]/page.test.tsx" "src/components/lab/ResultEntryForm.test.tsx"`: ✅ (16/16 passed)
- `pnpm --filter @medicore/api typecheck`: ✅ (`exit:0`)
- `pnpm --filter @medicore/web typecheck`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 25 (Coverage Wave 2: Communication, AI Context, Audit Log, Pharmacy + Frontend Breadth)

### Added
- **Coverage wave plan artifact**:
	- Added `docs/plans/2026-04-11-coverage-wave2-pharmacy-comm-ai-audit-frontend.md` with phased implementation and verification commands.
- **Communication service provider specs**:
	- Added `apps/api/src/communication/communication.service.spec.ts` covering:
		- SMS skip/sent/failed paths (Twilio)
		- Email skip/sent/failed paths (SendGrid)
		- Email with PDF attachment flow
		- Invoice PDF generation buffer contract
- **AI context controller spec**:
	- Added `apps/api/src/ai-context/ai-context.controller.spec.ts` validating controller forwarding for org-scoped patient context retrieval.
- **Audit-log service spec**:
	- Added `apps/api/src/audit-log/audit-log.service.spec.ts` validating write mapping, filter composition, pagination, and `{ data, total }` response shape.
- **Pharmacy web frontend tests**:
	- Added `apps/web/src/app/(ops)/pharmacy/page.test.tsx` (route redirect behavior).
	- Added `apps/web/src/app/(ops)/pharmacy/queue/page.test.tsx` (loading/error/filter/status tab behavior).
	- Added `apps/web/src/app/(ops)/pharmacy/dispense/[id]/page.test.tsx` (not-found, validation, successful dispense flow).
	- Added `apps/web/src/app/(ops)/pharmacy/drugs/page.test.tsx` (search args + create form validation/submission).
	- Added `apps/web/src/app/(ops)/pharmacy/inventory/page.test.tsx` (facility validation + adjustment submission).
	- Added `apps/web/src/app/(ops)/pharmacy/suppliers/page.test.tsx` (supplier validation + submission).
	- Added `apps/web/src/app/(ops)/pharmacy/purchase-orders/page.test.tsx` (create + approve/receive actions).
- **Initial non-pharmacy frontend breadth tranche**:
	- Added `apps/web/src/app/page.test.tsx` (home redirect).
	- Added `apps/web/src/app/payment/success/page.test.tsx` and `apps/web/src/app/payment/error/page.test.tsx` (payment page smoke/contract assertions).

### Validation
- `pnpm jest src/communication/communication.service.spec.ts src/ai-context/ai-context.controller.spec.ts src/audit-log/audit-log.service.spec.ts` in `apps/api`: ✅ (12/12 passed)
- `pnpm vitest run "src/app/(ops)/pharmacy/page.test.tsx" "src/app/(ops)/pharmacy/queue/page.test.tsx" "src/app/(ops)/pharmacy/dispense/[id]/page.test.tsx" "src/app/(ops)/pharmacy/drugs/page.test.tsx" "src/app/(ops)/pharmacy/inventory/page.test.tsx" "src/app/(ops)/pharmacy/suppliers/page.test.tsx" "src/app/(ops)/pharmacy/purchase-orders/page.test.tsx" "src/app/page.test.tsx" "src/app/payment/success/page.test.tsx" "src/app/payment/error/page.test.tsx"` in `apps/web`: ✅ (20/20 passed)
- `pnpm --filter @medicore/api typecheck`: ✅ (`exit:0`)
- `pnpm --filter @medicore/web typecheck`: ✅ (`exit:0`)

### Added
- **Shared portal settings contracts** in `packages/shared-types/src/index.ts`:
	- `PortalSettings`
	- `PortalSettingsUpdateInput`
	- `PortalPrivacyRequestAccepted`
- **Portal settings API client** in `apps/web/src/lib/portal/settings.api.ts` with typed methods:
	- `getSettings()`
	- `updateSettings(input)`
	- `requestDataExport()`
	- `requestDeleteAccount(reason?)`
- **Portal settings React Query hooks** in `apps/web/src/lib/portal/useSettings.ts`:
	- `usePortalSettings(...)`
	- `useUpdatePortalSettings()`
	- `useRequestPortalDataExport()`
	- `useRequestPortalAccountDeletion()`
	- `portalSettingsKeys`
- **S55 page route** in `apps/web/src/app/(portal)/settings/page.tsx` with:
	- SMS/email/AI consent toggles
	- save mutation with pending/success/error feedback
	- GDPR data export request action
	- GDPR account deletion request (optional reason + confirmation)
- **Focused S55 web tests** in `apps/web/src/app/(portal)/settings/page.test.tsx` covering loading, render, update payload, and GDPR request interactions.
- **Portal controller regression coverage** in `apps/api/src/portal/portal.controller.spec.ts` for:
	- `getSettings`
	- `updateSettings` audit metadata forwarding
	- `requestDataExport`
	- `requestDeleteAccount` reason forwarding

### Changed
- **Portal dashboard quick actions** in `apps/web/src/app/(portal)/dashboard/page.tsx` now include a `Settings` link to `/portal/settings`.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm test -- --runInBand src/portal/portal.controller.spec.ts` in `apps/api`: ✅ (8/8 passed)
- `pnpm vitest run "src/app/(portal)/settings/page.test.tsx"` in `apps/web`: ✅ (4/4 passed)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 20 (Portal Appointments Completion)

### Added
- **Canonical portal booking route**: Added `POST /api/v1/portal/appointments` and retained `POST /api/v1/portal/appointments/book` as a backward-compatible alias.
- **Portal appointments API client**: Added `apps/web/src/lib/portal/appointments.api.ts` with typed `list`, `book`, `cancel`, and `reschedule` methods.
- **Portal appointments page**: Added `apps/web/src/app/(portal)/appointments/page.tsx` with:
	- Appointment list (upcoming + past/closed)
	- Self-service booking form
	- Cancel flow with optional reason
	- Reschedule flow with date/time and optional reason

### Changed
- **Portal dashboard wiring**: Updated `apps/web/src/app/(portal)/dashboard/page.tsx` to use the new appointments client and added direct navigation to `/portal/appointments` from quick actions and the upcoming appointments card.

### Validation
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 19 (Step 17 Pharmacy Kickoff)

### Added
- **Pharmacy data models (PostgreSQL)**: Added Prisma models and migration artifacts for `Drug`, `PharmacyInventory`, `Supplier`, `PurchaseOrder`, and `PurchaseOrderItem`, including `PurchaseOrderStatus` enum and tenant/facility indexes.
- **Pharmacy API module**: Introduced `apps/api/src/pharmacy/` with controller, service, repositories, DTOs, Mongo schemas (`pharmacy_queue_items`, `dispensing_logs`), and event handler.
- **OpenAPI-aligned endpoint surface**: Implemented runtime handlers for:
	- `GET/POST /pharmacy/drugs`
	- `GET /pharmacy/inventory`
	- `POST /pharmacy/inventory/adjust`
	- `GET /pharmacy/queue`
	- `POST /pharmacy/dispense`
	- `GET/POST /pharmacy/suppliers`
	- `GET/POST /pharmacy/purchase-orders`
	- `POST /pharmacy/purchase-orders/:id/approve`
	- `POST /pharmacy/purchase-orders/:id/receive`
- **Frontend integration foundation**: Added `apps/web/src/lib/api/pharmacy.api.ts` and `apps/web/src/lib/hooks/usePharmacy.ts` with React Query hooks for drugs, inventory, queue, dispensing, suppliers, and purchase orders.

### Changed
- **Encounter sign-off event fan-out**: `EncountersService.signOff()` now publishes `pharmacy.rx.received` when prescriptions exist.
- **Billing event integration**: Billing now listens to `pharmacy.dispensed` and appends pharmacy line items to draft encounter invoices (with fallback invoice creation).
- **Application wiring**: Registered `PharmacyModule` in `AppModule` and added Swagger tag metadata for Pharmacy routes.
- **Event subscriber runtime**: Enabled Redis microservice transport startup in `main.ts` so `@EventPattern(...)` handlers process domain events at runtime.

### Validation
- `pnpm exec prisma generate` in `apps/api`: ✅
- `pnpm exec tsc --noEmit` in `apps/api`: ✅ (`exit:0`)
- `pnpm exec tsc --noEmit` in `apps/web`: ✅ (`exit:0`)

## [Unreleased] - 2026-04-11 — Session 18 (Phase 1 Pre-Flight Fix)

### Added
- **BillingRepository test coverage**: Added 7 new tests covering `createInvoice`, `findInvoiceById`, `findInvoices`, `updateInvoiceTotals`, `addInvoiceItems`, partial `recordPayment`, `getRevenueByFacility`, and `updateStatus` NotFoundException path. Coverage: **100% statements / 100% lines**.
- **PatientsRepository test coverage**: Added tests for the `$text` full-text search branch and `findByPhone`. Coverage: **86% statements / 92% lines**.

### Verified (Phase 1 Closure Confirmation)
- **Step 8 — Communication Pipeline**: `pnpm test --testPathPattern=notification` → **7/7 passed**. All four notification paths (appointment reminder, lab result, critical lab, invoice receipt + SMS fallback) and the failed-delivery retry publisher are verified.
- **Step 9 — AI Sidecar**: `python -m pytest tests -q` → **10/10 passed**. Route surface, consent gate, SOAP suggestion streaming, ambient transcription, and health endpoint all green.
- **Step 10 — Onboarding Wizard**: Backend spec (3/3) + frontend OrgDetailsStep test (2/2) confirmed passing.
- **H2 DEV_OTP_CODE guardrail**: Present in `apps/api/src/main.ts`; `.env.example` updated.
- **H4 Repository coverage**: `billing.repository.ts` 100%, `patients.repository.ts` 86% — both exceed 80% threshold.
- **H1 Dockerfile**: Multi-stage Dockerfile present at `apps/api/Dockerfile`. Runtime image-size check requires Docker Engine — environment-blocked, not code-blocked.
- **H3 Playwright E2E**: `apps/web/e2e/core-journey.spec.ts` present and env-var clean. Live execution requires running dev stack — environment-blocked, not code-blocked.

### TypeScript
- `pnpm typecheck` in `apps/api`: ✅
- `pnpm typecheck` in `apps/web`: ✅

---

## [Unreleased] - 2026-04-11 — Session 17

### Changed
- **Step 8 Closure (Communication Pipeline)**: Confirmed event-driven notification flow is implemented end-to-end with provider abstraction, appointment/lab/invoice subscribers, and retry subscriber wiring in the notifications module.
- **Step 9 Closure (AI Context Sidecar)**: Confirmed sidecar route surface, consent middleware, SOAP suggestion streaming, ambient transcription/session endpoints, and health route are implemented and wired.
- **Step 10 Closure (Onboarding Wizard)**: Confirmed onboarding state model/API, full-screen wizard route, five step components, resume banner integration, and frontend/backend onboarding tests are in place.
- **Phase 1 Plan Synchronization**: Updated Phase 1 closure plan gate tracking to reflect current verified hardening status and closure artifacts.

### Validation
- `python -m pytest tests -q` in `apps/ai`: ✅ 10 passed.
- `pnpm test -- --runInBand src/modules/admin/onboarding.service.spec.ts` in `apps/api`: ✅ 3 passed.
- `pnpm test -- src/components/onboarding/steps/OrgDetailsStep.test.tsx` in `apps/web`: ✅ 2 passed.

## [Unreleased] - 2026-04-11 — Session 16

### Changed
- **Encounter Workspace Checklist Closure**: Confirmed the PG-040 stack is fully assembled and active in the clinical route, including layout shell, vitals form, SOAP autosave flow, ICD-10 diagnosis search, and prescription writer integration.
- **Task-State Alignment**: Marked encounter implementation tasks complete and moved remaining work to validation/documentation closure.

### TypeScript / Diagnostics
- `apps/web` workspace problems: ✅ no errors.
- `apps/api` workspace problems: ✅ no errors.

## [Unreleased] - 2026-04-09 — Session 15

### Fixed
- **Legacy Encounter Route Recovery**: Replaced corrupted `apps/web/src/app/(clinical)/encounter/[id]/page.tsx` with a clean server redirect to `/encounters/[id]`, restoring backward-compat route behavior and compile safety.
- **API TypeScript Diagnostic Cleanup**: Removed deprecated `baseUrl` from `apps/api/tsconfig.json`, eliminating deprecation warnings while preserving successful local typecheck compatibility.
- **Shared Types TS6 Compatibility**: Added `rootDir: "./src"` in `packages/shared-types/tsconfig.json` to satisfy TS6 output-layout diagnostics in linked workspace builds.

### TypeScript / Diagnostics
- `apps/web` workspace problems: ✅ no errors.
- `apps/api` workspace problems: ✅ no errors.

## [Unreleased] - 2026-04-09 — Session 14

### Fixed
- **TypeScript Config Health (API)**: Updated `apps/api/tsconfig.json` to set `rootDir: ./src` and `ignoreDeprecations: "6.0"`, clearing active TS6 diagnostics in workspace problems.

### Changed
- **Current Version Guide Sync**: Updated `docs/CURRENT_VERSION_GUIDE.md` to reflect ops lab shell routes (`/lab`, `/lab/orders/[id]`) and remove stale wording that still marked dedicated lab shell coverage as missing.
- **Runbook Coverage Expansion**: Updated `docs/FULL_FEATURE_TESTING_RUNBOOK.md` ops checklist with explicit validation steps for `/lab` queue/list and `/lab/orders/[id]` detail workflow.

## [Unreleased] - 2026-04-08

### Added
- **Stripe Integration**: Added real Stripe SDK integration to generate valid PaymentIntents inside `BillingService`. Fail-gracefully if `STRIPE_SECRET_KEY` is not set.
- **Twilio SMS Integration**: Added `twilio` library for clinical notifications, gracefully skipping if credentials aren't supplied in the `.env`.
- **SendGrid Integration**: Integrated `@sendgrid/mail` for dispatching invoice emails and reminders.
- **PDF Generation**: Added `pdfkit` to `CommunicationService` to generate branded, fully tabulated PDF clinical invoices.
- **BullMQ**: Initialized queue mechanism in the API for delayed appointment reminders (e.g. 24h prior notification).
- **Patient API Client**: Added `patient.api.ts` on the frontend with strict `ApiResponse` and mapped data transfer objects.
- **Scheduling API Client**: Added `schedule.api.ts` mapping the locking backend implementation for atomic appointment booking.
- **Searchable Patient Registry UI**: Created `(ops)/patients/page.tsx` incorporating Shadcn input, responsive HTML tables, pagination loops, and integration with `useQuery`.
- **Registration Form UI**: Built `(ops)/patients/new/page.tsx` capturing a 12-field layout using `react-hook-form` coupled with strict `Zod` clinical data resolution.
- **Scheduling UI**: Added `(ops)/appointments/page.tsx` rendering active calendar availability dynamically fetched via MongoDB provider schedules context.

### Changed
- **Type Safety Improvement**: Refactored `any` typings inside `CommunicationEventHandler` and `AiContextService`. Added `PatientDocument` casting for predictable entity access.
- **Clinical Schema Fix**: Evolved `Encounter` mongoose schema; isolated nested array `lab_orders` from `any[]` into a discrete Typescript-defined `LabOrder` mapping.
- **Dynamic Context**: Rebuilt `AiContextService` to query directly into Postgres and Mongo schemas, pulling actual `Encounter` instances to formulate `active_medications` mapping without stubbing an empty collection.
- **Navigation Fix**: Altered the operational layout file `layout.tsx` to align URLs logically mapped into the NextJS App Router route group `(ops)`.

### Security
- **Endpoints Guarding**: Placed `@Permissions('ai.read')` annotation inside `AiContextController.getContext`. Denies access arbitrarily without enforcing rigorous access-token claims.

### Removed
- **Hardcoded Logic**: Stripped out `Math.random() * 0.05` simulated SMS failures.
- **Mock Behaviors**: Removed static placeholder array arrays from AI context construction point.

---
*Built incrementally conforming to the 8-Phase MediCore Clinical Governance Blueprint.*

---

## [Unreleased] - 2026-04-08 — Session 3

### Added
- **Admin Dashboard (`/dashboard`)**: Implemented 4-KPI metric grid using live billing data from `/api/v1/billing/invoices` and `/api/v1/billing/analytics/revenue`. Custom pure-CSS bar chart using `var(--chart-1)` design tokens — no external chart library.
- **Billing Ledger (`/billing`)**: Financial reconciliation table with Stripe payment-intent triggers (`POST /billing/invoices/:id/pay/stripe`) and PDF dispatch (`POST /billing/invoices/:id/pdf`). `useMutation` with `disabled={isPending}` guard prevents double-charges.
- **Patient Timeline (`/patients/[id]`)**: Chronological encounter history view combining `PatientApi.getById()` and `EncounterApi.getPatientHistory()` in parallel queries. CSS border-spine timeline with ICD-10 badge rendering, prescription summary, and SOAP snippet display.
- **Team Management (`/team`)**: Facility cards grid (real `GET /orgs/:orgId/facilities`) plus clinical staff table (real `GET /facilities/:facilityId/doctors`). Role-coloured badge system with Stethoscope/Shield icons.
- **Analytics (`/analytics`)**: Full aggregations from invoice data — status breakdowns via sparkbar components, revenue-by-month bar chart (derived from `createdAt` grouping), and top-5 transactions table.
- **Settings (`/settings`)**: Live org config from `GET /orgs/:orgId`, active facility details from auth context, security posture audit (JWT TTL, bcrypt rounds, rate limits), and subscription plan badge.
- **Doctor's Schedule (`/schedule`)**: Weekly 7-column calendar navigator with configurable `weekOffset` state. Fetches `GET /doctors/:id/schedule` template from the authenticated user's ID. Renders slot cards per selected day.
- **Billing API expansion**: Added `getRevenueAnalytics()` and `generatePdf()` to `billing.api.ts`. All methods use `activeFacility.facilityId` for tenant scoping — never hardcoded.

### Fixed
- **`orgId` resolution**: `AuthUser` in `@medicore/shared-types` does not carry `orgId` directly. Fixed `team/page.tsx` and `settings/page.tsx` to derive `orgId` from `activeFacility.orgId` (the correct JWT-scoped path).
- **`invoiceNo` → `invoiceNumber`**: Aligned UI references with actual `Invoice` type from `@medicore/shared-types`.
- **`patient.dob` → `patient.dateOfBirth`**, **`patient.first_name` → `patient.firstName`**: Aligned page with camelCase `Patient` interface.

### Showcase
- **`showcase/005-analytics-dashboard/index.html`**: Self-contained KPI + bar chart + sparkbar demo with `LEARN:` annotations explaining the Prisma aggregation pattern and CSS chart technique.
- **`showcase/006-billing-ledger/index.html`**: Interactive invoice table with simulated Stripe/PDF toast flows annotated for educational clarity.
- **`showcase/007-patient-timeline/index.html`**: Real ICD-10 codes (J06.9, I10, E11.9, M54.5), Moroccan patient data, CSS spinner timeline with `LEARN:` comments throughout.

### TypeScript
- `tsc --noEmit`: ✅ **0 errors** across all 7 new pages and updated API clients.

---

## [Unreleased] - 2026-04-08 — Session 4

### Added
- **PG-040 Encounter Workspace (`/encounters/[id]`)**: Implemented the clinical encounter route in `(clinical)` with a token-driven two-column layout and mobile sidebar drawer behavior.
- **Encounter Layout Compound Component**: Added `EncounterLayout` with `EncounterLayout.Sidebar` and `EncounterLayout.Main` for responsive composition and future AI-panel extensibility.
- **PG-041 Vitals Panel**: Added `VitalsPanel` using `react-hook-form` + `zodResolver`, optional partial vitals validation, and live BMI calculation with clinical status color bands.
- **SOAP Autosave Flow**: Added `useSoapAutosave` hook (2s debounce) and `SoapEditor` with discriminated autosave states (`draft`, `saving`, `saved`, `error`) and saving indicator.
- **ICD-10 Typeahead Stub**: Added `icd10Api.search()` in `patient.api.ts` with the approved 10-code medical list for frontend diagnosis workflow.
- **PG-042 Rx Writer**: Added `RxWriter` with validated prescribing form, frequency presets (OD/BD/TDS/QDS/PRN/STAT), and automatic total quantity computation.
- **Encounter Store**: Added Zustand `useEncounterStore` to track `activeEncounterId`, `soapDraft`, diagnosis chips, and prescription draft list.
- **Clinical Route Resilience**: Added `(clinical)/error.tsx` boundary and `/encounters/[id]/loading.tsx` skeleton route state.

### Changed
- **Tenant Scoping Headers**: Extended `encounter.api.ts` methods to include `orgId` header support alongside `facilityId` for strict clinical tenant scoping.
- **Vitals API Alias**: Added `EncounterApi.saveVitals()` alias to align encounter form semantics while preserving existing `updateVitals()` compatibility.

### TypeScript
- `pnpm typecheck`: ✅ **0 errors** after PG-040 implementation.

---

## [Unreleased] - 2026-04-08 — Session 5

### Added
- **PG-043 Sign-Off Hook**: Added `useSignOffEncounter.ts` to centralize sign-off mutation handling, cache invalidation, and post-sign-off lock/invoice store updates.
- **PG-043 Sign-Off Modal**: Added `SignOffModal.tsx` with fresh on-open encounter fetch, full loading/error/ready/signing state handling, irreversibility warning, and guarded confirmation workflow.
- **Read-Only Lock Visuals**: Added tokenized lock indicators, signed banner, and read-only presentation styles in `EncounterWorkspace.module.css`.

### Changed
- **Encounter Sign-Off API Typing**: Updated `encounter.api.ts` sign-off typing to normalize both current backend payload and target contract payload (`encounter` + `invoice_id`).
- **Billing Event Compatibility**: Updated `apps/api/src/billing/billing.event-handler.ts` to normalize both snake_case and camelCase `encounter.signed_off` payloads before invoice generation.
- **Invoice Link Fallback**: Added short retry invoice resolution in `useSignOffEncounter.ts` when sign-off response omits invoice ID, enabling post-sign-off invoice banner linking.
- **Encounter Store State Machine Support**: Extended `encounter-store.ts` with `encounterStatus`, `invoiceId`, and corresponding setters for post-sign-off UI locking and invoice linking.
- **Encounter Page Sign-Off Flow**: Replaced direct sign-off mutation with modal-triggered PG-043 flow in `(clinical)/encounters/[id]/page.tsx`; button now disables proactively when `soapDraft.assessment` is empty/whitespace.
- **SOAP Lock Enforcement**: `SoapEditor.tsx` now renders static read-only fields (no textarea) when encounter is signed off.
- **Vitals Lock Enforcement**: `VitalsPanel.tsx` now shows lock state and disables all vital inputs post sign-off.
- **Diagnosis Lock Enforcement**: `DiagnosisSearch.tsx` now hides search/add controls and renders non-removable chips after sign-off.
- **Prescription Lock Enforcement**: `RxWriter.tsx` now hides add form and delete actions when encounter status is signed off.

### TypeScript
- `pnpm typecheck`: ✅ **0 errors** after PG-043 implementation.

---

## [Unreleased] - 2026-04-08 — Session 6

### Added
- **Step 16 Shared Contracts**: Added `packages/shared-types/src/lab.ts` with strict lab domain contracts (`LabOrder`, `LabResult`, `LabComponent`, `LabStatus`, `LabFlag`) and exported them through the shared barrel.
- **Lab Orders SQL Persistence**: Added Prisma `LabOrder` model + `LabOrderStatus` enum and migration `apps/api/prisma/migrations/20260408113000_add_lab_orders/migration.sql` for tenant-scoped lab order storage.
- **Lab Module (API)**: Added `apps/api/src/lab/*` module with:
	- `LabController` routes for order placement, listing, status transitions, result recording, and patient/history retrieval,
	- `LabService` business logic with transition state machine and tenant checks,
	- `LabResultRepository` + Mongoose `lab_results` schema for component-level result storage,
	- Redis events `lab.order.placed` and `lab.result.ready` publication.
- **Portal Lab Endpoint**: Added `GET /api/v1/portal/lab/results` via `PortalController` + `PortalService` integration with `LabService`.
- **Frontend Lab API/Hooks**: Added `apps/web/src/lib/api/lab.api.ts` and `apps/web/src/lib/hooks/useLab.ts` with typed CRUD/query coverage and optimistic order placement.
- **Doctor Lab Ordering UI**: Added `LabOrderPanel` and integrated it into encounter workspace (`(clinical)/encounters/[id]`) replacing the legacy embedded lab-order flow.
- **Lab Result Entry UI**: Added `apps/web/src/components/lab/ResultEntryForm.tsx` and route `apps/web/src/app/(ops)/lab/orders/[id]/result/page.tsx` for lab technician data entry with auto-flagging + critical override.
- **Lab Result Display Components**: Added reusable `LabResultCard` and `LabResultTable` components.
- **Timeline + Portal Results View**:
	- Clinical timeline now renders completed lab results on `patients/[id]`.
	- Added patient portal labs page at `/portal/labs` and dashboard quick link.

### Changed
- **Role Permissions**: Extended NURSE permissions to include `lab.write` for order placement workflow.
- **Portal Data Client**: Extended portal API client with `getLabResults()`.

### TypeScript
- `pnpm --filter @medicore/shared-types typecheck`: ✅
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

## [Unreleased] - 2026-04-08 — Session 7

### Added
- **Portal OTP Request Endpoint**: Added `POST /api/v1/portal/auth/otp/request` for patient login flow (with backward-compatible alias on `/otp/send`).
- **Phone-Based OTP Throttling**: Added Redis-backed rate limiting in `PortalAuthService` to enforce max 3 OTP requests per phone every 10 minutes.

### Changed
- **OTP Security Semantics**:
	- OTP TTL changed to 5 minutes.
	- `verifyOtp` now returns **401** for wrong code and **410** for expired code.
	- Portal token default lifetime increased to 24h (`PORTAL_JWT_EXPIRES_IN` override supported).
- **JWT Audience Isolation**:
	- Portal JWTs now include `aud: 'patient-portal'` and `PortalJwtStrategy` enforces that audience.
	- Clinical access JWTs now sign with `aud: 'clinical'` and `JwtStrategy` enforces that audience.
- **Web Portal Client Alignment**: Updated portal auth client to call `/auth/otp/request`.
- **Portal Middleware Guarding**: Updated Next middleware to protect `/portal/*` routes using `portal_session` cookie checks, keeping `/portal/login` public and redirecting authenticated users away from login.
- **OTP Provider Copy**: Updated Twilio/Infobip/Vonage OTP message text from "Valid for 10 minutes" to "Valid for 5 minutes".

### TypeScript
- `pnpm --filter @medicore/shared-types typecheck`: ✅
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

---

## [Unreleased] - 2026-04-08 — Session 8

### Added
- **Patient Consent Persistence**: Added Prisma `PatientConsent` model + `PatientConsentType` enum and migration `apps/api/prisma/migrations/20260408170000_add_patient_consents/migration.sql` with audit fields (`ip_address`, `user_agent`, `granted_at`, `revoked_at`).
- **Portal Consent Endpoints**:
	- `GET /api/v1/portal/consent/status`
	- `POST /api/v1/portal/consent/accept`
	Both are portal-guarded and backed by Prisma persistence.
- **Portal Consent Frontend Client**: Added `apps/web/src/lib/portal/consent.api.ts` and React Query hooks in `apps/web/src/lib/portal/useConsent.ts`.
- **Consent Gate UX**: Added full-screen blocking `ConsentGate` component (`apps/web/src/components/portal/ConsentGate.tsx`) to enforce affirmative consent before portal content access.
- **Responsive Portal Shell**: Added `apps/web/src/components/portal/PortalShell.tsx` with:
	- desktop sidebar navigation,
	- mobile bottom tab navigation,
	- top-bar account/logout controls,
	- root-mounted consent gate.
- **Portal Profile Route**: Added `apps/web/src/app/(portal)/portal/profile/page.tsx` for read-only patient identity and consent status display.
- **Portal Root Redirect**: Added `apps/web/src/app/(portal)/portal/page.tsx` to redirect `/portal` to `/portal/dashboard`.

### Changed
- **Portal Layout Wiring**: `apps/web/src/app/(portal)/layout.tsx` now renders `PortalShell` instead of the previous minimal static wrapper.
- **Portal Login Viewport**: Updated login page min-height to fill viewport in the new shell model.
- **Portal Service**: Extended `PortalService` with consent status and acceptance methods, preserving tenant-scoped behavior via `(patientId, orgId, consentType)` lookups.

### TypeScript / Prisma
- `pnpm --filter @medicore/api exec prisma generate`: ✅
- `pnpm --filter @medicore/shared-types typecheck`: ✅
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

---

## [Unreleased] - 2026-04-08 — Session 9

### Added
- **Portal Stripe Checkout Endpoints**:
	- `POST /api/v1/portal/invoices/:id/pay/stripe/checkout`
	- `POST /api/v1/portal/invoices/:id/pay/stripe/confirm`
	Both routes are portal-guarded and enforce patient ownership before payment actions.
- **Billing Stripe Checkout Session Flow**: Added patient-scoped checkout session creation and paid-session confirmation methods in `BillingService`, including metadata validation (`invoice_id`, `patient_id`, `org_id`) before recording payment.
- **Portal Billing API Client**: Added `PortalBillingApi.startStripeCheckout()` and `PortalBillingApi.confirmStripeCheckout()` in `apps/web/src/lib/portal/portal-api.ts`.
- **Portal Payment Callback Routes**:
	- `apps/web/src/app/(portal)/portal/invoices/success/page.tsx`
	- `apps/web/src/app/(portal)/portal/invoices/cancel/page.tsx`
	to handle post-checkout confirmation and cancellation UX.

### Changed
- **Portal Invoices UX**: Replaced disabled Pay button in `apps/web/src/app/(portal)/portal/invoices/page.tsx` with live Stripe checkout initiation, pending-state feedback, and secure redirect behavior.
- **Portal Service Wiring**: Extended `PortalService` to orchestrate checkout start/confirm calls through `BillingService` while keeping patient/org scoping at the portal boundary.
- **Portal Module Dependencies**: `PortalModule` now imports `BillingModule` to support payment orchestration from portal routes.

### TypeScript
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

---

## [Unreleased] - 2026-04-09 — Session 13

### Added
- **Portal Invoice Receipt Download**:
	- Added `GET /api/v1/portal/invoices/:id/receipt` in `apps/api/src/portal/portal.controller.ts`.
	- Added patient-scoped receipt generation flow `getInvoiceReceiptPdf(...)` in `apps/api/src/portal/portal.service.ts`.
	- Added `BillingService.generatePortalInvoicePdf(...)` for ownership-checked PDF generation reuse.
- **Portal Receipt Client + UX**:
	- Added `PortalDataApi.downloadInvoiceReceipt(...)` in `apps/web/src/lib/portal/portal-api.ts`.
	- Added `Receipt PDF` action in `apps/web/src/app/(portal)/portal/invoices/page.tsx` with blob download handling and per-row pending state.

### Changed
- **Portal Patient Profile Payload**: `apps/api/src/portal/portal.service.ts` now maps `problem_list` into `PatientPortalUser.problemList` instead of returning an empty array.
- **Portal Records UI**: Updated `apps/web/src/app/(portal)/portal/records/page.tsx` to render both allergy data and problem-list conditions under the records medical tab.
- **Portal Name Resolution**:
	- Appointments now resolve `doctorName` and `facilityName` from PostgreSQL (`users`, `facilities`) in `apps/api/src/portal/portal.service.ts`.
	- Encounters now resolve and return human-readable doctor/facility names with ID fallback.
- **Stripe Success Idempotency UX**: `apps/web/src/app/(portal)/portal/invoices/success/page.tsx` now differentiates `paid` vs `already_paid` confirmation states.

### TypeScript
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

---

## [Unreleased] - 2026-04-09 — Session 12

### Added
- **Portal Settings Endpoints**:
	- `GET /api/v1/portal/settings`
	- `PUT /api/v1/portal/settings`
	for patient-level SMS/email notification preferences and AI consent toggle.
- **GDPR Intake Endpoints**:
	- `POST /api/v1/portal/data-export` (HTTP 202)
	- `POST /api/v1/portal/delete-account` (HTTP 202)
	with patient-scoped intake and queued-request acknowledgements.
- **Portal Privacy Persistence**: Added Prisma models and migration:
	- `PortalPatientSetting` (`portal_patient_settings`)
	- `PortalPrivacyRequest` (`portal_privacy_requests`)
	- enums `PortalPrivacyRequestType` and `PortalPrivacyRequestStatus`
	- migration `apps/api/prisma/migrations/20260409103000_add_portal_settings_and_privacy_requests/migration.sql`.
- **BullMQ Queue Wiring**: Registered `portal_privacy_requests` queue in `PortalModule` and enqueued GDPR intake jobs for downstream processing.
- **Portal Settings UI**: Added patient portal route `apps/web/src/app/(portal)/portal/settings/page.tsx` with:
	- SMS/email notification toggles,
	- AI consent toggle,
	- data export request CTA,
	- account deletion request CTA (optional reason).
- **Portal Navigation Update**: Added `Settings` item to portal shell navigation for desktop and mobile in `apps/web/src/components/portal/PortalShell.tsx`.
- **Portal API Client Expansion**: Added settings/GDPR client methods in `apps/web/src/lib/portal/portal-api.ts`:
	- `getSettings()` / `updateSettings()`
	- `requestDataExport()` / `requestAccountDeletion()`.

### Changed
- **Portal Service Orchestration**: Extended `apps/api/src/portal/portal.service.ts` with:
	- typed settings retrieval/update flow,
	- AI consent persistence via `PatientConsentType.AI_AMBIENT_AUDIO`,
	- duplicate-active-request prevention for GDPR intake,
	- queue-backed privacy request intake pipeline.

### TypeScript / Prisma
- `pnpm --filter @medicore/api exec prisma generate`: ✅
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

---

## [Unreleased] - 2026-04-09 — Session 11

### Added
- **Portal Appointment Booking Endpoint**: Added `POST /api/v1/portal/appointments/book` in `apps/api/src/portal/portal.controller.ts` with validated payload (`doctorId`, `facilityId`, `startTime`, optional `type`, optional `notes`).
- **Portal Appointment Reschedule Endpoint**: Added `PUT /api/v1/portal/appointments/:id/reschedule` in `apps/api/src/portal/portal.controller.ts` with validated new-start-time payload.
- **Portal Booking + Reschedule Service Flow**: Added patient-scoped orchestration in `apps/api/src/portal/portal.service.ts`:
	- booking through `SchedulingService.bookAppointment(...)`,
	- reschedule with ownership checks, future-only guards, 24-hour lock-window policy, same doctor/facility slot checks, and availability validation.
- **Scheduling Reschedule Orchestration**: Added `rescheduleAppointment(...)` in `apps/api/src/scheduling/scheduling.service.ts` with Redis slot lock, conflict detection, and guarded persistence.
- **Atomic Mongo Reschedule Write**: Added `rescheduleAppointment(...)` in `apps/api/src/scheduling/sched-mongo.repository.ts` using `findOneAndUpdate` with status/future guards and `status_history` append.
- **Portal API Client Expansion**: Added booking and reschedule methods/types in `apps/web/src/lib/portal/portal-api.ts`:
	- `PortalDataApi.bookAppointment(...)`
	- `PortalDataApi.rescheduleAppointment(...)`
	- related input/result DTO typings.

### Changed
- **Portal Appointments UX**: Updated `apps/web/src/app/(portal)/portal/appointments/page.tsx` to enable full patient self-service:
	- booking composer with required doctor/facility/date-time fields,
	- live reschedule composer per appointment,
	- reschedule button now active (instead of placeholder),
	- mutation pending states + toast feedback + query invalidation for booking/cancel/reschedule.
- **Reschedule Policy UX Alignment**: Client-side action availability now mirrors backend policy by allowing reschedule only for booked/confirmed appointments more than 24 hours away.

### TypeScript
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

---

## [Unreleased] - 2026-04-09 — Session 10

### Added
- **Portal Appointments Page**: Added `apps/web/src/app/(portal)/portal/appointments/page.tsx` with upcoming/history sections, status badges, and patient self-service cancellation UI.
- **Portal Appointment Cancellation Endpoint**: Added `POST /api/v1/portal/appointments/:id/cancel` in `apps/api/src/portal/portal.controller.ts` with optional cancellation reason payload.
- **Portal Cancellation Service Flow**: Added patient-scoped cancellation orchestration in `apps/api/src/portal/portal.service.ts`, including future-only guard and allowed-status guard before scheduling transition.
- **Portal Client Cancellation Method**: Added `PortalDataApi.cancelAppointment()` and cancellation DTO/result types in `apps/web/src/lib/portal/portal-api.ts`.
- **Portal Navigation Entry**: Added Appointments nav item in `apps/web/src/components/portal/PortalShell.tsx` for desktop and mobile portal navigation.

### Changed
- **Portal Appointments UX**: Added optional reason composer, pending-state handling, optimistic feedback, and query invalidation after successful cancellation.
- **Cancellation Policy Enforcement**: Portal cancellation now rejects past appointments and disallows cancellation from non-cancellable statuses.
- **Reschedule Button Behavior**: Added explicit disabled placeholder state in appointments UI, marking reschedule as the immediate next implementation slice.

### TypeScript
- `pnpm --filter @medicore/api typecheck`: ✅
- `pnpm --filter @medicore/web typecheck`: ✅

- **Part D Micro-Hardening (H3 & H4)**: Refactored E2E Playwright tests to create dynamic encounters via API requests to remove dependency on E2E_EXISTING_ENCOUNTER_ID. Confirmed 100% statement coverage for BillingRepository to pass H4 readiness gate. Phase 2 Readiness Gate successfully opened.

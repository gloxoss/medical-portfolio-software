# Portal Settings (S55) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deliver patient portal settings at /portal/settings with notification toggles, AI consent toggle, GDPR data export request, and account deletion request.

**Architecture:** Reuse existing backend portal endpoints (`GET/PUT /portal/settings`, `POST /portal/data-export`, `POST /portal/delete-account`) and implement a typed frontend layer (`settings.api.ts` + React Query hooks) consumed by a dedicated S55 page. Keep page logic thin by moving network and mutation state to hooks. Align UX with existing portal pages and S55 contract in pre-dev screen inventory.

**Tech Stack:** Next.js App Router, TypeScript, axios portal client, TanStack React Query, Vitest + Testing Library.

---

## Contract & Context References

- Screen contract: `pre-dev/04-screens-phase2-3.md` (S55 Portal Settings)
- Page contract note: `pre-dev/04-pages-bible-part5.md` (PG-122–125 additions)
- API contract: `pre-dev/05-api-contracts/openapi-phase2.yaml` (`/portal/settings`, `/portal/data-export`, `/portal/delete-account`)
- Existing backend routes/service: `apps/api/src/portal/portal.controller.ts`, `apps/api/src/portal/portal.service.ts`
- Existing portal frontend patterns: `apps/web/src/app/(portal)/dashboard/page.tsx`, `apps/web/src/lib/portal/consent.api.ts`, `apps/web/src/lib/portal/useConsent.ts`

---

### Task 1: Add Shared Portal Settings Types

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Step 1: Write failing type usage in new settings API file**
- In upcoming `settings.api.ts`, import `PortalSettings` and `PortalPrivacyRequestAccepted` from shared types (expected to fail before this task).

**Step 2: Add shared interfaces**
- Add `PortalSettings` with:
  - `sms_notifications: boolean`
  - `email_notifications: boolean`
  - `ai_consent: boolean`
- Add `PortalSettingsUpdateInput` with optional fields matching update payload.
- Add `PortalPrivacyRequestAccepted` with:
  - `status: 'queued'`
  - `request_id: string`
  - `request_type: 'data_export' | 'delete_account'`
  - `message: string`

**Step 3: Verify**
- Run: `cd apps/web && pnpm exec tsc --noEmit`
- Expected: type import errors from settings API are resolved.

**Step 4: Commit**
- `git add packages/shared-types/src/index.ts`
- `git commit -m "feat(portal): add shared settings and privacy request types"`

---

### Task 2: Create Portal Settings API Client

**Files:**
- Create: `apps/web/src/lib/portal/settings.api.ts`

**Step 1: Write failing API-client test scaffold**
- Create placeholder test file that imports methods and asserts promise-returning signatures (fails until client exists).

**Step 2: Implement typed API client methods**
- `getSettings(): Promise<PortalSettings>` -> `GET /settings`
- `updateSettings(input: PortalSettingsUpdateInput): Promise<PortalSettings>` -> `PUT /settings`
- `requestDataExport(): Promise<PortalPrivacyRequestAccepted>` -> `POST /data-export`
- `requestDeleteAccount(reason?: string): Promise<PortalPrivacyRequestAccepted>` -> `POST /delete-account`

**Step 3: Verify**
- Run: `cd apps/web && pnpm exec tsc --noEmit`
- Expected: API client compiles with strict typing.

**Step 4: Commit**
- `git add apps/web/src/lib/portal/settings.api.ts`
- `git commit -m "feat(portal): add settings api client"`

---

### Task 3: Create Portal Settings React Query Hooks

**Files:**
- Create: `apps/web/src/lib/portal/useSettings.ts`

**Step 1: Write failing hook usage in settings page skeleton**
- Reference `usePortalSettings` and mutations from a placeholder page to force compile failure before hook implementation.

**Step 2: Implement hooks and cache keys**
- `portalSettingsKeys = { all, settings }`
- `usePortalSettings(enabled = true)` query
- `useUpdatePortalSettings()` mutation with cache update + invalidate
- `useRequestPortalDataExport()` mutation
- `useRequestPortalAccountDeletion()` mutation

**Step 3: Verify**
- Run: `cd apps/web && pnpm exec tsc --noEmit`
- Expected: hooks compile and are importable in page.

**Step 4: Commit**
- `git add apps/web/src/lib/portal/useSettings.ts`
- `git commit -m "feat(portal): add settings query and mutation hooks"`

---

### Task 4: Build S55 Portal Settings Page

**Files:**
- Create: `apps/web/src/app/(portal)/settings/page.tsx`

**Step 1: Write failing page test first**
- Add test that expects:
  - loading state
  - toggle controls for SMS/email/AI
  - GDPR action buttons (export, delete)

**Step 2: Implement page UI + state handling**
- Reuse portal shell style patterns from dashboard/invoices/records.
- Render states:
  - loading skeleton
  - loaded form
  - mutation pending states
  - success/error feedback messages
- Form behavior:
  - show current values from query
  - save updates through mutation
  - disable submit while pending
- GDPR behavior:
  - Data export button -> request + success message
  - Delete account -> reason input + confirmation prompt + request

**Step 3: Verify (manual)**
- Run: `cd apps/web && pnpm dev`
- Open `/portal/settings`
- Confirm toggles load and submit successfully; GDPR actions show accepted feedback.

**Step 4: Commit**
- `git add apps/web/src/app/(portal)/settings/page.tsx`
- `git commit -m "feat(portal): implement s55 settings page"`

---

### Task 5: Wire Portal Navigation to Settings

**Files:**
- Modify: `apps/web/src/app/(portal)/dashboard/page.tsx`

**Step 1: Add quick-action card/link**
- Add `/portal/settings` card in dashboard quick links.

**Step 2: Keep existing grid responsive**
- Preserve current responsive behavior while adding one more action card.

**Step 3: Verify**
- Run: `cd apps/web && pnpm exec tsc --noEmit`
- Manual: dashboard shows Settings action and navigates correctly.

**Step 4: Commit**
- `git add apps/web/src/app/(portal)/dashboard/page.tsx`
- `git commit -m "feat(portal): add settings quick link on dashboard"`

---

### Task 6: Add Focused Web Tests for S55

**Files:**
- Create: `apps/web/src/app/(portal)/settings/page.test.tsx`

**Step 1: Test loading and render**
- Mock hooks/API and assert page shows loading then toggles.

**Step 2: Test update flow**
- Simulate toggle change + save, assert update mutation called with expected payload.

**Step 3: Test GDPR actions**
- Trigger data export and deletion flows, assert corresponding mutations called.

**Step 4: Verify**
- Run: `cd apps/web && pnpm vitest run "src/app/(portal)/settings/page.test.tsx"`
- Expected: all tests pass.

**Step 5: Commit**
- `git add apps/web/src/app/(portal)/settings/page.test.tsx`
- `git commit -m "test(portal): add settings page interaction tests"`

---

### Task 7: Add Focused API Regression Test for Settings Routes

**Files:**
- Modify: `apps/api/src/portal/portal.controller.spec.ts`

**Step 1: Write failing controller tests**
- Add tests for:
  - `getSettings` forwarding patient/org scope
  - `updateSettings` forwarding payload and audit metadata from request
  - `requestDataExport` route forwarding
  - `requestDeleteAccount` route forwarding reason

**Step 2: Implement minimal mocks and assertions**
- Extend existing mockPortalService with needed methods.

**Step 3: Verify**
- Run: `cd apps/api && pnpm test -- --runInBand src/portal/portal.controller.spec.ts`
- Expected: settings-related tests pass with existing route behavior.

**Step 4: Commit**
- `git add apps/api/src/portal/portal.controller.spec.ts`
- `git commit -m "test(portal): cover settings and gdpr controller routes"`

---

### Task 8: Final Validation + Changelog

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Run validation commands**
- `cd apps/api && pnpm exec tsc --noEmit`
- `cd apps/api && pnpm test -- --runInBand src/portal/portal.controller.spec.ts`
- `cd apps/web && pnpm vitest run "src/app/(portal)/settings/page.test.tsx"`
- `cd apps/web && pnpm exec tsc --noEmit`

**Step 2: Update changelog**
- Add new session entry for S55 implementation:
  - frontend settings page
  - settings API/hooks
  - GDPR actions
  - tests and validation results

**Step 3: Verify acceptance**
- `/portal/settings` exists and is reachable from dashboard
- toggles persist through API
- data export/delete requests return queued confirmation
- all targeted tests + typechecks pass

**Step 4: Commit**
- `git add CHANGELOG.md`
- `git commit -m "chore(changelog): document portal settings s55 completion"`

---

## Done When

- [ ] S55 page exists at `apps/web/src/app/(portal)/settings/page.tsx`
- [ ] Portal settings API and hooks are implemented and typed
- [ ] Dashboard links to `/portal/settings`
- [ ] Data export and account deletion actions are wired and verified
- [ ] API and web focused tests pass
- [ ] API and web typechecks pass
- [ ] Changelog updated with validation evidence

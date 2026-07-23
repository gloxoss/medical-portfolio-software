# Parallel Session Handoff — Portal Settings S55

Use this in a fresh implementation session.

## Objective
Implement the full S55 Portal Settings slice end-to-end using:
- docs/plans/2026-04-11-portal-settings-s55-full-plan.md

## Scope
Build and validate:
1. Shared portal settings/privacy types
2. Portal settings API client
3. Portal settings React Query hooks
4. /portal/settings page
5. Dashboard link to settings
6. Web tests for S55 interactions
7. API controller regression tests for settings routes
8. Changelog update

## Mandatory References
- pre-dev/04-screens-phase2-3.md (S55)
- pre-dev/04-pages-bible-part5.md (PG-122 to PG-125 additions)
- pre-dev/05-api-contracts/openapi-phase2.yaml
- apps/api/src/portal/portal.controller.ts
- apps/api/src/portal/portal.service.ts

## Rules
- Follow TDD task-by-task from the full plan file
- Keep edits minimal and scoped
- Preserve existing portal behavior for login, appointments, records, invoices
- Keep tenant and patient self-scoping intact
- Run validations after each major milestone

## Validation Commands
- apps/api:
  - pnpm exec tsc --noEmit
  - pnpm test -- --runInBand src/portal/portal.controller.spec.ts
- apps/web:
  - pnpm vitest run "src/app/(portal)/settings/page.test.tsx"
  - pnpm exec tsc --noEmit

## Final Output Requirements
- All planned files created/updated
- All validations passing
- Changelog updated with a new session entry
- Brief summary of implemented files and results

## Kickoff Prompt For New Session
Implement the plan in docs/plans/2026-04-11-portal-settings-s55-full-plan.md exactly task-by-task with TDD. Use the mandatory references in pre-dev and portal api/service files, keep changes minimal, and run all listed validation commands before finalizing. Then update CHANGELOG.md with results.

# Portal Appointments Guided Booking Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual ID-based portal booking with guided facility -> doctor -> slot flow while preserving existing cancel/reschedule behavior and strict patient/org scoping.

**Architecture:** Add portal-scoped read endpoints for facilities, doctors, and doctor availability from the existing Portal module. Reuse SchedulingService slot computation for consistency, and expose a typed portal API client consumed by the portal appointments UI. Keep existing booking/cancel/reschedule mutations unchanged to minimize risk.

**Tech Stack:** NestJS (Portal + Scheduling modules), Prisma, Mongo/Mongoose, Next.js App Router, React Query/axios portal client, TypeScript.

---

## Scope Decisions (defaults applied)

1. Data source for facility/doctor selector: use live org data from Prisma (`facility`, `userFacilityRole`) filtered by active status.
2. Slot picker behavior: select a date first, then fetch slots for the selected doctor+facility and show only available slots.
3. Backward compatibility: keep `POST /portal/appointments/book` alias while promoting canonical `POST /portal/appointments`.

---

### Task 1: Add Portal Booking Read Contracts

**Files:**
- Modify: `packages/shared-types/src/index.ts`

**Step 1: Write failing type usage in portal client**
- Add imports in portal client for `PortalFacilityOption`, `PortalDoctorOption`, `PortalAvailabilitySlot` (expected to fail until types exist).

**Step 2: Implement minimal shared contracts**
- Add interfaces:
  - `PortalFacilityOption { id: string; name: string }`
  - `PortalDoctorOption { id: string; name: string; specialties: string[] }`
  - `PortalAvailabilitySlot { start_time: string; end_time: string; available: boolean }`

**Step 3: Verify**
- Run: `cd apps/web && pnpm exec tsc --noEmit`
- Expected: type import errors resolved.

---

### Task 2: Add Portal Service Read Methods (Facility/Doctor/Slots)

**Files:**
- Modify: `apps/api/src/portal/portal.service.ts`

**Step 1: Add facility query method**
- Implement `getBookableFacilities(patientId, orgId)`:
  - verify patient belongs to org (reuse existing guard pattern)
  - query active facilities in org
  - map to `{ id, name }`

**Step 2: Add doctor query method**
- Implement `getBookableDoctors(patientId, orgId, facilityId)`:
  - validate facility belongs to org
  - query `userFacilityRole` where `facilityId`, `role='DOCTOR'`, `isActive=true`
  - map doctor display name

**Step 3: Add availability query method**
- Implement `getDoctorAvailabilityForPortal(patientId, orgId, facilityId, doctorId, date)`:
  - validate doctor+facility relationship
  - call `schedulingService.getAvailability(orgId, doctorId, facilityId, date)`
  - return slots unchanged

**Step 4: Verify**
- Run: `cd apps/api && pnpm exec tsc --noEmit`
- Expected: no type errors.

---

### Task 3: Expose Portal Controller Endpoints for Guided Booking

**Files:**
- Modify: `apps/api/src/portal/portal.controller.ts`

**Step 1: Add DTO for availability query**
- Add `GetPortalAvailabilityDto` with `facilityId`, `doctorId`, `date` validation.

**Step 2: Add read endpoints**
- `GET /portal/appointments/facilities`
- `GET /portal/appointments/facilities/:facilityId/doctors`
- `GET /portal/appointments/availability?facilityId=&doctorId=&date=`

**Step 3: Wire endpoints to new service methods**
- All handlers use `@PortalUser()` and pass patient/org scope.

**Step 4: Verify**
- Run: `cd apps/api && pnpm exec tsc --noEmit`
- Expected: controller compiles with DTO validation.

---

### Task 4: Add Portal Appointments API Client Read Methods

**Files:**
- Modify: `apps/web/src/lib/portal/appointments.api.ts`

**Step 1: Add list methods**
- `listFacilities()` -> `GET /appointments/facilities`
- `listDoctorsByFacility(facilityId)` -> `GET /appointments/facilities/:facilityId/doctors`
- `listAvailability(params)` -> `GET /appointments/availability`

**Step 2: Reuse shared types**
- Return typed arrays from `@medicore/shared-types`.

**Step 3: Verify**
- Run: `cd apps/web && pnpm exec tsc --noEmit`
- Expected: client type-safe and builds.

---

### Task 5: Replace Manual ID Inputs with Guided Selectors

**Files:**
- Modify: `apps/web/src/app/(portal)/appointments/page.tsx`

**Step 1: Facility selector**
- Replace free-text facility input with `<select>` fed by `listFacilities()`.

**Step 2: Doctor selector**
- Populate doctors after facility change; reset doctor/slot when facility changes.

**Step 3: Slot picker**
- Add date picker + slot grid from `listAvailability()`.
- Save selected slot as booking `startTime`.

**Step 4: Preserve existing flows**
- Keep current cancel/reschedule logic unchanged.

**Step 5: Verify (manual)**
- Run: `cd apps/web && pnpm dev`
- Check: `Book New Appointment` path = select facility -> select doctor -> choose available slot -> submit.

---

### Task 6: Add API Unit Tests for New Portal Read Endpoints

**Files:**
- Create: `apps/api/src/portal/portal.controller.spec.ts`
- Optionally modify: `apps/api/src/portal/portal.service.ts` (for testability helpers)

**Step 1: Write failing tests**
- should return facilities for patient org
- should return doctors only for selected facility
- should return availability slots for doctor/facility/date
- should reject invalid facility/doctor combos

**Step 2: Implement minimal mocks + handlers**
- Mock Prisma + SchedulingService dependencies.

**Step 3: Verify**
- Run: `cd apps/api && pnpm test -- --runInBand src/portal/portal.controller.spec.ts`
- Expected: tests pass.

---

### Task 7: Add Web Interaction Test for Guided Booking Form

**Files:**
- Create: `apps/web/src/app/(portal)/appointments/page.test.tsx`

**Step 1: Write failing test**
- flow test for selecting facility -> doctor -> slot enabling Book button.

**Step 2: Mock portal API client methods**
- `listFacilities`, `listDoctorsByFacility`, `listAvailability`, `book`.

**Step 3: Verify**
- Run: `cd apps/web && pnpm vitest run src/app/(portal)/appointments/page.test.tsx`
- Expected: test passes.

---

### Task 8: Final Validation + Changelog

**Files:**
- Modify: `CHANGELOG.md`

**Step 1: Run full typechecks**
- `cd apps/api && pnpm exec tsc --noEmit`
- `cd apps/web && pnpm exec tsc --noEmit`

**Step 2: Add changelog session entry**
- Document guided booking UX + new portal read endpoints + tests.

**Step 3: Verify done criteria**
- Portal booking no longer requires manual IDs.
- Slot selection uses real availability.
- Cancel/reschedule still works.
- Typecheck + targeted tests pass.

---

## Done When

- [ ] Portal exposes facilities/doctors/availability read endpoints under `/portal/appointments/*`.
- [ ] Portal appointments page uses guided selectors and slot chips (no free-text IDs).
- [ ] Booking mutation still uses canonical endpoint and succeeds.
- [ ] Existing cancel/reschedule behavior remains functional.
- [ ] API + web typechecks pass.
- [ ] New targeted API/web tests pass.
- [ ] Changelog updated.

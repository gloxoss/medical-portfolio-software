# Encounter API Contract Notes

Date: 2026-04-12
Owner: API/Clinical Workspace
Scope: Encounter routes under /api/v1/encounters in apps/api/src/encounters/encounters.controller.ts

## Headers and Auth
- Auth: Bearer JWT (staff token)
- Guards: JwtAuthGuard + PermissionsGuard
- Required header where applicable: x-facility-id (required for encounter create and generally expected by tenant-aware clients)

## Route Contract Summary

| Route | Permission | Success | Common Errors | Notes |
|---|---|---|---|---|
| POST /encounters | encounter.write | 201 Created | 400 (missing x-facility-id) | Opens new encounter |
| GET /encounters/:id | encounter.read | 200 OK | 404 (not found) | Returns full encounter document |
| PUT /encounters/:id/vitals | encounter.write | 200 OK | 400 (invalid payload), 422 (signed-off lock) | Partial vitals update |
| PUT /encounters/:id/soap | encounter.write | 200 OK | 400 (invalid payload), 422 (signed-off lock) | Partial SOAP update |
| POST /encounters/:id/diagnoses | encounter.write | 200 OK | 400 (invalid diagnosis dto), 422 (signed-off lock) | Adds ICD-10 diagnosis |
| DELETE /encounters/:id/diagnoses/:code | encounter.write | 200 OK | 404 (encounter/diagnosis not found), 422 (signed-off lock) | Removes ICD-10 diagnosis by code |
| POST /encounters/:id/prescriptions | prescription.write | 200 OK | 400 (invalid payload), 422 (clinical guard or signed-off lock) | Adds prescription with allergy checks |
| POST /encounters/:id/lab-orders | lab.write | 200 OK | 400 (invalid payload), 422 (signed-off lock) | Adds lab order |
| POST /encounters/:id/sign-off | encounter.sign | 200 OK | 400 (doctor mismatch), 409 (already signed off), 422 (assessment missing) | Locks encounter and triggers billing side effects |
| GET /encounters/patients/:patientId/encounters?page=&limit= | encounter.read | 200 OK | 400 (invalid query shape) | Patient encounter history pagination |

## Verified Coverage Snapshot
- Controller route-level tests: apps/api/src/encounters/encounters.controller.spec.ts
  - includes forwarding, payload validation failures, not-found mapping, and guard-denial cases for write/sign routes.
- Service guard tests: apps/api/src/encounters/encounters.service.spec.ts
  - includes signed-off immutability and diagnosis/prescription constraints.
- Focused e2e harness tests: apps/api/test/encounters.e2e-spec.ts
  - includes diagnosis delete and sign-off response mapping scenarios.

## Consumer Notes
- Web diagnosis search and chip actions are persistence-backed:
  - add: POST /encounters/:id/diagnoses
  - remove: DELETE /encounters/:id/diagnoses/:code
- ICD search is API-backed via GET /api/v1/icd10/search and should not use local hardcoded lists.

## Outstanding Contract Hardening
1. Promote focused e2e route tests to AppModule-backed e2e (real module wiring, repository/database dependencies) when integration infra is available.
2. Add explicit OpenAPI examples for diagnosis/prescription/lab payloads and signed-off error responses.

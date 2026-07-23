# MediCore HIS Ops Dashboard
## Full Tour and Testing Guide

> Note: For full product-wide auditing and implementation planning across all modules, use `docs/TOUR-full-app-audit-playbook.md`.

Version: 1.0  
Date: 2026-04-13  
Owner: Ops Dashboard Track

---

## Summary
This guide gives you a full, practical tour to test the current Ops Dashboard implementation end-to-end, identify what works, detect what is incomplete, and resolve issues quickly.

It is designed for:
- Manual QA walkthroughs
- Developer self-testing
- Demo readiness checks
- Debugging and triage

---

## Context

### Current Scope
This guide focuses on the implemented dashboard slice:
- Web route: `/ops/dashboard`
- API modules: `analytics`, `scheduling`
- Live transport: short-lived SSE token + event stream
- Data transport: snapshot polling + period overview + monthly appointment density endpoint

### What Is Implemented
- Dashboard shell and widgets (including right rail)
- Query provider and React Query hooks
- Analytics controller endpoints and route guards
- Scheduling monthly counts endpoint
- API e2e coverage for core analytics route contracts

### Known Gaps (Important)
- Analytics datasource adapter is still placeholder and throws `Analytics data source is not implemented`
- Scheduling monthly counts service currently returns empty data object
- Several linked Ops pages are not yet present (expected 404 until built)

---

## System Map

### Frontend Runtime Flow
1. Dashboard page attempts to build server context from env values.
2. If context exists, server prefetches snapshot once.
3. Client initializes React Query snapshot polling (60s) and period overview query.
4. Client requests SSE token and opens EventSource stream.
5. UI merges snapshot and live updates into right-rail widgets.

### Backend Runtime Flow
1. Request hits guard chain:
   - Bearer token check
   - Role check via `x-role`
2. Controller validates tenant headers (`x-org-id`, `x-facility-id`).
3. Service orchestrates repository methods and cache behavior.
4. For live stream:
   - Client requests stream token
   - Client opens SSE with token
   - Server consumes token and emits events

---

## Tour Goals and Acceptance

### Goals
- Confirm app boots and route renders.
- Confirm API contracts and auth/role behavior.
- Confirm UI state handling for success, empty, error, disconnected.
- Confirm troubleshooting path from symptom to root cause.

### Acceptance Criteria for This Tour
- You can execute all flows in this guide without ambiguity.
- You can clearly separate:
  - Real implementation defects
  - Known placeholder behavior
- You can produce a clean issue list with reproducible steps.

---

## Prerequisites

### Local Services
- Node and pnpm installed
- Docker available (for Redis)

### Required Ports
- Web: `3000`
- API: `3001`
- Redis: `6379`

### Environment Baseline
Use `infra/env.template` as baseline for API values.

Create `apps/web/.env.local` with at least:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_ORG_ID=org-1
NEXT_PUBLIC_DEFAULT_FACILITY_ID=facility-1
NEXT_PUBLIC_DEFAULT_ROLE=doctor
DASHBOARD_BEARER_TOKEN=test-token

# Optional feature toggles
NEXT_PUBLIC_FEATURE_PORTAL_LINKS=false
NEXT_PUBLIC_FEATURE_TELEMEDICINE=false
NEXT_PUBLIC_FEATURE_ONBOARDING=false
```

Notes:
- `DASHBOARD_BEARER_TOKEN` is required for dashboard API calls from web.
- If the role is outside allowed roles, dashboard route redirects.

---

## Startup Procedure (Flow 0)

### Step 0.1 - Start Redis
```powershell
docker compose -f infra/docker-compose.yml up -d redis
```
Expected:
- Redis container starts
- No crash loops

### Step 0.2 - Start API
```powershell
pnpm --filter api dev
```
Expected:
- Nest app starts on `http://localhost:3001`
- Routes mapped for analytics and scheduling

### Step 0.3 - Start Web
```powershell
pnpm --filter web dev
```
Expected:
- Next app starts on `http://localhost:3000`

### Step 0.4 - Open Dashboard
- Visit `http://localhost:3000/ops/dashboard`

Expected:
- Page renders shell and dashboard sections
- No full-page crash

---

## Full Functional Tour

## Flow 1 - Dashboard Surface Tour (UI)

### Objective
Validate visual structure and core UI states.

### Steps
1. Open `/ops/dashboard`.
2. Observe top shell (sidebar + top bar).
3. Verify Quick Actions card is visible.
4. Verify KPI row renders 4 cards.
5. Verify chart sections render:
   - Top services
   - Sales vs expense
   - Top diagnoses
   - Top treatments
6. Verify latest data tables render:
   - Latest logs
   - Latest transactions
7. Verify right rail renders:
   - Period overview
   - Mini calendar
   - Bed occupancy
   - Disease alerts
   - Hospital counters
   - Staff on duty

### Expected Current Behavior
- Layout and component shells render.
- Some widgets may show empty/placeholder data due backend datasource gap.

### Pass Criteria
- UI remains stable and interactive.
- No rendering exceptions in browser console.

---

## Flow 2 - API Contract Tour

### Objective
Validate route contracts and auth/role gate behavior.

### Common Headers
Use these headers for authorized checks:
- `authorization: Bearer test-token`
- `x-org-id: org-1`
- `x-facility-id: facility-1`
- `x-role: doctor`

### Step 2.1 - Stream Token
```powershell
curl.exe -X POST "http://localhost:3001/analytics/hospital-dashboard/stream-token" ^
  -H "authorization: Bearer test-token" ^
  -H "x-org-id: org-1" ^
  -H "x-facility-id: facility-1" ^
  -H "x-role: doctor"
```
Expected:
- `201` with `{ "token": "..." }`

### Step 2.2 - Expired/Invalid Stream Token
```powershell
curl.exe "http://localhost:3001/analytics/hospital-dashboard/stream?token=expired"
```
Expected:
- `401`

### Step 2.3 - Snapshot Endpoint
```powershell
curl.exe "http://localhost:3001/analytics/hospital-dashboard" ^
  -H "authorization: Bearer test-token" ^
  -H "x-org-id: org-1" ^
  -H "x-facility-id: facility-1" ^
  -H "x-role: doctor"
```
Expected now:
- May return `503` until analytics datasource adapter is implemented.

### Step 2.4 - Period Overview
```powershell
curl.exe "http://localhost:3001/analytics/hospital-dashboard/period-overview?period=month" ^
  -H "authorization: Bearer test-token" ^
  -H "x-org-id: org-1" ^
  -H "x-facility-id: facility-1" ^
  -H "x-role: doctor"
```
Expected now:
- May return `503` until analytics datasource adapter is implemented.

### Step 2.5 - Scheduling Monthly Counts
```powershell
curl.exe "http://localhost:3001/scheduling/appointments/monthly-counts?year=2026&month=4" ^
  -H "authorization: Bearer test-token" ^
  -H "x-org-id: org-1" ^
  -H "x-facility-id: facility-1" ^
  -H "x-role: doctor"
```
Expected now:
- `200` with `{"counts": {}}` until service implementation is completed.

---

## Flow 3 - Live Stream and Reconnection Tour

### Objective
Validate live connection lifecycle and UI status handling.

### Steps
1. Load dashboard and keep browser console open.
2. Confirm connection status indicators appear/disappear correctly.
3. Temporarily stop API process.
4. Observe UI enters reconnect/error/disconnected states.
5. Restart API process.
6. Reload dashboard and confirm recovery.

### Expected Current Behavior
- Connection state banners react to SSE failures.
- With datasource placeholders, live data itself may remain static/empty.

### Pass Criteria
- No hard crash during disconnect/reconnect cycles.
- UI state transitions are understandable.

---

## Flow 4 - Calendar Density Tour

### Objective
Validate mini calendar controls and density fetch behavior.

### Steps
1. In right rail, use Prev/Next month buttons.
2. Confirm month label updates.
3. Inspect network calls for monthly counts endpoint.
4. Click a day cell and verify navigation intent to appointments route.

### Expected Current Behavior
- Grid and month navigation work.
- Density dots likely absent/minimal until scheduling service returns real counts.
- Day links may navigate to not-yet-built route.

---

## Flow 5 - Navigation and Link Integrity Tour

### Objective
Detect broken or not-yet-implemented route links.

### Steps
1. From sidebar, click each visible Ops item.
2. From Quick Actions, click each button.
3. Record outcome:
   - Works as expected
   - 404 (known missing page)
   - Wrong redirect

### Expected Current Behavior
- Dashboard route works.
- Some linked routes are expected to 404 in current scope.

### Recommendation
If demo mode is required now, hide non-ready links via feature flags or temporary guarded navigation.

---

## Negative and Security Behavior Tour

## Flow 6 - Auth Header Missing

### Steps
1. Remove `DASHBOARD_BEARER_TOKEN` from web env.
2. Reload dashboard.

Expected:
- UI warning that required context headers/auth are missing.
- No hard crash.

## Flow 7 - Role Rejection

### Steps
1. Set `NEXT_PUBLIC_DEFAULT_ROLE=patient`.
2. Reload dashboard.

Expected:
- Redirect away from dashboard due role policy.

## Flow 8 - Tenant Missing

### Steps
1. Remove `NEXT_PUBLIC_DEFAULT_ORG_ID` or `NEXT_PUBLIC_DEFAULT_FACILITY_ID`.
2. Reload dashboard.

Expected:
- Querying disabled and context warning shown.

---

## Finding Problems: Diagnostic Matrix

| Symptom | Fast Check | Likely Cause | Fix Path |
|---|---|---|---|
| 401 on stream-token | Verify `authorization` header | Missing/invalid bearer token | Add valid Bearer token in env/request headers |
| 403 on analytics routes | Check `x-role` header | Role missing or not allowed | Use allowed role: doctor/nurse/receptionist/facility-admin/super-admin |
| 503 on snapshot/period | API logs + service path | Analytics datasource adapter is placeholder | Implement adapter methods in analytics datasource |
| Calendar always empty | Inspect monthly-counts response | Scheduling service returns empty object | Implement `getMonthlyAppointmentCounts` logic |
| UI banners stuck on reconnect | Check API availability and SSE token call | API down, token failure, or upstream snapshot failure | Restore API, validate token route, then datasource readiness |
| Clicking links goes 404 | Route file search in web app | Page not implemented yet | Add page or hide link behind flags |

---

## Solving Problems: Implementation Playbooks

## Playbook A - Analytics Data Source

### Target
Replace placeholder throws with real tenant-scoped queries.

### Files
- `apps/api/src/modules/analytics/analytics.datasource.ts`
- Related data access providers/repositories

### Must-Have Outcomes
- Snapshot endpoint returns `200` with full payload.
- Period overview endpoint returns `200` with realistic values.
- Live stream snapshot tick can emit usable data.

## Playbook B - Scheduling Monthly Counts

### Target
Return daily appointment count map for requested month.

### File
- `apps/api/src/modules/scheduling/scheduling.service.ts`

### Must-Have Outcomes
- API returns non-empty `counts` for days with appointments.
- Mini calendar dots reflect actual density.

## Playbook C - Route Readiness Hardening

### Target
Remove demo-breaking dead links.

### Files
- `apps/web/app/(ops)/layout.tsx`
- `apps/web/components/dashboard/QuickActionsBar.tsx`
- Feature toggles in web env/flags

### Must-Have Outcomes
- No accidental 404 from visible nav during demo.

---

## Test Evidence Capture Template

Use this table while executing the tour:

| Flow | Step | Result | Evidence | Notes |
|---|---|---|---|---|
| Flow 1 | KPI row renders | PASS/FAIL | screenshot or terminal output | |
| Flow 2 | stream-token 201 | PASS/FAIL | curl output | |
| Flow 3 | reconnect state transition | PASS/FAIL | screenshot/video | |
| Flow 4 | month navigation | PASS/FAIL | screenshot | |
| Flow 5 | sidebar links | PASS/FAIL | route list | |

---

## Issue Reporting Template

When a defect is found, report with this format:

### Title
`[Ops Dashboard] <short issue summary>`

### Environment
- Branch/commit:
- OS:
- Browser:
- API/Web running commands:

### Reproduction Steps
1.
2.
3.

### Expected

### Actual

### Evidence
- Screenshot/log snippet/request payload

### Suspected Layer
- Frontend / API Controller / Service / Data Source / Infra

---

## Definition of Done for This Dashboard Slice

This slice is considered production-ready when all are true:
- Snapshot and period endpoints return `200` with real tenant-scoped data.
- SSE live feed remains stable and useful during normal operation.
- Monthly appointment density returns real counts.
- No visible nav route leads to unintended 404 during normal user path.
- Dashboard handles loading, empty, error, and disconnected states clearly.

---

## Next Steps

1. Implement analytics datasource adapter methods with real data integration.
2. Implement monthly appointment count aggregation in scheduling service.
3. Harden user journey by hiding or implementing currently missing linked routes.
4. Re-run this exact tour and publish PASS/FAIL evidence table.

---

## Quick Command Reference

```powershell
# Redis
docker compose -f infra/docker-compose.yml up -d redis

# API dev server
pnpm --filter api dev

# Web dev server
pnpm --filter web dev

# Analytics stream-token
curl.exe -X POST "http://localhost:3001/analytics/hospital-dashboard/stream-token" -H "authorization: Bearer test-token" -H "x-org-id: org-1" -H "x-facility-id: facility-1" -H "x-role: doctor"

# Snapshot
curl.exe "http://localhost:3001/analytics/hospital-dashboard" -H "authorization: Bearer test-token" -H "x-org-id: org-1" -H "x-facility-id: facility-1" -H "x-role: doctor"

# Period overview
curl.exe "http://localhost:3001/analytics/hospital-dashboard/period-overview?period=month" -H "authorization: Bearer test-token" -H "x-org-id: org-1" -H "x-facility-id: facility-1" -H "x-role: doctor"

# Monthly counts
curl.exe "http://localhost:3001/scheduling/appointments/monthly-counts?year=2026&month=4" -H "authorization: Bearer test-token" -H "x-org-id: org-1" -H "x-facility-id: facility-1" -H "x-role: doctor"
```

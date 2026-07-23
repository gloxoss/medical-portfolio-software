# Changelog

## 2026-04-13 - Ops Dashboard Step 4

### Planning and Blueprint
- Executable step plan finalized in docs/PLAN-ops-dashboard.md with Session 0-3 sequencing.
- Route path alignment confirmed to /ops/dashboard for App Router behavior.

### Implementation Sessions
- Session 0 completed: dependencies, shell scaffold, route groups, token CSS.
- Session 1 completed: analytics types, repository, service, controller, SSE token flow, focused tests.
- Session 2 completed: dashboard shell plus KPI/charts/rankings/live widgets, period cards, latest tables, mini-calendar.
- Session 3 in progress: feature-flag navigation, quick actions, loading/error route states, scheduling monthly-counts endpoint.
- Session 3 validation gate: added analytics API e2e coverage in apps/api/test/analytics-hospital-dashboard.e2e-spec.ts for stream-token, snapshot, period overview, and expired-token paths.

### Showcase
- Added static showcase artifact set in showcase/006-ops-dashboard/:
  - index.html
  - LEARN.md
  - social-caption.md

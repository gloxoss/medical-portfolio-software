# PLAN: Hospital Operations Dashboard (Step 4 Feature Blueprint)

## Summary
- Objective: deliver a production-ready operations dashboard planning blueprint for the single provided screenshot, with no source code in this artifact.
- Delivery mode: four-session execution plan with explicit task dependencies, context briefs, verification gates, and done criteria.
- Architectural decisions locked:
  - New operations route target: /ops/dashboard.
  - Existing admin dashboard remains untouched.
  - Hybrid freshness model: SSE for live counters and 60s polling for aggregate snapshot.
  - New dedicated analytics backend module and unified snapshot endpoint.
  - Non-visible modules are frozen from navigation, not deleted.
  - SSE auth uses short-lived exchange token (not full JWT in query param — see T4).
  - Feature flags implemented as env-variable constants (see T15).

## Context
- Source of truth: single Hospital Operations Dashboard screenshot.
- Existing design system: DESIGN.md. design-tokens.css must be generated from DESIGN.md tokens as part of Session 0 (T0c).
- Shell components and route groups do not yet exist — they are created in Session 0 (T0a, T0b).
- Important routing note: route-group names do not affect URL path segments. The implementation path must resolve to /ops/dashboard in final routing behavior.
- Next.js version: 16.2.2. File conventions are App Router standard. Critical breaking change: error.tsx retry prop is `unstable_retry` (not `reset`). Verify any other convention changes against `node_modules/next/dist/docs/` before implementing Session 2 tasks.
- NestJS version: 11. No Redis, no EventEmitter2, no TanStack Query installed yet — Session 0 installs all prerequisites.
- Frontend directory root: `apps/web/` — there is no `src/` folder. All paths use `apps/web/app/` for routes and `apps/web/components/`, `apps/web/lib/` for shared code.

## Scope Boundaries
- In scope:
  - Session 0: prerequisites — package installs, shell scaffold, route groups, design token CSS.
  - Planning and sequencing for analytics backend, dashboard page composition, widget ecosystem, navigation integration, and hardening tests.
  - Explicit API contract plan and live/polled data responsibilities.
- Out of scope:
  - Deleting existing modules.

## Session Plan

| Session | Target Duration | Primary Outcome | Task Range |
|---|---:|---|---|
| Session 0 | ~1.5h | Prerequisites — packages, shell, route groups, design tokens | T0a-T0d |
| Session 1 | ~3h | Analytics backend contract + aggregation + transport layer | T1-T6 |
| Session 2 | ~4h | Dashboard UI route + widgets + visual data composition | T7-T14 |
| Session 3 | ~1.5h | Navigation integration + hardening + integration gate + showcase | T15-T19 |

## Dependency Graph

Phase 0 graph (strict serial — each scaffold depends on the previous):
- T0a -> T0b -> T0c -> T0d

Phase 1 graph (strict serial — type contract drives all downstream):
- T1 -> T2 -> T3 -> T4 -> T5 -> T6

Phase 2 graph (partial parallel after shell):
- T7 (shell) -> [T8, T9, T10] in parallel -> T11 (live counters, needs all snapshot widgets stable) -> [T12, T13, T14] in parallel

Phase 3 graph:
- T15 -> T16 -> T17 -> T18 -> T19

Cross-phase dependencies:
- Session 1 starts only after T0d is complete.
- Session 2 starts only after T6 is complete.
- Session 3 starts after T14 baseline rendering is complete.

## Micro-Blueprint

### Blueprint Metadata
- Blueprint ref: OPS-DASH-STEP4
- Screen ref: Screen 1 (Hospital Operations Dashboard)
- Total size: 4 sessions
- Goal: plan the complete backend and frontend alignment required to ship a screenshot-faithful operations dashboard with hybrid live data behavior and safe rollout controls.

---

## Session 0: Prerequisites and Scaffold (Phase 0)

### [ ] T0a: Package Installs
Context Brief: the codebase is a bare NestJS + Next.js monorepo with no Redis client, event bus, React Query, or SSE utilities installed. Every subsequent task depends on these packages being present.

Backend packages to install in `apps/api`:
- `@nestjs/cache-manager` + `cache-manager` — Redis-backed cache module
- `cache-manager-ioredis-yet` or `@keyv/redis` — Redis store adapter
- `ioredis` — Redis client
- `@nestjs/event-emitter` + `eventemitter2` — EventEmitter2 bus for SSE fan-out
- `@nestjs/config` — env config module

Frontend packages to install in `apps/web`:
- `@tanstack/react-query` — snapshot polling and period-overview on-demand fetch
- `@tanstack/react-query-devtools` — devtools (devDependency)

Infrastructure check:
- Confirm Redis is available via `infra/docker-compose.yml` — add Redis service if absent.

Verification:
- [ ] All packages resolve at workspace root with no peer conflict.
- [ ] `docker compose up -d redis` starts Redis cleanly.
- [ ] NestJS app boots after cache module wiring.

Dependencies:
- None.

---

### [ ] T0b: Shell Components
Context Brief: the plan's Context section references shell-layout.tsx, sidebar.tsx, and top-bar.tsx as existing, but the web app is a bare Next.js scaffold. These must be created before any dashboard composition can reference them.

Target files:
- `apps/web/components/shell/shell-layout.tsx`
- `apps/web/components/shell/sidebar.tsx`
- `apps/web/components/shell/top-bar.tsx`

Planned structure:
- `ShellLayout`: accepts `sidebar` and `topBar` slots plus `children`. Renders the two-panel chrome at full viewport height. Server Component safe.
- `Sidebar`: receives nav item config array. Renders vertical nav with active-route highlighting. Renders nothing for frozen items (flag-controlled, see T15).
- `TopBar`: renders page title slot and user context zone. Accepts page title as prop.

Design constraints:
- Token-only colors from DESIGN.md (applied via design-tokens.css generated in T0c).
- Dark-mode-native: sidebar background `--bg-sidebar`, surface `--bg-surface`, text hierarchy from DESIGN.md.

Verification:
- [ ] ShellLayout renders in root layout without error.
- [ ] Sidebar accepts nav config and renders items.
- [ ] TopBar renders title slot correctly.

Dependencies:
- T0a complete.

---

### [ ] T0c: Design Tokens CSS
Context Brief: the plan references design-tokens.css throughout, but only DESIGN.md exists. A CSS custom property file must be generated from the DESIGN.md token tables before any styled component can consume them.

Target file:
- `apps/web/app/design-tokens.css`

Planned token groups to extract from DESIGN.md:
- Background surfaces (dark and light mode).
- Text and content.
- Border and divider.
- Status colors (amber, red, emerald, teal, blue).
- Clinical accent (teal, green).
- Typography scale.
- Spacing and radius.

Rules:
- All tokens are CSS custom properties under `:root`.
- Dark mode variants are grouped under `[data-theme="dark"]` or `@media (prefers-color-scheme: dark)` — match DESIGN.md convention.
- No hardcoded hex values in any component file — always reference a token.

Verification:
- [ ] File imports cleanly from `globals.css`.
- [ ] A test component referencing `var(--bg-surface)` renders correctly.
- [ ] Token names match what DESIGN.md specifies.

Dependencies:
- T0b (shell must exist to validate token consumption).

---

### [ ] T0d: Route Group Scaffolds
Context Brief: the Next.js app has only a root `app/layout.tsx` and `app/page.tsx`. The ops, admin, and clinical route groups and their layout wrappers must exist before any session-specific page can be added.

Target files:
- `apps/web/app/(ops)/layout.tsx` — ops shell layout wrapper
- `apps/web/app/(admin)/layout.tsx` — admin shell layout wrapper (stub)
- `apps/web/app/(clinical)/layout.tsx` — clinical shell layout wrapper (stub)

Planned behavior:
- `(ops)/layout.tsx` imports ShellLayout, Sidebar, and TopBar. Wires ops-specific nav config.
- Admin and clinical layouts are minimal stubs — just `{children}` passthrough until those portals are built.
- Route group folder names do not appear in URLs per Next.js App Router convention.

Verification:
- [ ] `apps/web/app/(ops)/layout.tsx` compiles with no type errors.
- [ ] A placeholder page at `apps/web/app/(ops)/ops/dashboard/page.tsx` (just `<h1>ops dashboard</h1>`) is reachable at `/ops/dashboard` in dev server.
- [ ] Admin and clinical layout stubs compile.

Dependencies:
- T0c complete.

---

## Session 1: Backend Analytics Module (Phase 1)

### [ ] T1: Shared Analytics Types
Context Brief: establish a single typed contract for all dashboard snapshot and live payloads before any repository or controller work to prevent schema drift. `packages/shared-types/src/analytics.ts` does not yet exist — it must be created and the index updated.

Target files (create new):
- `packages/shared-types/src/analytics.ts`

Target files (update):
- `packages/shared-types/src/index.ts` — add `export * from './analytics'`

Planned outputs:
- `HospitalDashboardSnapshot` aggregate shape.
- `DashboardKpis`, `HospitalCounters`, `PeriodOverview` sub-shapes.
- `RankedItem` and time-series structures for charts and tables.
- Live payload shapes:
  - `BedOccupancyLive`
  - `StaffOnDutyLive`
  - `DiseaseAlertLive` and `DiseaseAlert`
- `DiseaseAlertStatus` union: `'routine' | 'watch' | 'alert' | 'outbreak'`
- `SseEventType` discriminated union for controller stream typing.

Contract constraints:
- No `any` types.
- Currency must come from org settings contract field — type it as `string` (ISO 4217 code).
- Monetary values represented in smallest unit (integer cents/fils) from backend.
- `generatedAt` is an ISO 8601 string on `HospitalDashboardSnapshot`.

Verification:
- [ ] `analytics.ts` is a new file — confirm it does not exist before creating.
- [ ] Type definitions exported through shared-types index.
- [ ] Type check passes across workspace with no contract errors.

Dependencies:
- T0d complete.

---

### [ ] T2: Analytics Repository
Context Brief: isolate all tenant-scoped data access in one repository so service orchestration remains deterministic and testable.

Target file:
- `apps/api/src/modules/analytics/analytics.repository.ts`

Planned repository methods:
- `getDashboardKpis(tenant, period)`
- `getTopServices(tenant, limit)`
- `getTopDiagnoses(tenant, limit)`
- `getTopTreatments(tenant, limit)`
- `getSalesVsExpense(tenant, months)`
- `getLatestLogs(tenant, limit)`
- `getLatestTransactions(tenant, limit)`
- `getHospitalCounters(tenant)`
- `getPeriodOverview(tenant)`

Data rules:
- Every query must include `org_id` and `facility_id` tenant filters — no query runs without both.
- Independent query blocks are parallelized with `Promise.all` (no unnecessary serial waits).
- Monetary values remain raw integer values — no formatting at repository layer.

Verification (TDD):
- [ ] Write failing tests first (RED).
- [ ] Implement minimum logic to pass tests (GREEN).
- [ ] Refactor query composition and naming after green (REFACTOR).
- [ ] Unit tests cover shape for all repository methods.
- [ ] Cross-tenant isolation test: confirms empty/no-leak behavior when wrong `org_id` or `facility_id` is passed.

Dependencies:
- T1 complete.

---

### [ ] T3: Analytics Service
Context Brief: central orchestration layer that assembles a unified snapshot and handles cache/read strategy for predictable polling performance. Redis must be configured in the NestJS app module before this task (confirmed in T0a).

Target file:
- `apps/api/src/modules/analytics/analytics.service.ts`

Planned service methods:
- `getSnapshot(tenant): Promise<Result<HospitalDashboardSnapshot, AppError>>`
- `getLiveBedOccupancy(tenant): Promise<Result<BedOccupancyLive, AppError>>`
- `getLiveStaffOnDuty(tenant): Promise<Result<StaffOnDutyLive, AppError>>`
- `getLiveDiseaseAlerts(tenant): Promise<Result<DiseaseAlertLive, AppError>>`

Service behavior:
- Snapshot:
  - Parallel call orchestration for all repository methods via `Promise.all`.
  - Adds `generatedAt` ISO timestamp before caching.
  - Redis cache key: `dashboard:snapshot:{orgId}:{facilityId}`.
  - TTL: 60 seconds.
- Live feeds:
  - Bed occupancy returns explicit Phase 1 stub with `// TODO(IPD-INTEGRATION)` marker.
  - Staff on duty computed from existing user-role data.
  - Disease alerts sourced from `disease_alerts` data store.

Result contract and error mapping:
- Service layer returns `Result<T, AppError>` instead of throwing operational failures.
- Controller unwraps `Result` and maps unavailable dashboard operations to `503 Service Unavailable`.
- 503 is intentional for degraded operational state — not a generic 500 bug signal.

Verification (TDD):
- [ ] Write failing tests first (RED).
- [ ] Implement minimum logic to pass tests (GREEN).
- [ ] Refactor cache orchestration and result mapping (REFACTOR).
- [ ] Cache-hit path bypasses repository calls.
- [ ] Cache-miss path runs repository orchestration and stores cache.
- [ ] Parallel orchestration verified via unit tests (spy on repository — confirm all methods called in one tick).

Dependencies:
- T2 complete.

---

### [ ] T4: Analytics Controller
Context Brief: expose a unified snapshot endpoint and live SSE stream with strict auth and role policy. SSE auth must use a short-lived exchange token — not the full JWT in a URL query parameter — to prevent token leakage in server logs and browser history. This is a clinical system and JWTs in logs are a compliance risk.

Target file:
- `apps/api/src/modules/analytics/analytics.controller.ts`

Planned routes:
- `POST /analytics/hospital-dashboard/stream-token` — issues a short-lived (30s TTL) SSE token stored in Redis; returns `{ token: string }`. Requires JWT auth.
- `GET /analytics/hospital-dashboard` — snapshot endpoint. JWT required.
- `GET /analytics/hospital-dashboard/stream?token=<sse-token>` — SSE stream. Validates short-lived token from Redis (not JWT). Token is single-use: consumed on first valid connect.
- `GET /analytics/hospital-dashboard/period-overview?period=today|month|year` — JWT required.

Auth and behavior rules:
- JWT required for snapshot, period-overview, and stream-token endpoints.
- Multi-role access: doctor, nurse, receptionist, facility admin, super admin.
- SSE route validates Redis short-lived token on connect — rejects if expired or already consumed.
- Snapshot response emits `Cache-Control: max-age=60, must-revalidate`.
- SSE emits:
  - Timed push every 30 seconds.
  - Event-driven updates on Redis messages: `bed.updated`, `staff.checkin`, `staff.checkout`, `alert.updated`.

SSE Redis wiring pattern:
- Controller injects a dedicated Redis subscriber client (separate from publisher/cache paths).
- `onModuleInit` subscribes to: `bed.updated`, `staff.checkin`, `staff.checkout`, `alert.updated`.
- Incoming Redis messages are forwarded to the local EventEmitter2 bus (installed in T0a).
- SSE handler streams from EventEmitter2 into the NestJS SSE observable pipeline (`@Sse` + `Observable<MessageEvent>`).
- No existing event-driven module to reference — define the subscriber pattern from scratch in this module.

Migration and seed plan:
- Add `disease_alerts` table/collection migration.
- Seed initial conditions:
  - Dengue Fever (`status: 'watch'`)
  - Sepsis (`status: 'alert'`)
  - Routine Checkup (`status: 'routine'`)

Verification (TDD):
- [ ] Write failing tests first (RED).
- [ ] Implement minimum logic to pass tests (GREEN).
- [ ] Refactor stream wiring and guard checks (REFACTOR).
- [ ] Integration tests for all four routes and response shapes.
- [ ] Unauthenticated calls to JWT-guarded routes return 401.
- [ ] SSE connect with expired or consumed token returns 401.
- [ ] SSE stream emits at least one event quickly after valid connect.
- [ ] `stream-token` endpoint returns a token that is single-use.

Dependencies:
- T3 complete.

---

### [ ] T5: Analytics API Client
Context Brief: provide typed frontend transport wrappers and a resilient SSE connection manager. SSE auth uses the exchange token issued by `POST /analytics/hospital-dashboard/stream-token` — not the full JWT.

Target file:
- `apps/web/lib/api/analytics.api.ts`

Planned client responsibilities:
- `fetchDashboardSnapshot(): Promise<HospitalDashboardSnapshot>` — typed fetch.
- `fetchPeriodOverview(period): Promise<PeriodOverview>` — typed fetch.
- `requestSseToken(): Promise<string>` — calls `POST /stream-token` with JWT, returns short-lived token.
- `connectDashboardStream(token, handlers): () => void` — `EventSource`-based SSE manager.

SSE transport requirements:
- `EventSource`-based stream — no Axios for SSE.
- Auth token (short-lived SSE token from `requestSseToken`) passed as query parameter `?token=`.
- Auto-reconnect with exponential backoff (max 5 retries): before each reconnect, call `requestSseToken` again to get a fresh token.
- Returns cleanup function that always closes the `EventSource`.

Verification:
- [ ] Shared-types contract alignment across all client return types.
- [ ] Type check passes with strict client signatures.
- [ ] `requestSseToken` is called before each `EventSource` open (including reconnects).

Dependencies:
- T4 complete.

---

### [ ] T6: Dashboard Hooks (React Query + SSE hook)
Context Brief: define one polling hook for aggregate snapshot and one lifecycle-safe hook for live SSE data. TanStack Query must be installed (confirmed in T0a) and a `QueryClientProvider` must be wired in the ops layout before this can be consumed.

Target files:
- `apps/web/lib/hooks/useDashboard.ts`
- `apps/web/app/(ops)/layout.tsx` — add `QueryClientProvider` wrapper (update T0d layout).

Planned hooks:

`useDashboardSnapshot`:
- Refetch interval: `60_000`ms.
- `staleTime: 55_000` (5 seconds before TTL — ensures cache hit on rapid remount).
- `placeholderData: keepPreviousData` for smooth transitions.

`useLiveDashboard`:
- Single SSE subscription per mounted dashboard client.
- Connection status type: `'connecting' | 'connected' | 'error' | 'disconnected'`
  - `error`: transient failure — currently retrying. Show a subtle inline indicator (e.g., amber dot).
  - `disconnected`: retry budget exhausted, no further retry. Show persistent "Live data unavailable — reload page" banner. This is the terminal state.
- Calls `requestSseToken()` before opening the stream and before each reconnect attempt.
- Cleanup on unmount (closes `EventSource`, cancels retry timer).

`usePeriodOverview(period)`:
- On-demand query triggered by period selection.
- `staleTime: 5 * 60 * 1000` (5-minute stale window).

Verification:
- [ ] `staleTime` is `55_000`, not approximate.
- [ ] `useLiveDashboard` transitions to `disconnected` after retry exhaustion and exposes the terminal state for UI rendering.
- [ ] SSE cleanup function closes `EventSource` on component unmount.
- [ ] `error` and `disconnected` states produce distinct UI feedback.
- [ ] `QueryClientProvider` is present in `(ops)/layout.tsx`.

Dependencies:
- T5 complete.

---

## Session 2: Dashboard Page and Widget Components (Phase 2)

### [ ] T7: Ops Dashboard Page Shell and Layout
Context Brief: create the operations dashboard route and establish the two-column layout composition. Shell components (sidebar, top-bar, shell-layout) exist from T0b. Do not modify them — compose through their public props.

Target files:
- `apps/web/app/(ops)/ops/dashboard/page.tsx`
- `apps/web/components/dashboard/DashboardLayout.tsx`
- `apps/web/components/dashboard/DashboardClient.tsx`

Component boundary definition:
- `DashboardLayout`: pure structure component — renders two-column grid with named slots (main column and right rail). Server Component safe. No hook dependencies.
- `DashboardClient`: owns all hook state — mounts `useDashboardSnapshot` and `useLiveDashboard`, distributes data to child widget props. Must carry `'use client'` directive.
- `page.tsx`: server component that fetches initial snapshot (SSR handoff), passes as `initialData` to `DashboardClient` via React Query hydration or direct prop.

Planned main column:
- Quick actions bar
- KPI row
- Charts row
- Rankings row
- Logs row

Planned right rail:
- Period overview
- Mini calendar
- Bed occupancy
- Disease alerts
- Hospital counters
- Staff on duty

State handling requirements:
- Full layout skeleton (no spinner-only fallback) — `loading.tsx` must mirror final column structure.
- Retryable error boundary via `error.tsx`.

Verification (TDD):
- [ ] Write failing tests first (RED).
- [ ] Implement minimum layout/client wiring to pass tests (GREEN).
- [ ] Refactor composition boundaries and props flow (REFACTOR).
- [ ] Route is reachable at `/ops/dashboard`.
- [ ] `DashboardLayout` has no hook imports — confirmed server-safe.
- [ ] `DashboardClient` is the sole SSE and query hook owner.
- [ ] Two-column behavior at large viewport and stacked layout at tablet/mobile.

Dependencies:
- T6 complete.

---

### [ ] T8: KPI Cards
Context Brief: align top KPI strip to screenshot semantics. Runs in parallel with T9 and T10 after T7 is complete.

Target file:
- `apps/web/components/dashboard/KpiCard.tsx`

Planned KPI set:
- Total Billed
- Total Deposits
- Pending Amount
- Total Expense

Rules:
- Currency always from payload contract field (ISO 4217 string).
- Trend semantics are metric-aware: revenue increase is positive (green), expense increase is negative (red), pending increase is cautionary (amber).
- Includes loading skeleton state (matches final card dimensions).
- Monetary display uses tabular number rendering (`font-variant-numeric: tabular-nums`).

Verification (TDD):
- [ ] Write failing tests first (RED).
- [ ] Implement minimum KPI rendering logic to pass tests (GREEN).
- [ ] Refactor value formatting and trend semantics (REFACTOR).
- [ ] Four cards render with typed values and correct currency.
- [ ] Trend direction and visual semantics are correct per KPI category.

Dependencies:
- T7 complete. (Parallelizable with T9 and T10.)

---

### [ ] T9: Charts Row (Top Services + Sales vs Expense)
Context Brief: implement primary visual analytics row. Runs in parallel with T8 and T10 after T7 is complete.

Target files:
- `apps/web/components/dashboard/TopServicesChart.tsx`
- `apps/web/components/dashboard/SalesVsExpenseChart.tsx`

Planned chart behavior:
- Top Services: pie with legend and percentage breakdown.
- Sales vs Expense: 12-period trend comparison.

Rules:
- Color tokens only — no hardcoded hex values.
- Responsive container behavior for mobile and desktop.
- Accessible labels and keyboard focus support.
- Tooltip values show currency-formatted numbers.

Verification:
- [ ] Both charts render with real data shape.
- [ ] Tooltip values show currency-formatted numbers.
- [ ] Mobile rendering remains readable.

Dependencies:
- T7 complete. (Parallelizable with T8 and T10.)

---

### [ ] T10: Rankings (Top Diagnoses + Top Treatments)
Context Brief: implement ranked horizontal comparison widgets. Runs in parallel with T8 and T9 after T7 is complete.

Target files:
- `apps/web/components/dashboard/TopDiagnosesChart.tsx`
- `apps/web/components/dashboard/TopTreatmentsChart.tsx`

Planned behavior:
- Top 5 items each.
- Diagnoses include ICD code plus readable description.
- Long labels truncated in chart view with full detail in tooltip.
- Tabular number rendering for count/percentage columns.

Verification:
- [ ] Top 5 rankings render for both widgets.
- [ ] Tooltip reveals full item detail when label is truncated.

Dependencies:
- T7 complete. (Parallelizable with T8 and T9.)

---

### [ ] T11: Live Counter Widgets (SSE-fed)
Context Brief: consume the shared `useLiveDashboard` hook and project into four right-rail widgets. T11 is deliberately serial after T8/T9/T10 — the SSE connection state banner must exist before the live badge logic is finalized.

Target files:
- `apps/web/components/dashboard/BedOccupancyWidget.tsx`
- `apps/web/components/dashboard/DiseaseAlertsWidget.tsx`
- `apps/web/components/dashboard/StaffOnDutyWidget.tsx`
- `apps/web/components/dashboard/HospitalCountersWidget.tsx`

Planned live widgets:
- Bed occupancy: donut + live connection status indicator. Phase 1 renders explicit stub state with `// TODO(IPD-INTEGRATION)` marker in component.
- Disease alerts: list with status badges using `DiseaseAlertStatus` exhaustive switch + `assertNever` fallback.
- Staff on duty: role-grouped counters.
- Hospital counters: count-up transitions guarded by `prefers-reduced-motion` — render final value immediately when motion is reduced.

Connection state display:
- `connected`: subtle teal live dot.
- `error` (retrying): amber dot with "Reconnecting…" tooltip.
- `disconnected` (terminal): persistent full-width amber banner "Live data unavailable — reload page".

Rules:
- One SSE subscription source (from `DashboardClient`) — no widget opens its own connection.
- Disease alert status mapping must use `assertNever` to catch unhandled statuses at compile time.

Verification (TDD):
- [ ] Write failing tests first (RED).
- [ ] Implement minimum live-widget behavior to pass tests (GREEN).
- [ ] Refactor mapping and animation behavior (REFACTOR).
- [ ] Live badge reflects all three connection states with correct visual semantics.
- [ ] Alert statuses map to routine/watch/alert/outbreak visuals via exhaustive switch.
- [ ] Counter updates are smooth and numerically stable.
- [ ] Motion-reduced environment renders final values without animation.

Dependencies:
- T8, T9, and T10 all complete.

---

### [ ] T12: Period Overview Cards
Context Brief: fast period switching for today/month/year snapshot slices. Runs in parallel with T13 and T14 after T11 is complete.

Target file:
- `apps/web/components/dashboard/PeriodOverviewCards.tsx`

Planned behavior:
- Three stacked cards: Today, This Month, This Year.
- Active period highlight state.
- On-demand fetch via `usePeriodOverview(period)` on selection.
- Loading and empty states are explicit.

Verification:
- [ ] Switching period updates shown metrics correctly.
- [ ] Loading and empty states render.
- [ ] Active card has distinct visual treatment.

Dependencies:
- T11 complete. (Parallelizable with T13 and T14.)

---

### [ ] T13: Embedded Mini Calendar Widget
Context Brief: display-only monthly appointment density widget. `openapi.yaml` does not exist in this project — the endpoint contract must be created as part of this task before implementation. Runs in parallel with T12 and T14 after T11 is complete.

Target files:
- `apps/web/components/dashboard/MiniCalendarWidget.tsx`
- `openapi.yaml` (create) — add `GET /scheduling/appointments/monthly-counts` contract before implementing the endpoint.

Supporting hook and endpoint plan:
- Create `openapi.yaml` at project root with the monthly-counts endpoint spec first.
- Then implement additive endpoint in scheduling module:
  - `GET /scheduling/appointments/monthly-counts?year=YYYY&month=MM`
  - Returns `{ counts: Record<string, number> }` where key is `YYYY-MM-DD`.
- New hook: `useMonthlyAppointmentCounts(year, month)`.

Planned widget behavior:
- Dot density per day proportional to appointment count.
- Month navigation controls.
- Day click deep-links into filtered appointments view.

Verification:
- [ ] `openapi.yaml` exists and specifies monthly-counts endpoint before endpoint implementation begins.
- [ ] Counts render per day from API map response.
- [ ] Month navigation updates dataset correctly.
- [ ] Day click forwards date filter into appointments route.

Dependencies:
- T11 complete. (Parallelizable with T12 and T14.)

---

### [ ] T14: Latest Logs and Latest Transactions Tables
Context Brief: complete screenshot lower content region with two independent recent activity tables. Runs in parallel with T12 and T13 after T11 is complete.

Target files:
- `apps/web/components/dashboard/LatestLogsTable.tsx`
- `apps/web/components/dashboard/LatestTransactionsTable.tsx`

Planned behavior:
- Latest Logs: Time, User, Action, Resource, Status columns. "View All" links to audit log route.
- Latest Transactions: Invoice, Patient, Amount, Status, Date columns. "View All" links to billing route.

Rules:
- Numeric columns use `font-variant-numeric: tabular-nums`.
- Empty states are explicit (not hidden or null-rendered).
- Up to 10 rows each.

Verification:
- [ ] Each table renders up to 10 rows from payload.
- [ ] "View All" links route correctly.
- [ ] Empty state is visible and non-blocking.

Dependencies:
- T11 complete. (Parallelizable with T12 and T13.)

---

## Session 3: Navigation Integration and Hardening (Phase 3)

### [ ] T15: Sidebar Navigation Update (Freeze Non-Visible Modules)
Context Brief: integrate operations dashboard into ops nav. Feature flags are implemented as `NEXT_PUBLIC_FEATURE_*` env-variable boolean constants in `apps/web/lib/flags.ts` — checked at render time, not at runtime API. No third-party flag service.

Target files:
- `apps/web/components/shell/sidebar.tsx`
- `apps/web/lib/flags.ts` (create)

`apps/web/lib/flags.ts` exports:
```
export const FEATURE_PORTAL_LINKS = process.env.NEXT_PUBLIC_FEATURE_PORTAL_LINKS === 'true'
export const FEATURE_TELEMEDICINE = process.env.NEXT_PUBLIC_FEATURE_TELEMEDICINE === 'true'
export const FEATURE_ONBOARDING = process.env.NEXT_PUBLIC_FEATURE_ONBOARDING === 'true'
```

Planned sidebar behavior:
- Dashboard is first item in ops nav section.
- Portal links, telemedicine links, and onboarding route links are hidden when their flag is `false`.
- Hidden routes remain directly accessible by direct URL — sidebar visibility only.

Constraints:
- No route deletion.
- Flags default to `false` unless explicitly set in `.env.local`.

Verification:
- [ ] `flags.ts` exports all three flags.
- [ ] Dashboard appears first in ops nav section.
- [ ] Frozen modules are hidden from sidebar but remain accessible by direct URL navigation.

Dependencies:
- T14 complete.

---

### [ ] T16: Quick Actions Bar
Context Brief: match screenshot top actions and shorten path-to-task for high-frequency operations.

Target file:
- `apps/web/components/dashboard/QuickActionsBar.tsx`

Planned actions:
- New Invoice — navigates to billing creation flow route.
- Add Patient — navigates to patient creation flow route.

Verification:
- [ ] Both actions navigate to their intended routes.
- [ ] Style uses tokenized button variants — no hardcoded colors.

Dependencies:
- T15 complete.

---

### [ ] T17: Route Protection, Loading, and Error States
Context Brief: ensure robust route-level UX and access policy for the operations dashboard. Critical: Next.js 16 error boundary uses `unstable_retry` prop (not `reset`). Use the exact signature from `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/error.md`.

Target files:
- `apps/web/app/(ops)/ops/dashboard/loading.tsx`
- `apps/web/app/(ops)/ops/dashboard/error.tsx`

`loading.tsx` behavior:
- Layout-accurate skeleton — two-column structure mirrors the final dashboard (main column + right rail), not a spinner.
- Server Component (default for `loading.tsx`).

`error.tsx` behavior:
- `'use client'` directive required (Next.js error boundary requirement).
- Props: `{ error: Error & { digest?: string }, unstable_retry: () => void }` — use `unstable_retry`, not `reset`.
- Renders retry button and fallback navigation link back to `/ops`.

Access policy:
- Allowed: doctor, nurse, receptionist, facility admin, super admin.
- Blocked: patient/portal-only users.
- Enforcement: middleware or route guard — specify which before implementing.

Verification:
- [ ] `loading.tsx` mirrors final dashboard two-column structure.
- [ ] `error.tsx` uses `unstable_retry` (not `reset`).
- [ ] Role-based access behavior matches policy — blocked roles receive redirect or 403.

Dependencies:
- T16 complete.

---

### [ ] T18: Integration + E2E Validation Gate
Context Brief: cross-module validation only. Task-level unit/component tests are executed in each implementation task via TDD — they are not deferred to this gate.

Target files:
- `apps/api/test/analytics-hospital-dashboard.e2e-spec.ts`
- `apps/web/app/(ops)/ops/dashboard/page.integration.test.tsx`
- `apps/web/components/dashboard/DashboardClient.sse.integration.test.tsx`

Planned integration and E2E checks:
- API contract checks:
  - `POST /analytics/hospital-dashboard/stream-token` — returns token, JWT required.
  - `GET /analytics/hospital-dashboard` — snapshot shape matches `HospitalDashboardSnapshot`.
  - `GET /analytics/hospital-dashboard/period-overview` — returns `PeriodOverview`.
  - `GET /analytics/hospital-dashboard/stream?token=<valid>` — SSE handshake and first event delivery.
  - `GET /analytics/hospital-dashboard/stream?token=<expired>` — returns 401.
- Redis snapshot cache behavior: two rapid snapshot calls result in one repository/DB execution path (confirm via spy).
- Frontend route integration:
  - Page renders with initial snapshot and hydrates polling hook.
  - Live stream cleanup executes on unmount/navigation.
  - Disconnected-state banner appears after retry exhaustion.

Verification:
- [ ] Integration and E2E suite passes with no auth/shape regressions.
- [ ] SSE token exchange flow (request token → connect stream) is end-to-end green.
- [ ] Cache and SSE cleanup assertions are green.
- [ ] Workspace type check passes for all new and touched files.

Dependencies:
- T17 complete.

---

### [ ] T19: Showcase Build (Phase 6 Compliance)
Context Brief: produce a portfolio-ready static showcase artifact. `showcase/` directory and `CHANGELOG.md` do not yet exist — both must be created as part of this task.

Target files (create directory and files):
- `showcase/006-ops-dashboard/index.html`
- `showcase/006-ops-dashboard/LEARN.md`
- `showcase/006-ops-dashboard/social-caption.md`
- `CHANGELOG.md` (create at project root if absent)

Planned showcase scope:
- Self-contained static demo using inline CSS based on design-tokens.css.
- Representative elements:
  - KPI card row
  - One chart panel
  - Disease alerts panel with all four status variants
- Realistic MAD currency examples without backend dependency.
- No server runtime required — must open directly in browser from filesystem.

`CHANGELOG.md` entry:
- Section: ops dashboard (Step 4).
- Cover: planning, implementation sessions, showcase artifact.

Verification:
- [ ] `showcase/006-ops-dashboard/index.html` opens directly in browser with no server.
- [ ] All four disease alert status variants visible in showcase.
- [ ] `LEARN.md` captures implementation and design lessons from all sessions.
- [ ] `social-caption.md` is ready for release communication.
- [ ] `CHANGELOG.md` contains an ops dashboard entry covering all three sessions.

Dependencies:
- T18 complete.

---

## Cross-Cutting Rules
- [ ] TDD is mandatory at task level for implementation tasks: RED -> GREEN -> REFACTOR.
- [ ] No hardcoded currency or color values anywhere — token or payload field only.
- [ ] Every analytics query is tenant-scoped by `org_id` and `facility_id`.
- [ ] Service methods use `Result<T, AppError>` — controllers map operational unavailability to 503.
- [ ] Design-token CSS custom property usage only — no hardcoded hex in component files.
- [ ] Every widget includes loading, error, empty, and data states.
- [ ] Monetary and count displays use `font-variant-numeric: tabular-nums`.
- [ ] SSE `EventSource` is always closed on unmount/navigation.
- [ ] Bed occupancy Phase 1 stub carries `// TODO(IPD-INTEGRATION)` marker.
- [ ] Zero route deletions for frozen modules.
- [ ] `unstable_retry` (not `reset`) used in all `error.tsx` files — Next.js 16 breaking change.
- [ ] SSE auth uses short-lived exchange token — full JWT never passed as URL query param.
- [ ] Feature flags use `NEXT_PUBLIC_FEATURE_*` env vars exported from `apps/web/lib/flags.ts`.

## New API Endpoints Summary

| Method | Route | Controller | Auth |
|---|---|---|---|
| POST | /analytics/hospital-dashboard/stream-token | analytics.controller | JWT |
| GET | /analytics/hospital-dashboard | analytics.controller | JWT + multi-role |
| GET | /analytics/hospital-dashboard/stream | analytics.controller | SSE token |
| GET | /analytics/hospital-dashboard/period-overview | analytics.controller | JWT + multi-role |
| GET | /scheduling/appointments/monthly-counts | scheduling.controller (additive) | JWT + multi-role |

## Global Done When
- [ ] Session 0 scaffold passes: shell components render, route groups resolve, design-tokens.css loads, Redis starts.
- [ ] `/ops/dashboard` route renders full two-column layout at large viewport.
- [ ] KPI cards display correct values using org currency from payload.
- [ ] Top Services and Sales vs Expense charts render real data.
- [ ] Top Diagnoses and Top Treatments render top five items each.
- [ ] SSE live badge reflects connected, error, and disconnected states correctly.
- [ ] Bed occupancy donut renders with Phase 1 stub behavior and `TODO(IPD-INTEGRATION)` marker.
- [ ] Disease alerts panel renders seeded conditions with exhaustive status mapping.
- [ ] Staff on-duty counters render role-grouped counts.
- [ ] Hospital analytics counters render with motion-guarded transition behavior.
- [ ] Period overview cards switch correctly across Today/Month/Year.
- [ ] Mini calendar shows day-level appointment count dots.
- [ ] Latest logs and transactions tables each render up to 10 rows.
- [ ] Dashboard appears first in ops sidebar.
- [ ] Loading state is full layout skeleton, not spinner-only.
- [ ] `error.tsx` uses `unstable_retry` prop.
- [ ] Task-level TDD evidence exists for T2, T3, T4, T7, T8, and T11.
- [ ] Integration + E2E validation gate (T18) passes including SSE token exchange flow.
- [ ] Type checks pass for all new and modified files.
- [ ] Snapshot Redis cache behavior confirms single DB round-trip on rapid repeated calls.
- [ ] SSE `EventSource` cleanup on navigation confirmed in integration test.
- [ ] Showcase artifact set exists at `showcase/006-ops-dashboard/` with `LEARN.md` and `social-caption.md`.
- [ ] `CHANGELOG.md` contains an ops dashboard planning/implementation/showcase entry.

## Next Steps
- [ ] User approval of this revised plan document.
- [ ] Execute Session 0 tasks T0a-T0d in order.
- [ ] Run Session 0 verification gate before starting Session 1.
- [ ] Execute Session 1 tasks T1-T6 in order.
- [ ] Execute Session 2 tasks: T7 first, then T8/T9/T10 in parallel, then T11, then T12/T13/T14 in parallel.
- [ ] Execute Session 3 tasks T15-T19 in order.

# Pages Bible — Part 1: Auth, Onboarding & Global Layout

> Definitive page-by-page specification for MediCore HIS.
> Cross-referenced against: `openapi.yaml`, `04-screen-inventory.md`, `04-screens-phase2-3.md`, `DESIGN.md`.
> Each page lists: route, role access, API calls, layout, components, states, UX rules, and relations to other pages.

---

## 1. Authentication & Session Pages

### PG-001 · Login

| Property | Value |
|----------|-------|
| **Route** | `/login` |
| **Shell** | Auth (no sidebar, centered card) |
| **Access** | Public (unauthenticated) |
| **API Calls** | `POST /auth/login` → returns `{ access_token, user }` + `Set-Cookie: refresh_token` |
| **Redirects to** | Role-aware: ORG_ADMIN → `/admin/dashboard`, DOCTOR → `/clinical/patients`, RECEPTIONIST → `/ops/queue`, LAB_TECH → `/lab/queue`, PHARMACIST → `/pharmacy/queue`, NURSE → `/ipd/nursing-station`, HR_MANAGER → `/hr/staff`, PATIENT → `/portal/dashboard` |

**Layout:**
```
┌──────────────────────────────────────────┐
│         [MediCore Logo]                  │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  Email / Phone                     │  │
│  ├────────────────────────────────────┤  │
│  │  Password              [👁 toggle] │  │
│  ├────────────────────────────────────┤  │
│  │  ☐ Remember me    Forgot password? │  │
│  ├────────────────────────────────────┤  │
│  │  [       Sign In (primary)       ] │  │
│  ├────────────────────────────────────┤  │
│  │  ── or ──                          │  │
│  │  [   Sign in with OTP (ghost)    ] │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [🌐 Language toggle: EN | FR | AR]      │
│  Don't have an account? Register →       │
└──────────────────────────────────────────┘
Background: var(--bg-base) #09090B
Card: var(--bg-surface) with var(--border-default)
```

**States:**
| State | Behavior |
|-------|----------|
| `default` | Empty form, focus on email input |
| `loading` | Button shows spinner, inputs disabled |
| `error_credentials` | Red inline error: "Invalid email or password" (generic — no email enumeration) |
| `error_suspended` | "Your account has been suspended. Contact your administrator." |
| `error_network` | Toast: "Connection error. Please try again." with retry |
| `success` | Redirect to role-appropriate dashboard |

**UX Rules:**
- ❌ Never reveal whether an email exists in the system
- ✅ Track `last_login_at` and `last_login_device` for audit (stored on user record)
- ✅ Optimistic skeleton loading on destination page during redirect
- ✅ Enter key submits the form
- ✅ Password visibility toggle (eye icon)
- ✅ Language toggle persists choice in `localStorage`

**Audit gap found:** Our current `POST /auth/login` returns user but doesn't track device info. **Fix:** Add `user_agent` and `ip` to the login audit log (server-side, no API change needed).

---

### PG-002 · Forgot Password

| Property | Value |
|----------|-------|
| **Route** | `/forgot-password` |
| **Shell** | Auth |
| **Access** | Public |
| **API Calls** | `POST /auth/forgot-password` (⚠️ **NEW** — not in current API) |

**Layout:**
```
┌──────────────────────────────────────┐
│  ← Back to login                     │
│                                      │
│  Forgot your password?               │
│  Enter your email and we'll send     │
│  you a reset link.                   │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  Email address               │    │
│  └──────────────────────────────┘    │
│  [    Send Reset Link (primary)  ]   │
│                                      │
│  ── Success State ──                 │
│  ✅ Check your email                 │
│  We sent a reset link to e***@***.   │
│  Didn't receive it? Resend (60s)     │
└──────────────────────────────────────┘
```

**States:** `form` → `loading` → `success` (always show success, even if email doesn't exist) | `error_rate_limit` (too many requests)

**⚠️ API Gap:** Need to add:
```yaml
POST /auth/forgot-password
  body: { email: string }
  response: 200 (always, no email enumeration)

POST /auth/reset-password
  body: { token: string, new_password: string }
  response: 200 | 400 (invalid/expired token)
```

---

### PG-003 · Reset Password

| Property | Value |
|----------|-------|
| **Route** | `/reset-password?token=xxx` |
| **Shell** | Auth |
| **Access** | Public (requires valid token) |
| **API Calls** | `POST /auth/reset-password` (**NEW**) |

**Layout:** Password input + confirm password + strength indicator. Token expiry: 1 hour.

**States:** `form` → `loading` → `success` ("Password changed. Redirecting to login...") | `error_expired` ("This link has expired. Request a new one.") | `error_weak` (inline validation)

---

### PG-004–007 · Onboarding Wizard (4 steps)

| Property | Value |
|----------|-------|
| **Route** | `/onboarding` (single URL, step tracked in local state) |
| **Shell** | Auth |
| **Access** | Public |
| **API Calls** | Single atomic call on final step: `POST /orgs/onboard` |

**Step 1 — Organization Setup**
```
Progress: [●──────] Step 1 of 4

Organization Details
┌─────────────────────────────────────┐
│ Organization name *                  │
│ [Cabinet Dr. El Amrani             ] │
├─────────────────────────────────────┤
│ URL slug * (live preview below)      │
│ [cabinet-el-amrani                 ] │
│ → clinic.medicore.ma/cabinet-el-am.. │
│   ✅ Available | ❌ Already taken     │
├─────────────────────────────────────┤
│ MRN prefix (3-5 letters) *           │
│ [CEA  ] → Preview: CEA-2026-00001   │
├─────────────────────────────────────┤
│ Country       │ Timezone              │
│ [Morocco ▾]   │ [Africa/Casablanca ▾] │
├─────────────────────────────────────┤
│ Currency [MAD ▾]                     │
└─────────────────────────────────────┘
[                Next → (primary)      ]

"You can change these later in Settings"
```

**Step 2 — First Facility:** Facility name*, address (street, city), phone, type (Clinic/Polyclinic/Hospital), opening hours (optional).

**Step 3 — Admin Account:** First name*, last name*, email*, password* (strength meter), confirm password.

**Step 4 — First Doctor (Skippable):** Name, specialty (dropdown), license number, default consultation duration (15/20/30 min).

**UX Rules:**
- ✅ Inline slug validation (debounced 500ms) via `GET /orgs/check-slug/{slug}` (**NEW API**)
- ✅ All 4 steps collected in local state, submitted as single atomic transaction
- ✅ If `POST /orgs/onboard` fails → show error but don't lose form data
- ✅ "You can change this later" label on non-critical fields
- ✅ Progress indicator visible at all times
- ❌ No partial org creation (single DB transaction)

**⚠️ API Gaps:**
```yaml
GET /orgs/check-slug/{slug}     # NEW — returns { available: boolean }
POST /orgs/onboard              # EXISTS ✅ — but add first_doctor fields
```

---

### PG-008 · Onboarding Complete

| Property | Value |
|----------|-------|
| **Route** | `/onboarding` (final state) |
| **Shell** | Auth |
| **Access** | Newly created admin |

**Layout:** Success animation (checkmark), org summary card, "Go to Dashboard" CTA. Auto-redirect after 5 seconds.

---

## 2. Global Layout & Navigation

### 2.1 Application Shell Architecture

MediCore uses **role-based shell routing**. Each shell has its own sidebar, but shares a common top bar.

```
┌─────────────────────────────────────────────────────┐
│ [Logo] │ Breadcrumb: Dashboard        [🔍 ⌘K] [👤] │  ← Top Bar (shared)
├────────┼────────────────────────────────────────────┤
│        │                                            │
│ Side   │                                            │
│ bar    │         Main Content Area                  │
│        │         (page-specific)                    │
│        │                                            │
│        │                                            │
│        │                                            │
├────────┴────────────────────────────────────────────┤
│ Facility: Ain Diab Clinic ▾    │  v1.0.0            │  ← Status Bar (optional)
└─────────────────────────────────────────────────────┘
```

**Shell assignments by role:**

| Role | Shell | Default Route | Sidebar Items |
|------|-------|--------------|---------------|
| SUPER_ADMIN | Super Admin | `/super/dashboard` | Tenants, System Health, Billing |
| ORG_ADMIN | Admin | `/admin/dashboard` | Dashboard, Team, Facilities, Services, Analytics, Audit, Settings + P2/P3 items |
| FACILITY_ADMIN | Admin | `/admin/dashboard` | Same as ORG_ADMIN minus org-level settings |
| DOCTOR | Clinical | `/clinical/patients` | Patients, My Schedule, Messaging (P2) |
| NURSE | Clinical + IPD | `/clinical/patients` | Patients, IPD Nursing Station (P2) |
| RECEPTIONIST | Operations | `/ops/queue` | Patients, Appointments, Queue, Billing, Messaging (P2) |
| ACCOUNTANT | Operations | `/ops/billing` | Billing only |
| LAB_TECH | Lab | `/lab/queue` | Pending Orders, Enter Results, Catalog, Reports |
| PHARMACIST | Pharmacy | `/pharmacy/queue` | Dispensing Queue, Inventory, Drug Catalog, Purchase Orders, Suppliers |
| RADIOLOGIST | Radiology | `/radiology/queue` | Pending Orders, Enter Reports, Catalog, DICOM Viewer |
| HR_MANAGER | HR | `/hr/staff` | Staff, Attendance, Leave, Payroll, Reports |
| PATIENT | Portal | `/portal/dashboard` | Dashboard, Records, Appointments, Invoices, Settings |

---

### PG-009 · Top Bar (Shared Component)

**Always visible**, sticky at top. Height: 56px (`var(--topbar-height)`).

```
┌──────────────────────────────────────────────────────────────┐
│ [≡]  [Logo]  │  Admin > Dashboard     │ [🔍 Search ⌘K] [🔔 3] [👤 Dr. Y ▾] │
│              │  breadcrumb            │                                      │
└──────────────────────────────────────────────────────────────┘
```

**Components:**
| Element | Behavior | API |
|---------|----------|-----|
| Hamburger `[≡]` | Shows on mobile (<768px), toggles sidebar overlay | — |
| Logo | Click → default dashboard for current role | — |
| Breadcrumb | Auto-generated from route: `Admin > Settings > Billing` | — |
| Global Search `[🔍 ⌘K]` | Opens command palette modal (search patients, appointments, invoices by name/MRN/phone) | `GET /patients/search?q=`, `GET /appointments?q=` (**need search on appointments**) |
| Notifications `[🔔]` | Badge count of unread, dropdown with recent items | `GET /notifications` (**NEW**), SSE for real-time |
| User Avatar `[👤 ▾]` | Dropdown: Profile, Theme toggle (dark/light), Language, Logout | `POST /auth/logout` |

**⚠️ API Gaps:**
```yaml
GET /notifications              # NEW — paginated, filterable by type
PUT /notifications/{id}/read    # NEW — mark as read
GET /appointments?q=            # MISSING — need search param on appointments list
```

---

### PG-010 · Facility Switcher (Shared Component)

**Always visible** in top bar or sidebar footer for multi-facility users.

```
┌─────────────────────────────┐
│  Current: Ain Diab Clinic  ▾│
├─────────────────────────────┤
│  🔍 Search facilities...    │
│  ─────────────────────────  │
│  ✓ Ain Diab Clinic          │
│    Casablanca · Clinic       │
│  ○ Maarif Polyclinic         │
│    Casablanca · Polyclinic   │
│  ○ Rabat Center              │
│    Rabat · Hospital          │
└─────────────────────────────┘
```

**Behavior:**
- On switch: **hard context reset** — all filters cleared, all lists reload with new `facility_id`
- Toast: "Switched to: Maarif Polyclinic" (3 seconds)
- Persists last selection in `localStorage` per user
- API: Uses existing `GET /auth/me` → returns `facilities[]` with user's role per facility

---

### PG-011–014 · Role-Aware Dashboards

#### PG-011 · Super Admin Dashboard (`/super/dashboard`) — **NEW page**

| Property | Value |
|----------|-------|
| **Route** | `/super/dashboard` |
| **Shell** | Super Admin |
| **Access** | SUPER_ADMIN only |
| **API Calls** | `GET /super/tenants`, `GET /super/metrics` (**NEW**) |

**Layout:**
```
┌───────────────────────────────────────────────────┐
│  System Health                                     │
│  [Active Orgs: 42] [Users: 312] [Errors: 0] [MRR:$2.1K] │
├───────────────────────────────────────────────────┤
│  Tenants Table                                     │
│  Org Name │ Plan │ Users │ Status │ MRR │ Actions │
│  ─────────────────────────────────────────────────│
│  Cabinet A│ CLINIC│  8   │ ACTIVE │ $50 │ [View]  │
│  Poly B   │ HOSP │  24  │ TRIAL  │ $0  │ [View]  │
├───────────────────────────────────────────────────┤
│  Quick filters: [All] [Active] [Trial] [Suspended]│
└───────────────────────────────────────────────────┘
```

**⚠️ This is an entirely new shell/page not in current docs.** Needed for SaaS management. Add to Phase 2.

---

#### PG-012 · Org Admin Dashboard (`/admin/dashboard`) — EXISTS ✅

| Property | Value |
|----------|-------|
| **Route** | `/admin/dashboard` |
| **API Calls** | `GET /orgs/{id}/revenue`, `GET /appointments?date=today&facility_id=`, `GET /patients/search?limit=0` (count) |

**Layout (improved from audit):**
```
Row 1: KPI Cards (4 columns)
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Patients │ │ Appts    │ │ Revenue  │ │ No-Show  │
│ Today    │ │ Today    │ │ Today    │ │ Rate     │
│ 24  ↑12% │ │ 18  ↓3%  │ │ 12.5K MAD│ │ 8%  ↓2%  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘

Row 2: Charts (2 columns)
┌─────────────────────┐ ┌─────────────────────┐
│ Appointment Trend   │ │ Revenue by Service   │
│ (line chart, 7d)    │ │ (donut chart)        │
└─────────────────────┘ └─────────────────────┘

Row 3: Facility Cards (if multi-facility)
┌─────────────┐ ┌─────────────┐
│ Ain Diab    │ │ Maarif      │
│ 12 appts    │ │ 6 appts     │
│ 6.2K MAD    │ │ 3.1K MAD    │
└─────────────┘ └─────────────┘

Row 4: Recent Activity (full width)
│ Table: recent encounters, recent payments │
```

**UX Rules:**
- ✅ Date range quick presets: Today / This Week / This Month / Custom
- ✅ All metrics are clickable → drill-down to relevant list page
- ✅ Above the fold = actionable (not vanity metrics)

---

#### PG-013 · Doctor Dashboard — **IMPROVED** (was missing as separate page)

Doctors currently land on `/clinical/patients`. The CodeCanyon audit reveals doctors need a proper **Today's Schedule** dashboard.

| Property | Value |
|----------|-------|
| **Route** | `/clinical/dashboard` (**NEW** — currently redirects to patients) |
| **API Calls** | `GET /appointments?doctor_id=me&date=today`, `GET /notifications`, `GET /patients/search?q=recent` |

**Layout:**
```
Row 1: Today's Quick Stats
[Patients Today: 8] [Completed: 3] [Pending Results: 2] [Unread Messages: 1]

Row 2: Today's Schedule (main)
┌─────────────────────────────────────────────┐
│ 09:00  Ahmed Benali · Follow-up · ✅ Done    │
│ 09:15  Fatima Zahra · New patient · 🔵 In Q  │
│ 09:30  — Available —                         │
│ 09:45  Karim Idri · Diabetes · 📅 Upcoming   │
│ ...                                          │
└─────────────────────────────────────────────┘
Click row → open encounter or patient profile

Row 3: Two panels
┌──────────────────────┐ ┌──────────────────────┐
│ Pending Lab Results  │ │ Recent Patients       │
│ (notifications)      │ │ (last 5 seen)         │
└──────────────────────┘ └──────────────────────┘
```

---

#### PG-014 · Receptionist Dashboard — **IMPROVED**

Receptionists currently land on `/ops/queue`. Better: a dedicated dashboard with quick actions.

| Property | Value |
|----------|-------|
| **Route** | `/ops/dashboard` (**NEW**) |
| **API Calls** | `GET /appointments?date=today`, `GET /facilities/{id}/queue` |

**Layout:**
```
Row 1: Quick Actions (large buttons)
[➕ New Patient]  [📅 New Appointment]  [✅ Check-in]

Row 2: Two panels
┌─────────────────────────┐ ┌─────────────────────────┐
│ Today's Appointments    │ │ Current Queue            │
│ (next 10, status badges)│ │ (live, SSE-connected)    │
│ [Check-in] buttons      │ │ Now serving: T-042       │
└─────────────────────────┘ └─────────────────────────┘

Row 3: Alerts
│ ⚠️ 3 patients waiting >30 min │ 📋 2 unpaid invoices from yesterday │
```

---

## Audit Summary — Part 1

### API Gaps Found

| Missing Endpoint | Priority | Phase |
|-----------------|----------|-------|
| `POST /auth/forgot-password` | P0 (MVP) | 1 |
| `POST /auth/reset-password` | P0 (MVP) | 1 |
| `GET /orgs/check-slug/{slug}` | P0 (MVP) | 1 |
| `GET /notifications` + `PUT /notifications/{id}/read` | P1 | 1 |
| `GET /appointments?q=` (search param) | P1 | 1 |
| `GET /super/tenants` + `GET /super/metrics` | P2 | 2 |

### New Pages Found (vs current docs)

| Page | Why Missing | Phase |
|------|------------|-------|
| Forgot Password (`/forgot-password`) | Not in screen inventory | 1 |
| Reset Password (`/reset-password`) | Not in screen inventory | 1 |
| Doctor Dashboard (`/clinical/dashboard`) | Doctors had no "Today" view | 1 |
| Receptionist Dashboard (`/ops/dashboard`) | Receptionists had no quick-action view | 1 |
| Super Admin Dashboard (`/super/dashboard`) | SaaS management not scoped | 2 |

### Layout Improvements Over Current Docs

| Page | Current | Improved |
|------|---------|----------|
| Login | Basic email+password | Added OTP option, language toggle, device tracking |
| Onboarding | 4 steps listed | Full wireframe per step with inline validation |
| Admin Dashboard | Stat cards + quick actions | Added facility cards, recent activity, drill-down clicks |
| Doctor landing | Goes straight to patient list | Proper "Today's Schedule" dashboard |
| Receptionist landing | Goes straight to queue | Quick-action bar + split queue/appointments panel |

---

> **Next:** Part 2 — Patient Management & Appointment Pages

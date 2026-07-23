# Pages Bible — Part 2: Patient Management & Appointments

> Cross-referenced against: `openapi.yaml`, `04-screen-inventory.md`, `02-SRS.md`

---

## 3. Patient Management Pages

### PG-020 · Patient List

| Property | Value |
|----------|-------|
| **Route** | `/ops/patients` (Receptionist) or `/clinical/patients` (Doctor/Nurse) |
| **Shell** | Operations or Clinical |
| **Access** | RECEPTIONIST, DOCTOR, NURSE, FACILITY_ADMIN |
| **API Calls** | `GET /patients/search?q=&page=&limit=20` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Patients                              [+ New Patient]       │
├─────────────────────────────────────────────────────────────┤
│  [🔍 Search by name, phone, MRN, national ID...    ⌘K ]    │
│  Filters: [Active ▾] [Facility ▾] [Has upcoming ▾] [Last visit ▾] │
├────┬──────────────┬──────────────┬───────┬──────────┬───────┤
│ #  │ Patient      │ MRN          │ Phone │ Age/Sex  │ Last  │
├────┼──────────────┼──────────────┼───────┼──────────┼───────┤
│    │ 👤 Ahmed B.  │ CEA-2026-001 │ 06xx  │ 42M      │ 12 Mar│
│    │ 👤 Fatima Z. │ CEA-2026-002 │ 06xx  │ 35F      │ Today │
│    │ ...          │              │       │          │       │
├────┴──────────────┴──────────────┴───────┴──────────┴───────┤
│  Showing 1-20 of 1,247 patients    [◀ 1 2 3 ... 63 ▶]      │
│  Bulk: [Export CSV] [Send SMS/Email]                         │
└─────────────────────────────────────────────────────────────┘
```

**States:** `loading` (skeleton table) → `populated` → `empty` ("No patients yet. Register your first →") → `search_results` → `no_results`

**UX Rules:**
- ✅ Debounced search (300ms), prefix search on MRN, contains on phone/name
- ✅ MRN displayed in `font-mono` (Berkeley Mono), clickable → patient detail
- ✅ "Same phone for multiple patients" shows ⚠️ badge, not hard error
- ✅ Receptionist view shows [+ New Patient] button; Doctor view hides it
- ✅ Click row → navigate to Patient Profile (`PG-022`)
- ✅ Pagination: 20 per page (configurable), keyboard nav (j/k rows, Enter to open)

**API alignment:** `GET /patients/search` exists ✅. Needs filter params:
```yaml
# ENHANCED — add these query params
GET /patients/search?q=&status=active&has_upcoming=true&last_visit_from=&last_visit_to=&facility_id=&page=&limit=
```

---

### PG-021 · New Patient / Edit Patient

| Property | Value |
|----------|-------|
| **Route** | `/ops/patients/new` (create) or `/ops/patients/[id]/edit` (**NEW** — edit mode) |
| **Shell** | Operations |
| **Access** | RECEPTIONIST, FACILITY_ADMIN |
| **API Calls** | `POST /patients` (create) or `PUT /patients/{id}` (**NEW**) |

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  ← Patients    New Patient Registration                  │
├─────────────────────────────────────────────────────────┤
│  Required (keep under 90 seconds)                        │
│  ┌────────────────┐ ┌────────────────┐                   │
│  │ First name *   │ │ Last name *    │                   │
│  └────────────────┘ └────────────────┘                   │
│  ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ Phone *        │ │ Date of birth  │ │ Sex [M/F/O ▾]│ │
│  └────────────────┘ └────────────────┘ └──────────────┘ │
│                                                          │
│  MRN Preview: CEA-2026-00048 (auto-generated)            │
│                                                          │
│  ── Optional ────────────────────────────────────────── │
│  ┌────────────────┐ ┌────────────────┐                   │
│  │ Email          │ │ National ID    │                   │
│  └────────────────┘ └────────────────┘                   │
│  ┌──────────────────────────────────────────────────┐    │
│  │ Address (street, city)                            │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  ── Insurance ───────────────────────────────────────── │
│  Provider [▾]  │  Policy #  │  Expiry                    │
│                                                          │
│  ── Emergency Contact ───────────────────────────────── │
│  Name  │  Relationship [▾]  │  Phone                     │
│                                                          │
│  ── Allergies ───────────────────────────────────────── │
│  [+ Add Allergy]                                         │
│  ┌─────────────────────────────────────────────┐         │
│  │ 🔴 Penicillin · Drug · Anaphylaxis · Severe │ [✕]    │
│  └─────────────────────────────────────────────┘         │
│                                                          │
│  ── Tags ────────────────────────────────────────────── │
│  [VIP] [Chronic Program] [+ Add tag]                     │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  [Cancel (ghost)]           [Register & Book Appt →]     │
│                             [Register Patient (primary)] │
└─────────────────────────────────────────────────────────┘
```

**States:** `form` → `validating` → `saving` → `success` (show MRN in success card) | `error_duplicate_phone` (⚠️ warning, not blocker)

**UX Rules:**
- ✅ MRN preview visible once prefix + year known (before save)
- ✅ Allergies: color-coded severity badges (🔴 severe, 🟠 moderate, 🟢 mild)
- ✅ "Register & Book Appointment" shortcut → saves patient then opens booking modal with patient pre-selected
- ✅ Duplicate phone: warning toast "Another patient (CEA-2026-021) has this phone number" with link, but allows save
- ✅ DOB → auto-calculate age display ("42 years")
- ✅ Tab order optimized: first name → last name → phone → DOB → sex → save (7 tabs to register)

**API Gaps:**
```yaml
PUT /patients/{id}           # NEW — update patient demographics
DELETE /patients/{id}/allergies/{allergyId}  # NEW — remove allergy
PUT /patients/{id}/tags      # NEW — manage patient tags
```

---

### PG-022 · Patient Profile & Timeline

| Property | Value |
|----------|-------|
| **Route** | `/clinical/patients/[id]` or `/ops/patients/[id]` (**NEW** — ops view) |
| **Shell** | Clinical or Operations |
| **Access** | DOCTOR, NURSE, RECEPTIONIST, FACILITY_ADMIN |
| **API Calls** | `GET /patients/{id}`, `GET /patients/{id}/encounters`, `GET /invoices?patient_id=`, `GET /patients/{id}/documents` (**NEW**) |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Patients                                    [Edit] [⋮]   │
├─────────────────────────────────────────────────────────────┤
│  STICKY HEADER                                               │
│  👤 Ahmed Benali  │  MRN: CEA-2026-00001  │  42M             │
│  📞 +212 6XX      │  🩸 A+                │  📧 ahmed@...     │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ⚠️ ALLERGIES: 🔴 Penicillin (Severe) · 🟠 Latex (Mod) │ │
│  └─────────────────────────────────────────────────────────┘ │
│  │ 💰 Balance: 500 MAD outstanding │  🏷️ VIP, Diabetic     │ │
├─────────────────────────────────────────────────────────────┤
│  [Summary] [Timeline] [Clinical] [Documents] [Communication]│
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ── Tab: Summary (default) ──────────────────────────────── │
│  ┌────────────────┐ ┌──────────────────────┐                 │
│  │ Next Appt      │ │ Last Visit            │                │
│  │ 15 Apr, 09:00  │ │ 12 Mar · Dr. Youssef  │                │
│  │ Dr. Youssef    │ │ General Medicine       │                │
│  └────────────────┘ └──────────────────────┘                 │
│  Unpaid Invoices (1)                                         │
│  │ INV-2026-042 │ 500 MAD │ SENT │ [Pay Now]               │
│                                                              │
│  ── Tab: Timeline ───────────────────────────────────────── │
│  │ 12 Mar 2026 │ 🩺 Encounter with Dr. Youssef              │
│  │             │    Dx: E11.2 Type 2 Diabetes                │
│  │             │    Rx: Metformin 850mg                      │
│  │ 12 Mar 2026 │ 🔬 Lab: CBC + HbA1c ordered                │
│  │ 13 Mar 2026 │ 🔬 Lab results received (HbA1c: 7.2%)     │
│  │ 13 Mar 2026 │ 💰 Invoice INV-2026-042 sent (500 MAD)    │
│  │ ↕ Load more                                               │
│                                                              │
│  ── Tab: Clinical ───────────────────────────────────────── │
│  Problem List: E11.2 Type 2 Diabetes (active since 2024)     │
│  Vitals Trends: [BP chart] [Weight chart] [BMI chart]        │
│  Medication History: [current] [past]                        │
│                                                              │
│  ── Tab: Documents ──────────────────────────────────────── │
│  [Upload] Lab reports, referrals, imaging PDFs               │
│                                                              │
│  ── Tab: Communication ──────────────────────────────────── │
│  SMS/Email log, consent records                              │
└─────────────────────────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Patient header is **sticky** — always visible when scrolling tabs
- ✅ Allergy banner shown everywhere this patient appears (encounter, prescription, billing)
- ✅ Timeline is chronological, combines encounters + labs + radiology + invoices + messages
- ✅ "Last seen on 12 Mar 2026 — Dr. Youssef — General Medicine" microcopy
- ✅ Vitals trends: sparkline charts for BP, weight, BMI over last N visits
- ✅ Click encounter in timeline → opens encounter viewer (read-only if signed_off)

**API Gaps:**
```yaml
GET /patients/{id}/timeline    # NEW — unified chronological feed (encounters + labs + invoices + docs)
GET /patients/{id}/documents   # NEW — uploaded files list
POST /patients/{id}/documents  # NEW — upload file (R2 storage)
GET /patients/{id}/vitals-trend # NEW — aggregated vitals over time for charts
GET /patients/{id}/communications # NEW — SMS/email log
```

---

## 4. Appointments & Scheduling Pages

### PG-030 · Doctor Schedule Management

| Property | Value |
|----------|-------|
| **Route** | `/admin/schedules` (**NEW** — currently only API-level, no dedicated page) |
| **Shell** | Admin |
| **Access** | ORG_ADMIN, FACILITY_ADMIN |
| **API Calls** | `POST /doctors/{id}/schedule`, `GET /doctors/{id}/schedule` (**NEW — list**), `PUT /doctors/{id}/schedule/{scheduleId}` (**NEW**) |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Doctor Schedules                         [+ New Schedule]   │
├─────────────────────────────────────────────────────────────┤
│  Doctor: [Dr. Youssef Amrani ▾]   Facility: [Ain Diab ▾]   │
├─────────────────────────────────────────────────────────────┤
│  Weekly Template                                             │
│  ┌──────────────────────────────────────────────────┐        │
│  │ Mon │ 09:00 ━━━━━━━━━ 13:00 │ 15 min slots │ 16 │       │
│  │ Tue │ 09:00 ━━━━━━━━━ 13:00 │ 15 min slots │ 16 │       │
│  │ Wed │ ── OFF ──              │              │    │       │
│  │ Thu │ 14:00 ━━━━━━━━━ 18:00 │ 20 min slots │ 12 │       │
│  │ Fri │ 09:00 ━━━ 12:00       │ 15 min slots │ 12 │       │
│  │ Sat │ 09:00 ━━━ 12:00       │ 30 min slots │  6 │       │
│  │ Sun │ ── OFF ──              │              │    │       │
│  └──────────────────────────────────────────────────┘        │
│  Click day row → edit: start time, end time, slot duration   │
│  [+ Add break] e.g. 11:00-11:30 Prayer break               │
│                                                              │
│  Preview: Generated slots for next Monday                    │
│  │ 09:00 │ 09:15 │ 09:30 │ ... │ 12:45 │                   │
│                                                              │
│  Templates: [Morning Clinic] [Evening Clinic] [+ Save as]   │
└─────────────────────────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Spreadsheet-like editing: click cell to edit time, drag to extend
- ✅ Preview generated slots before saving
- ✅ Template system: save/load schedule patterns
- ✅ Break slots clearly shown (striped/hatched)
- ✅ Show slot count auto-calculated: `(end - start - breaks) / duration`

**API Gaps:**
```yaml
GET /doctors/{id}/schedule                # NEW — get all schedule rules
PUT /doctors/{id}/schedule/{scheduleId}   # NEW — update a rule
DELETE /doctors/{id}/schedule/{scheduleId} # NEW — delete a rule
GET /schedule-templates                    # NEW — saved templates
POST /schedule-templates                   # NEW — save template
```

---

### PG-031 · Appointment Calendar

| Property | Value |
|----------|-------|
| **Route** | `/ops/appointments` |
| **Shell** | Operations |
| **Access** | RECEPTIONIST, DOCTOR, FACILITY_ADMIN |
| **API Calls** | `GET /appointments?facility_id=&date=&doctor_id=&status=`, `GET /doctors/{id}/availability?date=&facility_id=` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Appointments    [Day] [Week] [Doctor] [Room]    [+ Book]   │
│  ← 14 Apr 2026 →                  Doctor: [All ▾]          │
├─────────────────────────────────────────────────────────────┤
│  Calendar Grid (Day view shown)                              │
│  08:00 │                                                     │
│  09:00 │ ┌──────────────────────────────────┐               │
│        │ │ 🟢 Ahmed B. · Consultation       │               │
│        │ │ Dr. Youssef · Checked-in         │               │
│  09:15 │ └──────────────────────────────────┘               │
│  09:15 │ ┌──────────────────────────────────┐               │
│        │ │ 🔵 Fatima Z. · Follow-up          │               │
│        │ │ Dr. Youssef · Booked              │               │
│  09:30 │ └──────────────────────────────────┘               │
│  09:30 │ ── Empty (clickable → open booking modal) ──       │
│  09:45 │ ┌──────────────────────────────────┐               │
│        │ │ 🟣 Teleconsult 📹 · Karim I.     │               │
│        │ │ Dr. Youssef · Confirmed           │               │
│  10:00 │ └──────────────────────────────────┘               │
│  ...   │                                                     │
├─────────────────────────────────────────────────────────────┤
│  Legend: 🟢 Checked-in  🔵 Booked  🟡 Confirmed             │
│          🟢 Completed  ⚫ No-show  🔴 Cancelled  🟣 Teleconsult │
└─────────────────────────────────────────────────────────────┘
```

**States:** `loading` → `day_view` | `week_view` | `doctor_column_view` | `room_view`

**UX Rules:**
- ✅ Click empty slot → booking drawer opens with time pre-filled
- ✅ Color-coded statuses (matches `DESIGN.md` status colors)
- ✅ Teleconsult distinction: 📹 icon on appointment card
- ✅ Concurrency: if slot taken by another user during booking → live update + toast "This slot was just booked"
- ✅ Drag appointment to reschedule (desktop only)
- ✅ Right-click context menu: Reschedule, Cancel, Mark No-show, Check-in

---

### PG-032 · Appointment List View

| Property | Value |
|----------|-------|
| **Route** | `/ops/appointments?view=list` (same route, list toggle) |
| **API Calls** | `GET /appointments?facility_id=&from_date=&to_date=&doctor_id=&status=&source=&page=` |

**Layout:**
```
┌─────┬────────────┬──────────────┬──────────┬────────────┬────────┐
│ Time│ Patient    │ Doctor       │ Type     │ Status     │Actions │
├─────┼────────────┼──────────────┼──────────┼────────────┼────────┤
│09:00│ Ahmed B.   │ Dr. Youssef  │ Consult  │ 🟢 Checked │ [⋮]  │
│09:15│ Fatima Z.  │ Dr. Youssef  │ Follow-up│ 🔵 Booked  │ [⋮]  │
│09:45│ Karim I.   │ Dr. Youssef  │ Telecon  │ 🟡 Confirmed│ [⋮] │
└─────┴────────────┴──────────────┴──────────┴────────────┴────────┘
Filters: [Date range] [Doctor ▾] [Status ▾] [Source: Staff/Portal ▾]
Actions menu [⋮]: Reschedule, Cancel, No-show, Print slip, View audit trail
```

**API Gaps:**
```yaml
GET /appointments          # EXISTS but needs: source filter, audit_trail expand
GET /appointments/{id}/audit # NEW — who booked, who changed status, when
PUT /appointments/{id}     # NEW — reschedule (change start_time)
```

---

### PG-033 · Booking Form (Modal/Drawer)

| Property | Value |
|----------|-------|
| **Route** | Modal overlay on calendar or list page |
| **API Calls** | `GET /patients/search`, `GET /doctors/{id}/availability`, `POST /appointments` |

**Layout:**
```
┌──────────────────────────────────────┐
│  Book Appointment            [✕]     │
├──────────────────────────────────────┤
│  Step 1: Patient                      │
│  [🔍 Search patient by name/MRN... ] │
│  Selected: Ahmed Benali (CEA-2026-01)│
│  [+ Register new patient]            │
├──────────────────────────────────────┤
│  Step 2: Doctor & Time                │
│  Doctor: [Dr. Youssef Amrani ▾]      │
│  Date:   [15 Apr 2026]               │
│  Available slots:                     │
│  [09:00] [09:15] [09:30] [10:00] ... │
│  Selected: 09:15 ✓                   │
├──────────────────────────────────────┤
│  Step 3: Details                      │
│  Type: [Consultation ▾]              │
│  Reason: [Free text...            ]  │
│  Teleconsult? [Toggle off/on]        │
├──────────────────────────────────────┤
│  [Cancel]          [Book Appointment] │
└──────────────────────────────────────┘
```

**UX Rules:**
- ✅ If opened from calendar click: time pre-filled, doctor pre-selected
- ✅ Slot grid: available = teal, taken = grey (disabled)
- ✅ Live slot availability check (re-fetch on date change)
- ✅ "Register new patient" inline flow → mini registration → auto-select
- ✅ Concurrency guard: `POST /appointments` returns 409 if slot taken → show error and refresh slots

---

### PG-034 · Check-in & Queue Management

| Property | Value |
|----------|-------|
| **Route** | `/ops/queue` |
| **Shell** | Operations |
| **Access** | RECEPTIONIST |
| **API Calls** | `GET /appointments?date=today&facility_id=&status=booked,confirmed`, `POST /appointments/{id}/checkin`, `GET /facilities/{id}/queue` (SSE) |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Queue Management           🟢 Live (SSE connected)         │
├────────────────────────────────┬────────────────────────────┤
│  Today's Appointments          │  Current Queue              │
│  ┌───────────────────────────┐ │  ┌────────────────────────┐│
│  │ 09:00 Ahmed B. · Booked   │ │  │ NOW SERVING            ││
│  │ [✅ Check In]              │ │  │ T-042 · Ahmed Benali   ││
│  │                            │ │  │ Dr. Youssef · Room 1   ││
│  │ 09:15 Fatima Z. · Booked  │ │  ├────────────────────────┤│
│  │ [✅ Check In]              │ │  │ NEXT                   ││
│  │                            │ │  │ T-043 · Sara M.        ││
│  │ 09:30 Karim I. · Confirmed│ │  │ T-044 · Omar K.        ││
│  │ [✅ Check In]              │ │  │ T-045 · Leila B.       ││
│  │                            │ │  └────────────────────────┘│
│  │ 09:45 Walk-in             │ │                             │
│  │ [+ Register Walk-in]      │ │  Waiting times:             │
│  └───────────────────────────┘ │  Avg: 12 min │ Max: 28 min  │
│                                │                             │
│  Search: [🔍 Patient name...] │  ⚠️ 2 patients waiting >30m  │
├────────────────────────────────┴────────────────────────────┤
│  Summary: 12 booked │ 8 checked-in │ 3 completed │ 1 no-show│
└─────────────────────────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Check-in button is LARGE and GREEN (speed for receptionists)
- ✅ Token generated on check-in: `T-042` format
- ✅ Queue is live via SSE — no manual refresh needed
- ✅ Auto-mark no-show after configurable threshold (e.g. 30 min past appointment) with ⚠️ badge
- ✅ Highlight rows with waiting time >30 min (amber background)
- ✅ Walk-in support: "Register Walk-in" → create appointment + check-in in one flow
- ✅ "Call next" button for doctor side (doctor clicks → queue advances)

---

### PG-035 · Queue Display (Public TV)

| Property | Value |
|----------|-------|
| **Route** | `/queue-display/[facilityId]` |
| **Shell** | None (full-screen, no auth) |
| **Access** | PUBLIC |
| **API Calls** | `GET /queue-display/{facilityId}` (SSE stream) |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│              Ain Diab Clinic                                 │
│                                                              │
│         NOW SERVING                                          │
│                                                              │
│          T-042                                               │
│          A. B. · Room 1                                      │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│                                                              │
│  NEXT:                                                       │
│  T-043 · F. Z.    │  T-044 · K. I.    │  T-045 · L. B.     │
│                                                              │
│         🕐 Average wait: 15 minutes                         │
└─────────────────────────────────────────────────────────────┘
Font size: 48px+ for token, 24px+ for names
Auto-refresh: SSE (no login, no interaction needed)
Display patient initials only (privacy)
```

---

## Audit Summary — Part 2

### API Gaps Found

| Missing Endpoint | Priority | Phase |
|-----------------|----------|-------|
| `PUT /patients/{id}` (update demographics) | P0 | 1 |
| `DELETE /patients/{id}/allergies/{allergyId}` | P0 | 1 |
| `GET /patients/{id}/timeline` (unified feed) | P1 | 1 |
| `GET /patients/{id}/documents` + `POST` (upload) | P1 | 1 |
| `GET /patients/{id}/vitals-trend` | P1 | 1 |
| `GET /doctors/{id}/schedule` (list rules) | P0 | 1 |
| `PUT /doctors/{id}/schedule/{id}` | P0 | 1 |
| `GET /appointments/{id}/audit` | P1 | 1 |
| `PUT /appointments/{id}` (reschedule) | P0 | 1 |
| `PUT /patients/{id}/tags` | P2 | 2 |

### New Pages Found

| Page | Route | Phase |
|------|-------|-------|
| Patient Edit | `/ops/patients/[id]/edit` | 1 |
| Schedule Management | `/admin/schedules` | 1 |
| Patient Profile (ops view) | `/ops/patients/[id]` | 1 |

### Layout Improvements

| Page | Improvement |
|------|-------------|
| Patient List | Added bulk actions (CSV export, SMS), filter chips, MRN mono font |
| New Patient | Added "Register & Book" shortcut, allergy badges, tag system, insurance section |
| Patient Profile | Added sticky header, unified timeline (not just encounters), vitals sparklines, communication tab |
| Schedule Mgmt | Entirely new page with visual weekly editor and template system |
| Queue | Added walk-in support, waiting time highlights, live connection indicator |

---

> **Next:** Part 3 — Encounters/EMR & Billing Pages

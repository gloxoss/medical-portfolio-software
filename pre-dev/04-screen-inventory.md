# Phase 4 — Screen Inventory

## MediCore HIS — Complete Screen List with States

---

## Auth Screens

| # | Screen | Route | States | Key Components | Linked From |
|---|--------|-------|--------|----------------|-------------|
| S01 | Login | `/login` | default, loading, error (wrong password), error (network) | Email input, password input, submit button, error alert | Direct URL, logout redirect |
| S02 | Onboarding Step 1: Org | `/onboarding` | form, validating, error | Org name, slug (auto-generated), MRN prefix input | Post-registration |
| S03 | Onboarding Step 2: Facility | `/onboarding` | form, validating, error | Facility name, address fields, phone | Step 1 completion |
| S04 | Onboarding Step 3: Admin Account | `/onboarding` | form, validating, error (email taken) | Email, first name, last name, password, confirm password | Step 2 completion |
| S05 | Onboarding Step 4: First Doctor | `/onboarding` | form, validating, success, skip | Doctor name, specialty, license number, or "Skip — I'll add later" | Step 3 completion |
| S06 | Onboarding Complete | `/onboarding` | success | Checkmark animation, "Go to Dashboard" CTA | Step 4 completion |

## Admin Screens

| # | Screen | Route | States | Key Components | Linked From |
|---|--------|-------|--------|----------------|-------------|
| S10 | Admin Dashboard | `/admin/dashboard` | loading, populated, empty (new org) | Stat cards (patients, appointments, revenue), quick actions | Login redirect |
| S11 | Team Management | `/admin/team` | loading, populated, empty, invite modal | User table (name, role, facility, status), invite button, role selector | Sidebar nav |
| S12 | Facility Management | `/admin/facilities` | loading, populated, create modal | Facility cards (name, address, user count), create form | Sidebar nav |
| S13 | Services Catalog | `/admin/services` | loading, populated, empty, create/edit modal | Services table (name, price, category, active), CRUD | Sidebar nav |
| S14 | Analytics Dashboard | `/admin/analytics` | loading, populated, empty, date filter | Revenue bar chart (by facility), appointments line chart, AI usage gauge | Sidebar nav |
| S15 | Audit Log | `/admin/audit-log` | loading, populated, empty, filtered | Audit table (time, user, action, entity, details), filter dropdowns | Sidebar nav |
| S16 | Org Settings | `/admin/settings` | loading, form | Currency selector, language selector, timezone, MRN format preview | Sidebar nav |

## Clinical Screens

| # | Screen | Route | States | Key Components | Linked From |
|---|--------|-------|--------|----------------|-------------|
| S20 | Patient List (Clinical) | `/clinical/patients` | loading, populated, empty, search results | Search bar, patient table (MRN, name, phone, last visit), pagination | Sidebar nav |
| S21 | Patient Profile | `/clinical/patients/[id]` | loading, populated, not found | Demographics card, allergies list, problem list, timeline (encounters), documents tab | Patient list click |
| S22 | Encounter Editor | `/clinical/patients/[id]/encounters/[encId]` | loading, draft, in_progress, signed_off (readonly) | **3-column layout**: (left) patient summary sidebar, (center) encounter form (vitals + SOAP + diagnoses + Rx), (right) AI copilot sidebar | Queue click or patient timeline |

### Encounter Editor Sub-States

| Component | States |
|-----------|--------|
| Vitals form | empty, partial_fill, complete, autosaving, autosaved |
| SOAP editor | empty, typing, auto_saving, autosaved, ai_expanding, ai_expanded |
| Diagnosis list | empty, searching, selected, added |
| Prescription list | empty, drug_search, form_fill, allergy_warning, added |
| AI copilot sidebar | loading, summary_loaded, differentials_loaded, error, rate_limited, ai_unavailable |
| Sign-off button | disabled (no assessment), enabled, confirming (modal), signed_off |

## Operations Screens

| # | Screen | Route | States | Key Components | Linked From |
|---|--------|-------|--------|----------------|-------------|
| S30 | Patient List (Ops) | `/ops/patients` | loading, populated, empty, search results | Search bar, patient table, "New Patient" button | Sidebar nav |
| S31 | New Patient Form | `/ops/patients/new` | form, validating, saving, success (shows MRN), error | Name, phone, DOB, gender (required); email, address, national ID, blood type (optional) | Patient list "New" button |
| S32 | Appointments Calendar | `/ops/appointments` | loading, day_view, week_view, booking_modal | FullCalendar component, doctor filter, status filter, click-to-book | Sidebar nav |
| S33 | Booking Form (Modal) | `/ops/appointments` (modal) | select_patient, select_doctor, select_slot, confirming, confirmed | Patient picker, doctor picker, slot grid, confirm button | Calendar empty slot click |
| S34 | Queue Management | `/ops/queue` | loading, populated (with checked-in patients), empty (no appointments), SSE_connected, SSE_disconnected | Today's appointment list, "Check In" buttons (large, green), current queue (token + patient name), SSE status indicator | Sidebar nav |
| S35 | Billing List | `/ops/billing` | loading, populated, empty, filtered | Invoice table (number, patient, amount, status, date), status filter, date range filter | Sidebar nav |
| S36 | Invoice Detail | `/ops/billing/[invoiceId]` | loading, draft (editable), sent (readonly), paid (readonly) | Line items table (editable in draft), subtotal/tax/discount/total, "Add Item" button, "Send" button, "Record Payment" button, Stripe payment section | Billing list click |
| S37 | Payment Modal | `/ops/billing/[invoiceId]` (modal) | select_method, cash_form, stripe_form, processing, success, failed | Payment method selector (Cash / Stripe), amount input, reference input, Stripe Elements form | Invoice "Pay" button |

## Public Screens

| # | Screen | Route | States | Key Components | Linked From |
|---|--------|-------|--------|----------------|-------------|
| S40 | Queue Display | `/queue-display/[facilityId]` | loading, active (patients in queue), empty (no one waiting) | Facility name header, current serving token (LARGE), next 5 tokens, auto-refresh via SSE | Direct URL (displayed on TV) |

---

## Shared Components

| Component | Used In | Description |
|-----------|---------|-------------|
| `FacilitySwitcher` | All shells (top nav) | Dropdown showing user's facilities with active indicator |
| `RoleBadge` | Team management, nav | Color-coded badge showing user role |
| `PatientSearchBar` | S20, S30, S33 | Debounced search input with dropdown results |
| `StatusBadge` | Appointments, invoices, encounters | Color-coded status indicator (draft=grey, active=blue, paid=green, overdue=red) |
| `AllergyWarningBanner` | S22 (encounter editor) | Red/orange banner when prescribed drug matches allergy. Shows substance, reaction, severity. Override button |
| `AILoadingIndicator` | S22 (AI sidebar) | Pulsing animation while AI processes. Shows "Generating summary..." text |
| `AutosaveIndicator` | S22 (encounter editor) | Small text: "Saved" → "Saving..." → "Saved ✓" with timestamp |
| `ConfirmationModal` | Sign-off, delete, send | "Are you sure?" with action description and confirm/cancel buttons |
| `EmptyState` | All list screens | Illustration + helpful message + CTA. e.g., "No patients yet. Register your first patient →" |
| `ErrorState` | All screens | Error icon + message + retry button + support contact |

---

## Screen Count Summary

| Category | Count |
|----------|-------|
| Auth screens | 6 |
| Admin screens | 7 |
| Clinical screens | 3 (encounter editor has 6+ sub-states) |
| Operations screens | 8 |
| Public screens | 1 |
| **Total unique screens** | **25** |
| **Total unique states** | **~60+** |

# Pages Bible — Part 3: Encounters/EMR & Billing

> Cross-referenced against: `openapi.yaml`, `04-screen-inventory.md`, `02-SRS.md`, `DESIGN.md`

---

## 5. Encounter / EMR Pages

### PG-040 · Encounter Workspace (Doctor View) — **Hero Page**

| Property | Value |
|----------|-------|
| **Route** | `/clinical/patients/[id]/encounters/[encId]` |
| **Shell** | Clinical (sidebar collapses to icon mode to maximize space) |
| **Access** | DOCTOR (edit), NURSE (vitals only), FACILITY_ADMIN (read-only) |
| **API Calls** | `GET /encounters/{id}`, `PUT /encounters/{id}/vitals`, `PUT /encounters/{id}/soap`, `POST /encounters/{id}/diagnoses`, `POST /encounters/{id}/prescriptions`, `POST /encounters/{id}/sign-off`, `POST /ai/copilot/summary`, `POST /ai/copilot/differentials`, `POST /ai/copilot/expand-soap` |
| **Events Emitted** | `encounter.signed_off` → billing, pharmacy, lab, notifications |

**3-Column Layout:**
```
┌────────────────┬─────────────────────────────────┬────────────────┐
│ LEFT 280px     │ CENTER (flex)                    │ RIGHT 320px    │
│ Patient Summary│ Encounter Editor                 │ AI Copilot     │
├────────────────┼─────────────────────────────────┼────────────────┤
│ 👤 Ahmed B.   │ ┌── Vitals ─────────────────┐   │ 🤖 AI Summary  │
│ CEA-2026-001  │ │ BP: [130]/[82] HR: [78]   │   │ ┌────────────┐│
│ 42M · A+      │ │ Temp: [37.0] SpO2: [98]   │   │ │ Key points ││
│               │ │ Wt: [82] Ht: [175]        │   │ │ • Diabetes  ││
│ ⚠️ ALLERGIES  │ │ BMI: 26.8 (auto)          │   │ │ • HbA1c 7.2││
│ 🔴 Penicillin │ │        [Saved ✓ 2s ago]   │   │ │ • On Metfor ││
│ 🟠 Latex      │ └────────────────────────────┘   │ └────────────┘│
│               │                                   │               │
│ ── Problems ──│ ┌── SOAP Notes ──────────────┐   │ 🤖 Differentials│
│ E11.2 Diabetes│ │ S: Patient reports...      │   │ ┌────────────┐│
│ I10 HTN       │ │ [AI expand ✨]              │   │ │ 1. E11.2   ││
│               │ │ O: On exam...              │   │ │ 2. I10     ││
│ ── Last Enc ──│ │ A: Assessment...           │   │ │ 3. E78.5   ││
│ 12 Mar 2026   │ │ P: Plan...                 │   │ └────────────┘│
│ Dr. Youssef   │ │        [Saving... ⟳]       │   │               │
│ Follow-up DM  │ └────────────────────────────┘   │ ⚠️ AI Suggest │
│               │                                   │ Verify before │
│ ── Upcoming ──│ ┌── Diagnoses ───────────────┐   │ saving        │
│ No upcoming   │ │ [🔍 Search ICD-10...]      │   │               │
│               │ │ P: E11.2 Type 2 DM         │   │ ── History ── │
│ [View Full    │ │ S: I10 Hypertension        │   │ Past docs,    │
│  Profile →]   │ │ [+ Add diagnosis]          │   │ lab results,  │
│               │ └────────────────────────────┘   │ order sets    │
│               │                                   │               │
│               │ ┌── Prescriptions ────────────┐   │               │
│               │ │ [🔍 Search drug...]         │   │               │
│               │ │ ┌──────────────────────┐    │   │               │
│               │ │ │ Metformin 850mg      │    │   │               │
│               │ │ │ 1 tab BID × 30 days  │    │   │               │
│               │ │ │ Qty: 60     [✕]      │    │   │               │
│               │ │ └──────────────────────┘    │   │               │
│               │ │ [+ Add prescription]        │   │               │
│               │ └────────────────────────────┘   │               │
│               │                                   │               │
│               │ ┌── Lab Orders ───────────────┐   │               │
│               │ │ [+ Order Lab Test]          │   │               │
│               │ │ HbA1c · Fasting · Pending   │   │               │
│               │ └────────────────────────────┘   │               │
├────────────────┴─────────────────────────────────┴────────────────┤
│  [Save Draft (ghost)]                   [Sign Off Encounter ✓]   │
│                                          ↑ disabled until Dx set │
└──────────────────────────────────────────────────────────────────┘
```

**Sub-component States:**

| Component | States |
|-----------|--------|
| Vitals | `empty` → `partial` → `complete` · autosave on blur · BMI auto-calc |
| SOAP Editor | `empty` → `typing` → `autosaving` (debounce 2s) → `autosaved` · `ai_expanding` → `ai_expanded` |
| Diagnosis | `empty` → `searching` (ICD-10 typeahead) → `selected` → `added` |
| Prescription | `empty` → `drug_search` → `form` → `allergy_warning` → `added` |
| Lab Orders | `empty` → `searching` → `selected` → `ordered` |
| AI Copilot | `loading` → `summary_loaded` → `differentials_loaded` · `error` · `rate_limited` · `unavailable` |
| Sign-off | `disabled` (no assessment) → `enabled` → `confirming` (modal) → `signed_off` (readonly) |
| Autosave | `idle` → `saving` → `saved ✓ 2s ago` |

**UX Rules:**
- ✅ Autosave on every field blur (vitals) and debounced 2s (SOAP text)
- ✅ Autosave indicator: "Saved ✓ 2s ago" / "Saving..." / "Error — Retry"
- ✅ Keyboard-first: Tab order = vitals → S → O → A → P → diagnoses → Rx → sign-off
- ✅ AI suggestion label: "🤖 AI Suggestion — Verify before saving" (yellow-info badge)
- ✅ Allergy warning: red banner when prescribed drug matches allergy, with override button + reason
- ✅ Sign-off confirmation modal shows summary: diagnoses, prescriptions, orders, billing preview
- ✅ After sign-off: encounter becomes **read-only**, amendment flow with audit trail only
- ✅ Favourites/order sets: "Diabetes follow-up panel" quick-add (all standard orders)
- ✅ "Repeat last prescription" button from previous encounter

**API alignment:** All encounter APIs exist ✅. Gaps:
```yaml
POST /encounters/{id}/lab-orders        # NEW — order lab tests from encounter
POST /encounters/{id}/radiology-orders  # NEW — order radiology from encounter
GET /encounters/{id}/amendments         # NEW — amendment history after sign-off
POST /encounters/{id}/amend             # NEW — create amendment with audit trail
GET /drugs/search?q=                    # NEW — drug search endpoint for Rx writer
GET /icd10/search?q=                    # NEW — ICD-10 code search endpoint
GET /order-sets                         # NEW — saved order set templates
```

---

### PG-041 · Vitals Panel (sub-component or dedicated tab)

Already part of encounter workspace (PG-040 center column, top section).

**Additional detail:**
- Fields: BP (sys/dia), HR, Temp, RR, SpO2, Weight, Height
- Auto-calc: BMI = weight / (height/100)²
- Trend sparkline: mini chart showing last 5 visits' vitals next to each field
- Unit conversion toggle: kg↔lb, cm↔in, °C↔°F (per org settings)
- Partial entry allowed — no "all required" constraint

---

### PG-042 · Prescription Writer (sub-component)

Part of encounter workspace (PG-040 center column).

**Drug entry flow:**
```
1. [🔍 Search drug...] → typeahead with brand/generic names
2. Select drug → form expands:
   ┌──────────────────────────────────────────┐
   │ Drug: Metformin 850mg (Glucophage)       │
   │ Form: [Tablet ▾]  Strength: [850mg]     │
   │ Dose: [1 tablet]  Frequency: [BID ▾]    │
   │ Duration: [30 days]  Route: [Oral ▾]     │
   │ Quantity: [60] (auto-calc: 1×2×30)       │
   │ Refills: [0]                             │
   │ Instructions to patient: [Take with food]│
   │ Notes to pharmacist: [                  ]│
   │ [Cancel]              [Add to Encounter] │
   └──────────────────────────────────────────┘
3. If allergy match detected:
   ┌──────────────────────────────────────────┐
   │ ⚠️ ALLERGY WARNING                      │
   │ Patient is allergic to Penicillin (Severe)│
   │ Amoxicillin is a penicillin derivative.  │
   │                                          │
   │ [Cancel Prescription]                    │
   │ [Override — I acknowledge the risk]      │
   │   Reason: [                            ] │
   └──────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Quantity auto-calculates: dose × frequency × duration
- ✅ Frequency presets: OD, BID, TID, QID, PRN, HS, stat
- ✅ "Repeat last Rx" button: copies all prescriptions from most recent encounter
- ✅ Allergy cross-check happens client-side AND server-side
- ✅ Print layout: clinic header + footer, patient name, MRN, prescriptions table, doctor signature line

---

### PG-043 · Encounter Sign-off (Modal)

| Property | Value |
|----------|-------|
| **Trigger** | Click "Sign Off Encounter" button on PG-040 |
| **API** | `POST /encounters/{id}/sign-off` |

**Layout:**
```
┌──────────────────────────────────────────┐
│  Sign Off Encounter                [✕]   │
├──────────────────────────────────────────┤
│  Patient: Ahmed Benali (CEA-2026-00001)  │
│  Doctor: Dr. Youssef Amrani              │
│  Date: 15 Apr 2026                       │
│                                          │
│  📋 Summary:                             │
│  Diagnoses: E11.2, I10                   │
│  Prescriptions: Metformin 850mg BID      │
│  Lab Orders: HbA1c, Fasting glucose      │
│                                          │
│  💰 Billing Preview:                     │
│  Consultation fee: 300 MAD               │
│  Lab: HbA1c: 150 MAD                    │
│  Total: 450 MAD                         │
│                                          │
│  ⚠️ This action is irreversible.         │
│  The encounter will be locked after      │
│  sign-off. Use amendments for changes.   │
│                                          │
│  [Cancel]        [Confirm & Sign Off ✓]  │
└──────────────────────────────────────────┘
```

**Post sign-off events:**
1. `encounter.signed_off` → creates invoice (auto)
2. → sends prescriptions to pharmacy queue
3. → sends lab orders to lab queue
4. → notifies patient (if portal enabled)

---

## 6. Billing & Finance Pages

### PG-050 · Invoice List

| Property | Value |
|----------|-------|
| **Route** | `/ops/billing` |
| **Shell** | Operations |
| **Access** | RECEPTIONIST, ACCOUNTANT, FACILITY_ADMIN, ORG_ADMIN |
| **API Calls** | `GET /invoices?status=&facility_id=&from_date=&to_date=&doctor_id=&page=` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Invoices                                    [+ Create Invoice] │
├─────────────────────────────────────────────────────────────────┤
│  Running totals:  Billed: 45,200 MAD │ Paid: 38,600 │ Due: 6,600 │
├─────────────────────────────────────────────────────────────────┤
│  Filters: [Date range ▾] [Status ▾] [Doctor ▾] [Payment ▾]    │
├───────┬────────────┬──────────┬──────────┬──────────┬──────────┤
│ #     │ Patient    │ Date     │ Amount   │ Status   │ Actions  │
├───────┼────────────┼──────────┼──────────┼──────────┼──────────┤
│INV-042│ Ahmed B.   │ 15 Apr   │ 450 MAD  │🟢 PAID   │ [View]  │
│INV-041│ Fatima Z.  │ 14 Apr   │ 300 MAD  │🟡 SENT   │ [View]  │
│INV-040│ Karim I.   │ 14 Apr   │ 600 MAD  │🔴 OVERDUE│ [View]  │
├───────┴────────────┴──────────┴──────────┴──────────┴──────────┤
│  Showing 1-20 of 342      [◀ 1 2 3 ... 18 ▶]                  │
└─────────────────────────────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Running totals update with applied filters
- ✅ Click row → Invoice Detail (PG-051)
- ✅ Quick keyboard nav for cashiers (j/k rows, Enter to open)
- ✅ Status badges match DESIGN.md: 🟢 PAID, 🟡 SENT, 🔴 OVERDUE, ⚪ DRAFT, ⚫ VOID

---

### PG-051 · Invoice Detail / Edit

| Property | Value |
|----------|-------|
| **Route** | `/ops/billing/[invoiceId]` |
| **API Calls** | `GET /invoices/{id}`, `PUT /invoices/{id}`, `POST /invoices/{id}/send`, `POST /invoices/{id}/payment`, `POST /invoices/{id}/pay/stripe` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Invoices    INV-2026-00042         [Print] [Email] [⋮]  │
├─────────────────────────────────────────────────────────────┤
│  Patient: Ahmed Benali  │  Encounter: 15 Apr 2026          │
│  Doctor: Dr. Youssef    │  Facility: Ain Diab Clinic       │
├─────────────────────────────────────────────────────────────┤
│  LINE ITEMS                                                  │
│  ┌────────────────┬─────┬──────────┬──────────┬───────────┐ │
│  │ Service        │ Qty │ Unit Price│ Discount │ Total     │ │
│  ├────────────────┼─────┼──────────┼──────────┼───────────┤ │
│  │ Consultation   │  1  │  300 MAD │  0%      │  300 MAD  │ │
│  │ HbA1c Test     │  1  │  150 MAD │  0%      │  150 MAD  │ │
│  │ [+ Add item]   │     │          │          │           │ │
│  ├────────────────┴─────┴──────────┴──────────┼───────────┤ │
│  │                              Subtotal      │  450 MAD  │ │
│  │                 Discount [10% ▾] Reason: ▾ │  -45 MAD  │ │
│  │                              Tax (0%)      │    0 MAD  │ │
│  │                              TOTAL         │  405 MAD  │ │
│  └────────────────────────────────────────────┴───────────┘ │
│                                                              │
│  PAYMENT HISTORY                                             │
│  ┌──────────┬────────┬──────────┬───────────┬──────────────┐│
│  │ Date     │ Amount │ Method   │ Reference │ By           ││
│  ├──────────┼────────┼──────────┼───────────┼──────────────┤│
│  │ 15 Apr   │200 MAD │ Cash     │ —         │ Receptionist ││
│  └──────────┴────────┴──────────┴───────────┴──────────────┘│
│  Balance due: 205 MAD                                        │
│                                                              │
│  [Record Payment]  [Send to Patient]  [Void Invoice]        │
└─────────────────────────────────────────────────────────────┘
```

**States:** `draft` (editable) → `sent` → `partially_paid` → `paid` | `overdue` | `void`

**UX Rules:**
- ✅ Line items editable only in DRAFT status
- ✅ Discount requires predefined reason category (staff discount, insurance, loyalty, hardship)
- ✅ "Duplicate invoice" for repeat services (monthly follow-up)
- ✅ Warn when payment exceeds balance (overpayment)
- ✅ Auto-status transition: balance = 0 → PAID with timestamp
- ✅ Print layout: clinic header/footer, patient info, line items, totals, payment history

**API Gaps:**
```yaml
POST /invoices                  # NEW — manual invoice creation (not from encounter)
POST /invoices/{id}/void        # NEW — void invoice with reason
GET /invoices/{id}/pdf          # NEW — generate PDF for download/email
POST /invoices/{id}/duplicate   # NEW — clone invoice for repeat billing
```

---

### PG-052 · Record Payment (Modal)

| Property | Value |
|----------|-------|
| **Trigger** | "Record Payment" button on PG-051 |
| **API Calls** | `POST /invoices/{id}/payment` (cash/bank) or `POST /invoices/{id}/pay/stripe` (card) |

**Layout:**
```
┌──────────────────────────────────────────┐
│  Record Payment                    [✕]   │
├──────────────────────────────────────────┤
│  Invoice: INV-2026-00042                 │
│  Balance due: 205 MAD                    │
│                                          │
│  Amount: [205.00] MAD                    │
│  ⚠️ Exceeds balance (if >205)           │
│                                          │
│  Method: ○ Cash  ○ Card  ○ Bank  ○ Ins  │
│                                          │
│  ── If Cash ──                           │
│  Reference: [optional receipt #        ] │
│                                          │
│  ── If Card ──                           │
│  [Stripe Elements: card number/exp/cvc]  │
│                                          │
│  ── If Bank ──                           │
│  Reference: [transfer #               ] │
│  Date: [2026-04-15]                      │
│                                          │
│  ── If Insurance ──                      │
│  Provider: [CNSS ▾]                      │
│  Claim #: [                            ] │
│                                          │
│  [Cancel]            [Record Payment ✓]  │
└──────────────────────────────────────────┘
```

---

### PG-053 · Revenue Dashboard

| Property | Value |
|----------|-------|
| **Route** | `/admin/analytics` (finance tab) |
| **API Calls** | `GET /orgs/{id}/revenue?period=&facility_id=` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Revenue Analytics          [Today] [Week] [Month] [Custom] │
├─────────────────────────────────────────────────────────────┤
│  KPI Row                                                     │
│  [Total: 45.2K] [Collected: 38.6K] [Outstanding: 6.6K] [Avg: 380] │
├──────────────────────────────┬──────────────────────────────┤
│  Revenue Trend (line chart)  │  Revenue by Service (donut)  │
│  Daily/weekly over selected  │  Consultation: 60%           │
│  period                      │  Lab: 25%                    │
│                              │  Pharmacy: 10%               │
│                              │  Other: 5%                   │
├──────────────────────────────┴──────────────────────────────┤
│  Revenue by Doctor (bar chart)                               │
│  Dr. Youssef: 18.2K │ Dr. Amina: 14.1K │ ...               │
├─────────────────────────────────────────────────────────────┤
│  This month vs last month: ↑12% revenue │ ↑8% patients      │
├─────────────────────────────────────────────────────────────┤
│  Reports: [Revenue by Service ⬇] [By Payer ⬇] [Aging ⬇]   │
│  Export: [CSV] [Excel] [PDF]                                 │
└─────────────────────────────────────────────────────────────┘
```

**API Gaps:**
```yaml
GET /orgs/{id}/revenue/by-service    # NEW — breakdown by service category
GET /orgs/{id}/revenue/by-doctor     # NEW — breakdown by doctor
GET /orgs/{id}/revenue/by-payer      # NEW — breakdown by payer type
GET /orgs/{id}/revenue/aging         # NEW — receivables aging report
GET /reports/export?type=&format=    # NEW — generic report export endpoint
```

---

## Audit Summary — Part 3

### API Gaps Found

| Missing Endpoint | Priority | Phase |
|-----------------|----------|-------|
| `POST /encounters/{id}/lab-orders` | P0 | 1 |
| `POST /encounters/{id}/radiology-orders` | P1 | 2 |
| `GET /drugs/search?q=` | P0 | 1 |
| `GET /icd10/search?q=` | P0 | 1 |
| `GET /order-sets` | P1 | 1 |
| `POST /encounters/{id}/amend` | P1 | 1 |
| `POST /invoices` (manual creation) | P0 | 1 |
| `POST /invoices/{id}/void` | P0 | 1 |
| `GET /invoices/{id}/pdf` | P0 | 1 |
| `GET /orgs/{id}/revenue/by-service` | P1 | 1 |
| `GET /orgs/{id}/revenue/by-doctor` | P1 | 1 |
| `GET /reports/export` | P2 | 2 |

### Layout Improvements

| Page | Improvement |
|------|-------------|
| Encounter | Added lab/radiology ordering inline, order sets, "repeat last Rx", amendment flow |
| Prescription | Added quantity auto-calc, frequency presets, repeat button, print layout spec |
| Sign-off modal | Added billing preview before confirmation |
| Invoice List | Added running totals with filters, cashier keyboard shortcuts |
| Invoice Detail | Added discount reasons, void flow, duplicate button, payment history table |
| Revenue | Full dashboard with 4 chart types, comparison, export options |

---

> **Next:** Part 4 — Pharmacy, Lab, Radiology & Inventory Pages

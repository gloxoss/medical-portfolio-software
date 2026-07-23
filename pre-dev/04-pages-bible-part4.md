# Pages Bible — Part 4: Pharmacy, Lab, Radiology & Inventory

> Phase 2 modules. Cross-referenced against: `openapi-phase2.yaml`, `04-screens-phase2-3.md`

---

## 7. Pharmacy Module (Phase 2)

### PG-060 · Dispensing Queue

| Property | Value |
|----------|-------|
| **Route** | `/pharmacy/queue` |
| **Shell** | Pharmacy |
| **Access** | PHARMACIST |
| **API** | `GET /pharmacy/queue?status=pending,dispensing&facility_id=` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Pharmacy Queue                        🟢 Live (SSE)        │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Pending] [Dispensing] [Completed] [Rejected]│
├────────┬──────────┬────────────────────┬────────┬───────────┤
│ Rx #   │ Patient  │ Drugs              │ Doctor │ Action    │
├────────┼──────────┼────────────────────┼────────┼───────────┤
│ RX-042 │ Ahmed B. │ Metformin 850mg ×60│ Dr. Y  │ [Dispense]│
│        │ CEA-001  │ ⚠️ Allergy alert!  │        │           │
│ RX-041 │ Fatima Z.│ Amoxicillin 500 ×30│ Dr. Y  │ [Dispense]│
│ RX-040 │ Karim I. │ Omeprazole 20mg×28 │ Dr. A  │ [Dispense]│
└────────┴──────────┴────────────────────┴────────┴───────────┘
```

**UX Rules:**
- ✅ Live queue via SSE — new Rx appears when encounter signed off
- ✅ Allergy alerts shown inline (red badge on drug row if match detected)
- ✅ Click [Dispense] → opens Dispense Detail (PG-061)
- ✅ Batch auto-assigned order: soonest expiry first (FEFO)

---

### PG-061 · Dispense Detail

| Property | Value |
|----------|-------|
| **Route** | `/pharmacy/dispense/[rxId]` |
| **API** | `GET /pharmacy/prescriptions/{id}`, `POST /pharmacy/prescriptions/{id}/dispense`, `GET /pharmacy/inventory?drug_id=` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Queue    Dispense Prescription RX-042                     │
├─────────────────────────────────────────────────────────────┤
│  Patient: Ahmed Benali │ Allergy: 🔴 Penicillin (Severe)    │
│  Doctor: Dr. Youssef   │ Encounter: 15 Apr 2026             │
├─────────────────────────────────────────────────────────────┤
│  PRESCRIPTION                                                │
│  ┌──────────────┬──────┬─────────┬───────┬────────────────┐ │
│  │ Drug         │ Dose │ Freq    │ Dur   │ Qty Prescribed │ │
│  ├──────────────┼──────┼─────────┼───────┼────────────────┤ │
│  │ Metformin    │ 1tab │ BID     │ 30d   │ 60 tablets     │ │
│  │ 850mg tablets│      │         │       │                │ │
│  └──────────────┴──────┴─────────┴───────┴────────────────┘ │
│                                                              │
│  STOCK CHECK                                                 │
│  ┌──────────────┬──────────┬───────────┬─────────┬────────┐ │
│  │ Batch        │ Expiry   │ Available │ Select  │ Qty    │ │
│  ├──────────────┼──────────┼───────────┼─────────┼────────┤ │
│  │ MET-2026-003 │ Mar 2027 │ 120 tabs  │ ● ←     │ [60]   │ │
│  │ MET-2026-001 │ Dec 2026 │ 45 tabs   │ ○       │        │ │
│  └──────────────┴──────────┴───────────┴─────────┴────────┘ │
│  Stock after dispensing: 120 → 60 tabs                       │
│  ⚠️ Below reorder level (75) — auto-suggest PO              │
│                                                              │
│  Instructions to patient: Take with food                     │
│                                                              │
│  [Reject (reason required)]          [Confirm Dispense ✓]   │
├─────────────────────────────────────────────────────────────┤
│  Dispensing charge: 60 × 5 MAD = 300 MAD → added to invoice │
└─────────────────────────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Auto-select batch with earliest expiry (FEFO)
- ✅ Stock decremented on confirm, charge added to patient invoice
- ✅ Low stock warning triggers auto-suggest Purchase Order
- ✅ Reject flow: pharmacist must enter reason, notification sent to prescribing doctor
- ✅ If allergy detected: prominent red banner with contact doctor option

---

### PG-062 · Drug Catalog

| Route | `/pharmacy/drugs` |
|-------|-------------------|
| **API** | `GET /pharmacy/drugs?q=&category=&page=`, CRUD operations |

**Layout:** Data table — columns: Name, Generic, Form (tablet/syrup/...), Strength, Category, Company, Unit, Price, Stock. CRUD modal for add/edit. Search + filter by category.

**CodeCanyon alignment:** Smart Hospital has explicit `Medicine Category`, `Medicine Company`, `Medicine Unit` sub-pages. MediCore simplifies: categories/companies managed as dropdown values within drug create/edit modal (**not separate pages**).

---

### PG-063 · Pharmacy Inventory

| Route | `/pharmacy/inventory` |
|-------|----------------------|
| **API** | `GET /pharmacy/inventory?low_stock=true&expiring_days=30` |

**Layout:**
```
Alerts row: [🔴 3 expired] [🟠 8 low stock] [🟡 5 expiring <30d]

Table: Drug │ Batch │ Expiry │ In Stock │ Reorder Level │ Status
─────────────────────────────────────────────────────────────────
Metformin  │ M-003 │ Mar 27│ 60      │ 75            │ 🟠 Low
Amoxicillin│ A-012 │ Nov 26│ 0       │ 50            │ 🔴 Out
Omeprazole │ O-008 │ Jun 26│ 200     │ 100           │ 🟢 OK

Actions: [Adjust Stock] [Create PO] [Export]
```

---

### PG-064–065 · Purchase Orders & Suppliers

Standard CRUD pages for PO lifecycle (create → approve → receive → close) and supplier management. See `04-screens-phase2-3.md` S74-S75 for existing spec. No major gaps.

---

## 8. Lab (Pathology) Module (Phase 2)

### PG-070 · Lab Orders Queue

| Property | Value |
|----------|-------|
| **Route** | `/lab/queue` |
| **Shell** | Lab |
| **Access** | LAB_TECH, DOCTOR (view only) |
| **API** | `GET /lab/orders?status=pending,specimen_collected,results_entered&facility_id=` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Lab Orders Queue                      🟢 Live (SSE)        │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Pending] [Specimen] [Results] [Authorized] │
├────────┬──────────┬────────────────┬─────────┬──────────────┤
│ Order  │ Patient  │ Tests          │ Urgency │ Status       │
├────────┼──────────┼────────────────┼─────────┼──────────────┤
│ LO-042 │ Ahmed B. │ CBC, CRP, HbA1c│ 🔴 STAT │ Pending      │
│ LO-041 │ Fatima Z.│ Lipid Panel    │ 🟢 Routine│ Specimen ✓  │
│ LO-040 │ Karim I. │ TSH, Free T4   │ 🟢 Routine│ Results in  │
└────────┴──────────┴────────────────┴─────────┴──────────────┘
Click row → Lab Order Detail (PG-071)
```

---

### PG-071 · Lab Order Detail & Result Entry

| Property | Value |
|----------|-------|
| **Route** | `/lab/orders/[orderId]` |
| **API** | `GET /lab/orders/{id}`, `PUT /lab/orders/{id}/specimen`, `PUT /lab/orders/{id}/results`, `POST /lab/orders/{id}/authorize` |

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  ← Queue    Lab Order LO-042                                 │
├─────────────────────────────────────────────────────────────┤
│  Patient: Ahmed Benali │ Doctor: Dr. Youssef │ 15 Apr 2026  │
│  Urgency: 🔴 STAT  │  Fasting: Yes  │  Status: specimen_collected │
├─────────────────────────────────────────────────────────────┤
│  SPECIMEN TRACKING                                           │
│  Specimen ID: [SPL-2026-00042]  │  Collected: 15 Apr 08:15  │
│  Type: Blood (venous)  │  Collected by: Nurse Khadija       │
│  [Mark Specimen Collected ✓] (if pending)                    │
├─────────────────────────────────────────────────────────────┤
│  RESULTS ENTRY                                               │
│  ┌──────────┬────────┬──────────────┬────────┬─────────────┐│
│  │ Test     │ Result │ Normal Range │ Unit   │ Flag        ││
│  ├──────────┼────────┼──────────────┼────────┼─────────────┤│
│  │ WBC      │[15,000]│ 4,000-11,000 │ /μL    │🔴 HIGH      ││
│  │ RBC      │ [4.8M] │ 4.5-5.5M     │ /μL    │🟢 NORMAL    ││
│  │ Hgb      │ [14.2] │ 13.5-17.5    │ g/dL   │🟢 NORMAL    ││
│  │ CRP      │ [45]   │ 0-5          │ mg/L   │🔴 HIGH      ││
│  │ HbA1c    │ [7.2]  │ 4.0-5.6      │ %      │🟠 BORDERLINE││
│  └──────────┴────────┴──────────────┴────────┴─────────────┘│
│  Auto-flag: result auto-compared to normal range             │
│                                                              │
│  Comments: [Elevated CRP suggests inflammation...]           │
│                                                              │
│  [Submit for Authorization]                                  │
├─────────────────────────────────────────────────────────────┤
│  AUTHORIZATION (Doctor/Supervisor)                           │
│  Reviewed by: Dr. Amina │ Authorized: [Approve] [Re-do]    │
│  Re-do notes: [Rerun CRP — value seems high       ]        │
└─────────────────────────────────────────────────────────────┘
```

**UX Rules:**
- ✅ Auto-flagging: result compared to normal range → flag color (🟢 normal, 🟠 borderline, 🔴 abnormal)
- ✅ Abnormal values displayed in `var(--status-danger)` with `font-weight: 590`
- ✅ Authorization workflow: tech submits → supervising doctor reviews → approve or re-do
- ✅ On authorize: results pushed to encounter timeline + charges added to invoice
- ✅ Specimen barcode/ID tracking for chain of custody

---

### PG-072 · Lab Test Catalog

| Route | `/lab/catalog` |
|-------|----------------|

Standard CRUD: Test name, code, specimen type (blood/urine/stool), normal ranges (by age/sex), department, price. Panel grouping (e.g., "CBC Panel" = WBC + RBC + Hgb + Plt).

---

## 9. Radiology Module (Phase 2)

### PG-080 · Radiology Queue

Same pattern as lab queue. Route: `/radiology/queue`. Columns: Order#, Patient, Modality (X-ray/US/CT/MRI), Body Part, Status.

### PG-081 · Radiology Report Entry

| Route | `/radiology/orders/[orderId]` |
|-------|-------------------------------|

**Layout:**
```
┌─────────────────────────────────────────────────────────────┐
│  Radiology Report — Order RAD-042                            │
├─────────────────────────────────────────────────────────────┤
│  Study: Chest X-ray PA  │  Patient: Ahmed B.                │
│  Requested by: Dr. Youssef │ Clinical question: R/O pneumonia│
├─────────────────────────────────────────────────────────────┤
│  REPORT                                                      │
│  Template: [Chest X-ray Normal ▾] [Apply]                   │
│                                                              │
│  Findings:                                                   │
│  [Rich text editor — describe what is seen               ]  │
│                                                              │
│  Impression:                                                 │
│  [Conclusion / summary                                   ]  │
│                                                              │
│  Attachments: [Upload images] (JPEG/PNG/DICOM)              │
│  ┌────────┐ ┌────────┐                                      │
│  │ img1   │ │ img2   │                                      │
│  └────────┘ └────────┘                                      │
│                                                              │
│  [Save Draft]              [Submit for Authorization]       │
└─────────────────────────────────────────────────────────────┘
```

**Key difference from lab:** Text-based report (findings + impression) instead of structured numeric results. Template picker for common study types. Image upload to R2.

### PG-082 · DICOM Viewer

Route: `/radiology/viewer/[studyId]`. Embeds Cornerstone.js viewer or Orthanc iframe. Full-screen, dark background. Measurement tools, window/level adjustment, zoom.

---

## 10. Inventory Module (Phase 2)

### PG-090 · Inventory Dashboard

| Route | `/ops/inventory` |
|-------|-------------------|

**Layout:**
```
Alert bar: [🔴 5 items out of stock] [🟠 12 below reorder] [🟡 8 expiring <30d]

KPI: [Total items: 342] [Total value: 28.4K MAD] [Categories: 18]

Table: Item │ Category │ Unit │ In Stock │ Reorder │ Status │ Actions
──────────────────────────────────────────────────────────────────────
Gloves (M) │ Supplies │ Box  │ 5        │ 20      │ 🔴 Low │ [Adjust]
Syringes   │ Supplies │ Pack │ 150      │ 50      │ 🟢 OK  │ [Adjust]
```

### PG-091–094 · Item Catalog, Stock Transactions, Purchase Orders, Suppliers

Standard CRUD pages matching `04-screens-phase2-3.md` S100-S104. Key features:
- **Item catalog:** Name, category, unit type (box/strip/tablet/pack), reorder level
- **Stock transactions:** Receive (from PO), Issue (to ward/department), Adjust (count correction), Return
- **Purchase orders:** Create → approve → receive → close lifecycle
- **Unit handling:** Box → Strip → Tablet conversion (e.g., 1 box = 10 strips = 100 tablets)

---

## Audit Summary — Part 4

### API Gaps (Phase 2)

| Missing Endpoint | Already in openapi-phase2.yaml? |
|-----------------|-------------------------------|
| `GET /pharmacy/queue` | ✅ Yes |
| `POST /pharmacy/prescriptions/{id}/dispense` | ✅ Yes |
| `GET /pharmacy/inventory?low_stock=true` | ✅ Yes, but add `expiring_days` param |
| `GET /lab/orders/{id}` | ✅ Yes |
| `PUT /lab/orders/{id}/results` | ✅ Yes |
| `POST /lab/orders/{id}/authorize` | ✅ Yes |
| `GET /radiology/orders` | ✅ Yes |
| `POST /radiology/orders/{id}/report` | ✅ Yes |
| `GET /inventory/items` | ✅ Yes |
| `POST /inventory/transactions` | ✅ Yes |
| `GET /pharmacy/inventory?expiring_days=30` | ⚠️ Add filter param |
| `GET /lab/catalog?panel_id=` (panel grouping) | ⚠️ Add param |

### New UX Patterns Found

| Pattern | Description |
|---------|-------------|
| FEFO batch selection | Auto-select soonest-expiry batch for dispensing |
| Auto-flagging | Lab results auto-compared to normal ranges |
| Authorization workflow | Two-step: tech submits → doctor approves |
| Template picker | Radiology report templates for common studies |
| Unit conversion | Inventory box→strip→tablet conversion |
| Low-stock auto-PO | Suggest purchase order when stock hits reorder level |

---

> **Next:** Part 5 — IPD, HR, Portal, Settings & Audit Pages

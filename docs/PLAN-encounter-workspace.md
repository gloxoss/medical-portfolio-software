# MediCore HIS: Encounter Workspace Plan (PG-040)

> **Document Type**: Development Blueprint & Socratic Gate
> **Target**: `apps/web/src/app/(clinical)/encounters/[id]/page.tsx`

The Encounter Workspace is the core clinical module where doctors submit SOAP notes, record vitals, look up ICD-10 diagnoses, and write prescriptions. It utilizes a highly complex, dense 3-column Layout grid.

---

## 🛑 Phase 0: Socratic Gate (User Review Required)

**Before writing any code, 3 decisions are required:**

### P0 · Layout Architecture
**Question:** Build the full 3-column layout (sidebar + SOAP + AI Copilot) now, or 2-column first?
**Why this matters:**
- 3-col requires a highly responsive CSS Grid collapse strategy immediately.
- 2-col ships significantly faster, and the 3rd column can be structurally appended later.
**Recommended:** 2-column first (Hide the AI Copilot until Phase 2).

### P1 · SOAP Autosave Strategy
**Question:** Fixed 2s interval `onDebounce(save)` or user-configurable by clinic?
**Why this matters:**
- Fixed = simpler standard React hook.
- Configurable = Requires `org_settings` DB lookup before the component can mount.
**Recommended:** Fixed 2s Interval (Can upgrade to configurable later).

### P2 · ICD-10 Search Mocking
**Question:** Stub the `/icd10/search` endpoint locally or wait for backend development?
**Why this matters:**
- To build the frontend UI for `PG-040`, we need the Diagnoses Typeahead to drop down.
- There are thousands of ICD-10 codes. We must simulate this with MSW locally.
**Recommended:** Stub a small list of 10 generic codes (E11.2, I10) in `patient.api.ts` frontend-only for now until Backend Phase 3.

> **Reply to this document:** `defaults` or `1a 2b 3a`

---

## 📋 Phase 1: Micro-Blueprint (Task Breakdown)

If the standards above are approved, here is the exact 8-task cold-start execution graph:

```text
T1 (Layout Wrapper) → T2 (Vitals Panel) → T3 (SOAP Editor)
                                            ↓
T6 (Encounter Page) ← T5 (Prescription Rx) ← T4 (ICD-10 Diagnoses)
```

- [ ] **T1: Encounter Layout Shell** — Create `apps/web/src/components/encounters/EncounterLayout.tsx`
  → Context: Implements the 2-column CSS grid natively.
- [ ] **T2: Vitals Component** — Create `VitalsPanel.tsx` (PG-041)
  → Context: Form capturing BP, HR, Temp, Weight, Height with active BMI calc script.
- [ ] **T3: SOAP Editor Component** — Create `SoapEditor.tsx`
  → Context: Implements the 2s debounced `useMutation` hook to autosave.
- [ ] **T4: Diagnosis Typeahead** — Create `DiagnosisSearch.tsx`
  → Context: Combobox component simulating ICD-10 queries.
- [ ] **T5: Prescription Writer** — Create `RxWriter.tsx` (PG-042)
  → Context: Drug lookup form containing frequency presets and Auto-Calc duration fields.
- [ ] **T6: Assembly & Page** — Wire components into `/encounters/[encId]/page.tsx`
  → Context: Apply Zustand context boundaries and load the overarching Patient details in the left Sidebar.

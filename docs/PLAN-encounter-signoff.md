# MediCore HIS: Encounter Sign-off Plan (PG-043)

> **Document Type**: Development Blueprint & Socratic Gate
> **Target feature**: Encounter Sign-Off Modal (PG-043) and Post-Sign-Off locks.

The Encounter Sign-off process locks the clinical data, flags the encounter as `read-only`, and fires an event to the Billing system to auto-generate the Draft Invoice.

---

## 🛑 Phase 0: Socratic Gate (User Review Required)

**Before writing any code, 3 decisions are required:**

### P0 · Form Aggregation Strategy
**Question:** Should the Sign-Off confirmation modal fetch a fresh payload from the DB (`GET /encounters/{id}`), or render the summary derived purely from the local Zustand `useEncounterStore`?
**Why this matters:**
- Fresh Fetch = Guarantees what you sign is exactly what is stored in Mongo. No "stuck" async requests. (Safest).
- Zustand State = Zero latency UI, but risks signing a document when an autosave chunk failed 100ms prior.
**Recommended:** Fresh Fetch (Safety first for clinical sign-offs).

### P1 · Post-Sign-Off Routing
**Question:** After successful sign-off, should we redirect the user to the newly generated Draft Invoice (`/billing/[id]`), stay on the Encounter page (now read-only lock), or return to the Patient Timeline?
**Why this matters:**
- Redirect to Invoice = Optimizes cashier workflow (if doctor = cashier).
- Stay on Encounter = Best for purely clinical "finish charting" flows.
**Recommended:** Stay on Encounter (Render the read-only locked state, displaying a "View Invoice" link).

### P2 · Pre-flight Assessment Validation
**Question:** The API explicitly blocks sign-off if `soap.assessment` is empty. Should the frontend actively disable the "Sign-Off" Trigger button while the assessment is empty, or let them click it and show the API error?
**Why this matters:**
- Disabling Button = Great strict UX, but requires `useEncounterStore` to deeply map to the `PG-040` button.
- Click + Error = Simpler wiring, uses the standard toast error pop.
**Recommended:** Disable Button (Proactive UX prevents user frustration).

> **Reply to this document:** `defaults` or `1a 2b 3a`

---

## 📋 Phase 1: Micro-Blueprint (Task Breakdown)

If the standards above are approved, here is the exact 4-task execution graph:

```text
T1 (API Hook) → T2 (SignOff Modal UI) → T3 (Integration) → T4 (Read-Only Lock)
```

- [ ] **T1: Sign Off Mutation Hook** — Create `useSignOffEncounter.ts`
  → Context: Wraps the `EncounterApi.signOff` endpoint with `useMutation` and invalidates the active patient queries.
- [ ] **T2: Sign-off Modal Component** — Create `SignOffModal.tsx`
  → Context: Builds the confirmation dialog aggregating Diagnoses, Prescriptions, and the warning that the lock is irreversible (PG-043). Uses `useQuery` for the fresh payload.
- [ ] **T3: Injection & Validation** — Append the Modal into `EncounterLayout.tsx`
  → Context: Wire the button inside `PG-040` to trigger the modal. Disable the button if `soapDraft.assessment` is empty based on Zustand state.
- [ ] **T4: Read-Only Enforcement** — Update `SoapEditor.tsx`, `VitalsPanel.tsx`, etc.
  → Context: If `encounter.status === 'signed_off'`, swap all input fields to disabled `<span>` variants to strictly enforce the clinical lock visually.

# MediCore HIS
## Full App Audit, Tour, and Implementation Enhancement Playbook

Version: 1.0  
Date: 2026-04-13  
Primary target: medicore-his monorepo implementation

---

## 1. Purpose

This playbook is the complete operating guide for auditing the full MediCore app.

It gives you:
- A full end-to-end tour sequence by role and domain
- Expected behavior for each major product area
- A visual audit format and scoring model
- A defect discovery and root-cause method
- A concrete process to ship new implementations and enhancements safely

Use this as the single source for:
- QA audit sessions
- Product demo readiness
- Regression checks after changes
- Prioritizing implementation next steps

---

## 2. Scope and Audit Target

## 2.1 Scope
Audit target is the full app under:
- medicore-his/apps/web
- medicore-his/apps/api
- medicore-his/apps/ai

Support docs:
- medicore-his/docs/CURRENT_VERSION_GUIDE.md
- medicore-his/docs/FULL_FEATURE_TESTING_RUNBOOK.md
- pre-dev and blueprint docs

## 2.2 Included Domains
- Staff auth and role shells
- Admin workflows
- Operations workflows
- Clinical workflows
- Patient portal workflows
- Billing and payments
- Lab workflows
- Security and tenant isolation
- Visual quality and usability

## 2.3 Excluded Domains (until implemented)
These can be tracked as roadmap, not regression failure for current build:
- Pharmacy full module (if incomplete in current branch)
- Telemedicine full production flow (if incomplete)
- IPD, radiology, messaging, HR, advanced integrations where not yet fully shipped

---

## 3. Audit Modes

Run three complementary modes every cycle.

## 3.1 Functional Audit
Checks core behavior and business correctness.

## 3.2 Technical Audit
Checks API contracts, error handling, security, data boundaries, and performance signals.

## 3.3 Visual Audit
Checks UI quality, consistency, accessibility, responsiveness, and anti-patterns.

---

## 4. Environment and Boot Checklist

## 4.1 Prerequisites
- Node 20+
- pnpm 9+
- Docker and Docker Compose
- Python 3.11+ (for AI sidecar)

## 4.2 Boot Sequence
Run from medicore-his root:

```bash
cp .env.example .env
pnpm db:up
pnpm install
pnpm --filter @medicore/api db:migrate
pnpm --filter @medicore/api db:seed
pnpm dev
```

AI sidecar in second terminal:

```bash
cd apps/ai
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 4.3 Health Checks
- Web: http://localhost:3000
- API: http://localhost:3001/api/v1/health
- AI: http://localhost:8000/health

PASS when all three are reachable.

---

## 5. Full Tour Sequence (Master Regression Flow)

Follow this exact order to audit the full app in one pass.

1. Staff login and role routing
2. Admin shell and settings
3. Operations shell and patient intake
4. Scheduling and queue check-in
5. Clinical encounter and sign-off
6. Billing verification and payment flows
7. Lab order and result workflow
8. Patient portal end-to-end
9. Security and negative tests
10. Visual and UX audit sweep
11. Enhancement planning handoff

---

## 6. Functional Tour by Domain

## 6.1 Auth and Session Domain

### Audit Steps
1. Open login page.
2. Login with seeded admin, doctor, receptionist users.
3. Attempt invalid credential login.
4. Confirm shell and route access reflects role.

### Expected Behavior
- Valid credential: successful auth and correct shell navigation.
- Invalid credential: clear error, no broken state.
- Session persists according to token/cookie policy.

### Defect Signals
- Wrong shell after login
- Silent login failure
- Redirect loops

---

## 6.2 Admin Domain

### Target Routes
- /dashboard
- /team
- /facilities
- /services
- /analytics
- /audit-log
- /settings

### Audit Steps
1. Open each route from sidebar.
2. Verify data loads without runtime errors.
3. Create/update where allowed.
4. Refresh page and confirm persistence.

### Expected Behavior
- Lists and cards render correctly.
- CRUD actions persist and refresh correctly.
- Audit logs capture sensitive changes.

### Defect Signals
- Missing tenant filter behavior
- Updates not persisting after reload
- No audit trail for state changes

---

## 6.3 Operations Domain

### Target Routes
- /patients
- /patients/new
- /appointments
- /queue
- /billing
- /billing/[invoiceId]
- /lab
- /lab/orders/[id]
- /lab/orders/[id]/result

### Audit Steps
1. Register a new patient.
2. Search patient by name/MRN/phone.
3. Book appointment in future slot.
4. Check in patient from queue.
5. Validate billing appears after clinical sign-off.
6. Open invoice and process payment path.

### Expected Behavior
- Patient appears immediately in list after creation.
- Appointment booking rejects conflicts.
- Queue action generates visible check-in state.
- Billing reflects encounter completion.

### Defect Signals
- Duplicate booking accepted
- Queue state mismatch between pages
- Invoice generation delay beyond expected asynchronous window

---

## 6.4 Clinical Domain

### Target Routes
- /schedule
- /patients
- /patients/[id]
- /encounters/[id]
- /encounter/[id] (legacy/alternate)

### Audit Steps
1. Create schedule availability.
2. Open encounter from active queue/appointment.
3. Enter vitals and SOAP notes.
4. Add diagnosis and prescription.
5. Trigger sign-off.

### Expected Behavior
- Clinical data persists on save.
- Sign-off transitions encounter to locked/read-only state.
- Post sign-off write attempts are rejected.

### Defect Signals
- Sign-off does not lock encounter
- Diagnosis changes are local-only and not persisted
- Clinical writes accepted after lock

---

## 6.5 Billing and Payment Domain

### Audit Steps
1. Open generated invoice.
2. Verify line items and totals.
3. Test record-cash path.
4. Test Stripe initiation.
5. Validate success/cancel pages.

### Expected Behavior
- Totals are accurate and consistent.
- Paid statuses are idempotent and stable.
- Callback pages are clear and deterministic.

### Defect Signals
- Totals mismatch between list and detail
- Duplicate payment side effects
- Callback loops or stale statuses

---

## 6.6 Lab Domain

### Audit Steps
1. Open lab queue/list.
2. Filter/search by order/patient/status.
3. Open order detail.
4. Execute status transitions.
5. Submit result components.
6. Verify visibility in portal.

### Expected Behavior
- Status machine is enforced.
- Invalid transitions are rejected.
- Completed results are visible to correct patient only.

### Defect Signals
- Out-of-order transitions allowed
- Result saved but not retrievable
- Cross-patient lab leakage

---

## 6.7 Patient Portal Domain

### Target Routes
- /portal/login
- /portal/dashboard
- /portal/records
- /portal/appointments
- /portal/labs
- /portal/invoices
- /portal/settings
- /portal/profile

### Audit Steps
1. Login via OTP flow.
2. Validate dashboard data ownership.
3. Book/cancel/reschedule appointments.
4. Review records and lab results.
5. Trigger invoice payment path.
6. Update settings and GDPR requests.

### Expected Behavior
- Strict self-scoping: only own records.
- Portal session and consent behavior are coherent.
- GDPR requests return acknowledged/queued responses.

### Defect Signals
- Access to another patient data
- OTP/rate-limit contract mismatch
- Consent gate bypass

---

## 7. Security and Negative Testing Matrix

Run all checks below every audit cycle.

| Check | Action | Expected |
|---|---|---|
| Missing auth | Remove token/cookie and call protected route | 401/redirect, no leakage |
| Wrong role | Use unauthorized role for staff routes | 403 or blocked access |
| Cross-tenant ID | Access resource from another org/facility | 404/403 |
| Portal self-scope | Try patient A reading patient B data | Blocked always |
| OTP wrong code | Submit invalid OTP | 401 |
| OTP expired | Verify after TTL | 410 Gone |
| OTP rate-limit | Exceed request window | 429 |
| Encounter lock | Write after sign-off | Rejected |
| Payment idempotency | Confirm already-paid invoice again | Stable already_paid behavior |

---

## 8. Visual Audit Format (Use This Exact Template)

## 8.1 Visual Audit Scorecard (Per Page)

Use this sheet for every audited screen.

| Field | Value |
|---|---|
| Page/Route | |
| Persona | |
| Device/Viewport | Desktop 1440 / Tablet 1024 / Mobile 390 |
| Theme | Light / Dark |
| Reviewer | |
| Date | |

### Dimension Scores (0-4)
| Dimension | Score | Notes |
|---|---|---|
| Information hierarchy | | |
| Readability/typography | | |
| Contrast/accessibility | | |
| Spacing/rhythm | | |
| Interaction clarity | | |
| Responsive integrity | | |
| State clarity (loading/empty/error) | | |
| Token consistency | | |

Total: /32

Rating bands:
- 28-32: Excellent
- 22-27: Good
- 16-21: Acceptable but needs improvement
- <16: Requires redesign pass

## 8.2 Visual Defect Severity
- P0: Blocks usage or violates critical accessibility
- P1: Major usability issue likely to cause task failure
- P2: Noticeable quality issue with workaround
- P3: Polish issue

## 8.3 Visual Defect Log Entry
| Field | Value |
|---|---|
| Defect ID | |
| Severity | P0/P1/P2/P3 |
| Route | |
| Screenshot | |
| Problem statement | |
| Expected visual behavior | |
| Actual visual behavior | |
| Probable cause | |
| Suggested fix | |

---

## 9. How to Find Problems Fast

## 9.1 Triangulation Method
For every bug, capture three signals:
1. UI symptom (what user sees)
2. Network/API evidence (request/response)
3. Server/client log evidence

A defect is reproducible only when all three are recorded.

## 9.2 Root-Cause Workflow
1. Reproduce consistently with minimal steps.
2. Identify failing layer:
   - UI state
   - API contract
   - Service/domain logic
   - Data access
   - Infra/env
3. Verify whether issue is known gap versus regression.
4. Document fix candidate and risk.

## 9.3 Common Symptom-to-Cause Map

| Symptom | Likely Layer | First Place to Check |
|---|---|---|
| Blank widget with no error | Frontend state handling | Query hook and component fallbacks |
| 401/403 in normal flow | Auth/role/tenant headers | Guard and request headers |
| 503 on analytics snapshot | Data source adapter | Analytics datasource implementation |
| Empty calendar density | Scheduling service | Monthly counts query path |
| Route 404 from nav | Missing page or wrong path | Route inventory and sidebar links |
| Sign-off still editable | Domain lock policy | Encounter write guards |

---

## 10. How Everything Should Behave (Golden Rules)

1. Every protected action is auth-checked, role-checked, tenant-scoped.
2. Every data page must render all four states:
   - loading
   - error
   - empty
   - data
3. Clinical sign-off is irreversible in normal workflow and locks edits.
4. Billing and payment operations are idempotent.
5. Portal views are strictly self-scoped to the authenticated patient.
6. UI must remain usable on desktop and mobile baseline widths.
7. No visible nav element should knowingly route users to dead ends in production mode.

---

## 11. New Implementations and Enhancements Workflow

Use this process for every new feature or enhancement.

## 11.1 Intake and Scope
1. Map request to blueprint step and pre-dev reference.
2. Define acceptance criteria and non-goals.
3. Identify dependencies and impacted modules.

## 11.2 Micro-Blueprint (Atomic Tasks)
Break into tasks <= 15 minutes each with explicit verification check.

Task template:
- Task name
- Files touched
- Depends on
- Done when
- Risk level

## 11.3 Implementation Order
1. Contracts/types
2. Repository/data access
3. Service logic
4. Controller/API
5. Web API client
6. Hook/state
7. UI components
8. Route integration

## 11.4 Validation Gates
- Typecheck API and web
- Targeted unit/integration tests
- Manual role-based smoke tour
- Visual audit score >= 22/32 for modified screens

## 11.5 Rollout and Hardening
- Update changelog and runbook sections impacted.
- Add regression steps for new behavior to this playbook.
- Track open risk items with owner and due date.

---

## 12. Enhancement Prioritization Model

Use this matrix to prioritize what to build next.

Score each item from 1-5:
- User impact
- Safety/compliance impact
- Revenue/operations impact
- Engineering effort (inverse)
- Dependency unblock value

Priority score:
- (Impact + Safety + Revenue + Unblock) - Effort

Priority bands:
- 14-20: Now
- 10-13: Next
- 6-9: Later
- <=5: Backlog

---

## 13. Audit Evidence and Reporting Format

## 13.1 Session Evidence Table

| Area | Flow | Result | Evidence | Owner |
|---|---|---|---|---|
| Auth | Login + role shell | PASS/FAIL | screenshot/log | |
| Ops | Registration + appointment + queue | PASS/FAIL | links/logs | |
| Clinical | Encounter + sign-off | PASS/FAIL | payload/screens | |
| Billing | Invoice + payment | PASS/FAIL | request traces | |
| Portal | OTP + records + invoices | PASS/FAIL | screenshots | |
| Security | Negative matrix | PASS/FAIL | error codes | |
| Visual | Scorecard average | PASS/FAIL | score sheets | |

## 13.2 Defect Ticket Format
- Title
- Environment
- Reproduction steps
- Expected
- Actual
- Evidence
- Impact and severity
- Suspected layer
- Proposed fix

---

## 14. Exit Criteria

Audit is complete only when:
1. Master full-tour sequence completed end-to-end.
2. Security/negative matrix fully executed.
3. Visual scorecards completed for all critical pages.
4. All P0/P1 defects triaged with owner and action.
5. Regression rerun confirms no newly introduced critical breaks.

---

## 15. Quick Command Appendix

```bash
# from medicore-his root
cp .env.example .env
pnpm db:up
pnpm install
pnpm --filter @medicore/api db:migrate
pnpm --filter @medicore/api db:seed
pnpm dev

# AI sidecar
cd apps/ai
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 16. What to Improve Next (Recommended)

1. Finish/close known domain gaps before expanding route surface.
2. Add explicit error state components where silent empty states remain.
3. Introduce visual regression snapshots for critical pages.
4. Add a standing weekly audit pass using this exact playbook and scorecards.
5. Keep this file updated whenever routes, contracts, or flows change.

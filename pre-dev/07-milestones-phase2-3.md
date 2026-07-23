# Phase 2 & 3 — Milestones & Timeline

## MediCore HIS — Full Product Milestones (M5–M10)

> Extends `07-milestones.md` (M1–M4). MVP milestones remain unchanged.

---

## Gantt — Full Product Timeline

```mermaid
gantt
    title MediCore HIS — Full Product Timeline (18 Months)
    dateFormat YYYY-MM-DD
    axisFormat %b '%y

    section Phase 1 (MVP)
    Steps 1-3 Foundation           :p1a, 2026-04-14, 35d
    Steps 4-9 Backend MVP          :p1b, after p1a, 56d
    Steps 10-13 Frontend MVP       :p1c, after p1b, 48d
    Testing + Beta                 :p1d, after p1c, 24d

    section Phase 2
    Step 14-15 Patient Portal      :p2a, after p1d, 14d
    Step 16 Lab Module             :p2b, after p2a, 10d
    Step 17 Pharmacy Module        :p2c, after p2b, 10d
    Step 18 Telemedicine           :p2d, after p2c, 8d
    Step 19 IPD Module             :p2e, after p2d, 12d
    Step 20 Inventory              :p2f, after p2e, 6d
    Step 21 Radiology              :p2g, after p2f, 8d
    Step 22 Messaging              :p2h, after p2g, 6d
    Step 23 Triage + Ambient AI    :p2i, after p2h, 10d
    Step 24 Platform Features      :p2j, after p2i, 12d
    Step 25 Analytics + Polish     :p2k, after p2j, 8d

    section Phase 3
    Steps 26-27 HR Module          :p3a, after p2k, 18d
    Steps 28-29 Workflow Engine    :p3b, after p3a, 22d
    Steps 30-31 Mobile Apps        :p3c, after p3b, 32d
    Step 32 FHIR API               :p3d, after p3c, 12d
    Step 33 AI Advanced            :p3e, after p3d, 10d
    Step 34-35 Ambulance + Polish  :p3f, after p3e, 12d

    section Milestones
    M1 Foundation Complete         :milestone, after p1a, 0d
    M2 Backend MVP                 :milestone, after p1b, 0d
    M3 Full MVP                    :milestone, after p1c, 0d
    M4 First Clinic Live           :milestone, after p1d, 0d
    M5 Phase 2 Core Complete       :milestone, after p2e, 0d
    M6 Phase 2 Complete            :milestone, after p2k, 0d
    M7 Phase 3 Complete            :milestone, after p3f, 0d
```

---

## M5 — Phase 2 Core Complete (Target: Month 10)

| Deliverable | Verification |
|-------------|-------------|
| Patient portal live (OTP auth, records, booking, payments) | Patient completes full self-service flow |
| Lab module working (order → specimen → result → authorize → billing) | Full lab cycle in <5 minutes |
| Pharmacy module working (Rx → dispense → stock → billing) | Allergy check fires correctly |
| IPD module working (admit → rounds → discharge → billing) | Full inpatient stay simulated |
| Telemedicine working (video + encounter + billing) | Video call on Chrome + mobile browser |
| 5+ clinics on platform | Multi-tenant with portal access |

**Sign-off**: Full simulation: OPD visit with lab order → results → pharmacy dispensing → billing → patient pays via portal.

---

## M6 — Phase 2 Complete (Target: Month 12)

| Deliverable | Verification |
|-------------|-------------|
| All Phase 2 modules live | Steps 14–25 passing acceptance |
| Radiology, messaging, triage, CMS, i18n, campaigns all working | Feature-level done checklist for each |
| ≥200 concurrent users supported | Load test with k6 passing |
| Arabic RTL rendering correct | Manual review of all screens |
| At least 1 campaign sent successfully | SMS campaign delivered |
| At least 2 workflows executing | Automation log shows executions |
| MRR ≥ $1,000 | Stripe dashboard |

**Sign-off**: Full product demo covering all modules, recorded as video.

---

## M7 — Phase 3 Complete (Target: Month 18)

| Deliverable | Verification |
|-------------|-------------|
| HR module working (staff, attendance, leave, payroll) | Payroll generated + payslip PDF |
| Workflow engine (rules + visual builder) | 5 workflows running in production |
| Patient mobile app in App Store + Play Store | Downloads possible |
| Doctor mobile app in App Store + Play Store | Doctor completes encounter from phone |
| FHIR R4 API validated | HAPI FHIR validator passes |
| AI advanced (optimization, risk scoring) | Schedule suggestions generated |
| MRR ≥ $3,500 | Stripe dashboard |

**Sign-off**: Oussama uses doctor mobile app to complete an encounter with AI copilot, patient pays via mobile app.

---

## Financial Milestones (Updated for Full Product)

```mermaid
graph LR
    A["Month 0<br/>$0 MRR<br/>Dev starts"] --> B["Month 7<br/>$0 MRR<br/>First clinic beta"]
    B --> C["Month 9<br/>$50 MRR<br/>First paying customer"]
    C --> D["Month 12<br/>$1,000 MRR<br/>Phase 2 complete<br/>10+ clinics"]
    D --> E["Month 18<br/>$3,500 MRR<br/>Phase 3 complete<br/>50+ clinics"]
    E --> F["Month 24<br/>$8,000+ MRR<br/>Mobile + FHIR<br/>100+ clinics"]
    F --> G["Month 36<br/>$15,000+ MRR<br/>Enterprise tier<br/>200+ clinics"]

    style C fill:#4CAF50,color:#fff
    style E fill:#4CAF50,color:#fff
    style G fill:#9C27B0,color:#fff
```

---

## Infrastructure Cost Scaling

| Phase | Monthly Cost | Revenue Target | Margin |
|-------|-------------|---------------|--------|
| Phase 1 (MVP) | $102–117 | $50+ MRR | Break-even |
| Phase 2 (10 clinics) | $150–200 | $1,000 MRR | ~80% |
| Phase 3 (50 clinics) | $300–500 | $3,500 MRR | ~85% |
| Scale (200 clinics) | $1,000–1,500 | $15,000+ MRR | ~90% |

---

## Key Scaling Decision Points

| Decision Point | When | Options |
|---------------|------|---------|
| Hire first developer? | MRR > $1,000 OR Phase 2 taking >6 months | Part-time frontend dev ($500–800/mo) |
| Upgrade Railway → Dedicated? | >100 concurrent users consistently | Railway Pro ($50/service) |
| Upgrade Atlas → M30? | >5GB clinical data | M30 ($570/mo) |
| Enterprise customer asks for dedicated instance? | First enterprise inquiry | Separate Railway project ($200/mo extra) |
| Consider seed funding? | Product-market fit proven (20+ paying clinics) | $100K–250K to accelerate hiring + marketing |

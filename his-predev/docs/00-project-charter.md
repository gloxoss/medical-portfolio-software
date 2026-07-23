# 00 — Project Charter
### MediCore HIS · EPIOSO Studio

---

## 1. Project identity

| Field | Value |
|---|---|
| **Product name** | MediCore HIS |
| **Studio** | EPIOSO |
| **Owner / Builder** | Oussama Zaki (zakio) |
| **Location** | Casablanca, Morocco |
| **Academic context** | M1 Medical Engineering & Informatics — ENSAM |
| **Project type** | Greenfield SaaS product |
| **Start date** | 2025 |
| **MVP target** | Multi-branch clinic chain |

---

## 2. Vision

Build a SaaS-grade Health Information System that serves clinics, hospitals, and diagnostic labs across MENA and francophone Africa — with a stronger AI story, cleaner architecture, and genuine multi-tenancy than anything available on CodeCanyon or the regional market.

This is not a freelance project. It's an EPIOSO studio product — built to become a real revenue-generating SaaS and to position Oussama as a serious healthcare tech engineer at a global level.

---

## 3. Stakeholders

### Current state — solo
Oussama is the sole builder, decision-maker, and product owner. There are no partners, investors, or co-founders at this stage.

| Role | Person | Status |
|---|---|---|
| Product owner | Oussama Zaki | Active |
| Lead engineer | Oussama Zaki | Active |
| AI/ML engineer | Oussama Zaki | Active |
| Co-founder / technical partner | TBD | Seeking |
| Investor | TBD | Seeking |
| Early adopter clinic | TBD | Seeking |

### Path to finding help
- Co-builder: look within ENSAM or medical engineering networks — someone with clinical domain knowledge
- Early adopter: approach 1-2 Casablanca clinic groups before MVP is complete — offer 6 months free in exchange for real feedback
- Investor: after MVP is validated with at least one paying customer — approach Morocco's ecosystem (Maroc PME, Outlierz, CDG Invest) and regional health tech VCs

### RACI for solo phase
Since Oussama is doing everything, RACI is simple:
- All decisions: Oussama
- All code: Oussama
- All design: Oussama
- Escalation path for stuck problems: Claude / AI pair programming

---

## 4. Business goals (realistic for solo, bootstrapped)

These are survival and validation goals — not growth projections:

| Goal | Target | Timeframe |
|---|---|---|
| Ship deployable MVP | 1 real clinic using it daily | Month 6 |
| First paying customer | 1 clinic on monthly subscription | Month 8 |
| Cover hosting costs | MRR ≥ $50/month | Month 9 |
| Prove multi-tenancy | 3+ orgs on same instance | Month 10 |
| First real revenue | MRR ≥ $500/month | Month 12 |

No Year 1 MRR targets beyond $500/mo. The goal of Year 1 is validation, not scale.

---

## 5. Budget & financial reality

**Budget: $0 external. Bootstrapped entirely.**

| Cost item | Solution |
|---|---|
| Hosting (dev) | Free tiers: Vercel hobby, Railway $5/mo, MongoDB Atlas free |
| Hosting (prod) | Railway $20/mo + MongoDB Atlas M10 $57/mo = ~$80/mo at launch |
| AI API costs | OpenAI — budgeted $30/mo max, rate-limited per org |
| SMS (Twilio) | Pay-as-you-go, ~$0.02/SMS. First clinic ~$5/mo |
| Domain | ~$12/yr |
| **Total burn rate** | ~$120/month at MVP launch |
| Funded by | Freelance income from other EPIOSO projects |

**Rule**: No feature that costs > $20/month to run gets built before there's a paying customer.

---

## 6. Constraints

### Technical constraints
- **Stack is locked**: Next.js · NestJS · PostgreSQL · MongoDB · Redis · FastAPI (AI only)
- **Solo developer capacity**: ~15-20 hours/week while studying. Build phases sized accordingly.
- **No mobile apps in Phase 1**: Web-only, responsive. React Native is Phase 3.
- **No custom PACS in Phase 1**: Orthanc integration is Phase 2.

### Compliance — not a blocker for MVP
- No HIPAA requirement for Morocco-based MVP (HIPAA is US law)
- No formal certification required to launch in Morocco in Year 1
- Data residency: MongoDB Atlas EU (Ireland) for now — no MENA region Atlas tier without high cost
- GDPR-style data handling built in from the start (consent, right to delete) even if not legally required yet
- When scaling to a hospital: formal compliance consultation needed before signing. Not now.

### Time constraints
- Oussama studies full-time at ENSAM — this is built in parallel
- No all-nighters. Sustainable pace. One PR per day on build days.
- Hard stop: anything that would take > 1 week to debug gets scoped out or replaced with a simpler solution

---

## 7. Success definition for MVP

The MVP is complete and shippable when all of the following are true:

1. An org admin can onboard their clinic group (org + 2 facilities + 3 doctors) without any help from Oussama
2. A receptionist can register a patient, book an appointment, and check them in
3. A doctor can open an encounter, record vitals, write SOAP, issue a prescription, and sign off — under 5 minutes
4. The AI copilot gives a useful patient summary and differential suggestions for a patient with 2+ prior visits
5. The billing module auto-creates an invoice on sign-off and the patient can pay online
6. Two facilities under the same org have zero data cross-contamination
7. The system handles 50 concurrent users without degradation

---

## 8. What this project is NOT

- Not a consulting project for a specific client (it's a product)
- Not a CodeCanyon script (it's a real SaaS with real architecture)
- Not a research prototype (it ships to real clinics)
- Not a portfolio demo (it processes real patient data)
- Not a get-rich-quick scheme (healthcare SaaS has long sales cycles — this is a 3-year play)

---

## 9. Revision history

| Date | Change | Author |
|---|---|---|
| 2025 | Initial charter created | Oussama Zaki |
| 2025 | Architecture updated: NestJS replaces FastAPI for main backend; FastAPI retained for AI only; PostgreSQL added as primary relational DB | Oussama Zaki |

# Phase 0 — Project Charter

## MediCore HIS · EPIOSO Studio · Oussama Zaki

---

## 1. Problem Statement

Outpatient clinics and mid-sized polyclinic networks — particularly in Morocco, MENA, and francophone Africa — are trapped between two bad options: overpriced, rigid enterprise EHRs (Athenahealth at 4–10% of collections, Tebra at $349–624/provider/month) and dangerously insecure CodeCanyon scripts ($39–199 one-time, built on aging PHP monoliths with zero compliance or modern AI). Neither option offers genuine multi-tenancy, event-driven workflow automation, or AI-native clinical intelligence at a price a solo practitioner or 5-doctor polyclinic can afford. The result: clinicians spend 2+ hours per 1 hour of patient care on manual documentation ("pajama time"), billing leakage reaches 5–15% of revenue, and cross-location operations run on disconnected spreadsheets.

---

## 2. Business Objective

Build and launch a multi-tenant SaaS Hospital Information System that combines a clinical operations core (appointments → encounters → prescriptions → billing) with an AI copilot layer (text-to-SOAP expansion, differential suggestions, investigation recommendations) — priced aggressively enough to win solo practitioners and polyclinics away from legacy tools, while architected cleanly enough to scale toward hospitals and diagnostic centers in later phases.

### Measurable KPIs (Year 1 — Validation, Not Growth)

| KPI | Target | Timeframe |
|-----|--------|-----------|
| Ship deployable MVP | 1 real clinic using it daily | Month 6 |
| First paying customer | 1 clinic on monthly subscription | Month 8 |
| Cover hosting costs | MRR ≥ $50/month | Month 9 |
| Prove multi-tenancy | 3+ orgs on same instance, zero data contamination | Month 10 |
| First real revenue | MRR ≥ $500/month | Month 12 |
| AI copilot adoption | ≥60% of encounters use at least 1 AI feature | Month 12 |

**Year 1 is validation, not scale.** No vanity metrics. If 3 clinics pay monthly and doctors actually use the AI copilot by Month 12, the product is validated.

---

## 3. Stakeholder Map

### Current State — Solo, Bootstrapped

| Name | Role | Responsibility | Status |
|------|------|---------------|--------|
| Oussama Zaki | Founder / Lead Engineer | Architecture, full-stack development, product vision, AI engineering | Active |
| TBD | Co-builder / Clinical advisor | Domain knowledge, clinical workflow validation, user testing | Seeking (ENSAM / medical engineering networks) |
| TBD | Early adopter clinic | Real-world usage, feedback loop, case study | Seeking (Casablanca clinic groups — offer 6 months free) |
| TBD | Investor | Capital injection, business development | Post-MVP (Outlierz, CDG Invest, Maroc PME, regional health tech VCs) |

### Path to Finding Help
- **Co-builder**: Look within ENSAM or medical-engineering networks — someone with clinical domain knowledge who can validate workflows
- **Early adopter**: Approach 1–2 Casablanca clinic groups before MVP is complete — offer 6 months free in exchange for real feedback and a case study
- **Investor**: After MVP is validated with at least one paying customer — approach Morocco's ecosystem first (Maroc PME, Outlierz, CDG Invest), then regional health-tech VCs

---

## 4. RACI Matrix

| Decision Area | Responsible | Accountable | Consulted | Informed |
|--------------|------------|-------------|-----------|----------|
| Architecture & tech stack | Oussama | Oussama | AI pair programming (Claude/Gemini) | — |
| Product scope & features | Oussama | Oussama | Early adopter clinic (when found) | — |
| AI model selection & prompts | Oussama | Oussama | — | — |
| Clinical accuracy & safety | Oussama | Oussama | Medical advisor (when found) | — |
| UI/UX design | Oussama | Oussama | — | — |
| Deployment & infrastructure | Oussama | Oussama | — | — |
| Pricing & business model | Oussama | Oussama | — | — |

**Escalation path for stuck problems**: AI pair programming → ENSAM network → Stack Overflow → pivot to simpler solution.

---

## 5. Explicit Out-of-Scope (What We Are NOT Building in MVP)

### Hard No — Not in Phase 1

| Item | Reason |
|------|--------|
| Mobile apps (React Native / Flutter) | Web-only, responsive. Mobile is Phase 3 |
| Patient-facing portal | Multiplies UX, security, consent surface area for little MVP revenue. Phase 2 |
| Patient triage chatbot | Medico-legally sensitive (clinical risk, liability, escalation rules). Phase 2 |
| Telemedicine / video calls | Whole product unto itself (scheduling, video infra, consent, recording). Phase 2 |
| Ambient audio transcription | Requires ASR pipelines, audio streaming, low-latency UX. Phase 2. Schema designed for it now |
| Custom PACS / DICOM viewer | Orthanc integration is Phase 2 |
| Lab module (full) | Lab orders referenced in encounters, but full lab workflow (specimen tracking, result entry, auto-flagging) is Phase 2 |
| Radiology module | Phase 2 |
| Pharmacy dispensing module | Prescriptions issued in encounters, but full dispensing workflow is Phase 2 |
| HR / attendance / payroll | Phase 3 |
| Inventory / procurement | Phase 2–3 |
| Workflow automation engine | Phase 3 |
| HL7 FHIR API | Phase 3 |
| Self-hosted / on-premise option | SaaS-first. Self-hosted is Phase 3+ |
| Multi-language UI (i18n) | French-first, Arabic/English later. Structure supports i18n from start |

### Explicitly NOT Building Ever

| Item | Reason |
|------|--------|
| Proprietary PACS from scratch | Bridge to Orthanc instead |
| Biometric hardware integrations | Beyond standard APIs |
| Single-tenant forked installations | SaaS multi-tenant only |
| Insurance claims processing (RCM) | Too complex for solo, partner with existing RCM providers later |

---

## 6. Budget & Timeline

### Budget: $0 External — 100% Bootstrapped

| Cost Item | Solution | Monthly Cost |
|-----------|----------|-------------|
| Frontend hosting | Vercel (Hobby/free tier) | $0 |
| NestJS API hosting | Railway (Starter) | $5 |
| FastAPI AI hosting | Railway (Starter) | $5 |
| PostgreSQL | Railway Postgres plugin | $5 |
| MongoDB | Atlas M0 free (dev) → M10 (prod) | $0 → $57 |
| Redis | Railway Redis plugin | $5 |
| File storage | Cloudflare R2 (10GB free) | $0 |
| AI API (OpenAI) | GPT-4o-mini primary, GPT-4o fallback. Rate-limited per org | $20–30 max |
| SMS (Twilio) | Pay-as-you-go, ~$0.02/SMS | ~$5 |
| Domain | medicore.ma or similar | $1/mo ($12/yr) |
| Email (SendGrid) | Free tier (100 emails/day) | $0 |
| **Total (dev phase)** | | **~$20/mo** |
| **Total (first clinic live)** | | **~$80–120/mo** |

**Funded by**: Freelance income from other EPIOSO projects.

**Rule**: No feature that costs >$20/month to run gets built before there's a paying customer.

### Timeline

| Milestone | Target | Duration |
|-----------|--------|----------|
| Monorepo + Auth + Tenancy | Month 1 | ~4 weeks (Steps 1–3) |
| Patients + Scheduling + Encounters | Month 2–3 | ~6 weeks (Steps 4–6) |
| Billing + Communication + AI Copilot | Month 3–4 | ~5 weeks (Steps 7–9) |
| Frontend: All screens | Month 4–6 | ~6 weeks (Steps 10–12) |
| Internal testing + bug fixing | Month 6 | ~2 weeks |
| First clinic onboarding | Month 6–7 | ~2 weeks |
| First paying customer | Month 8 | — |

**Developer capacity**: ~15–20 hours/week while studying at ENSAM. Build phases sized to 1–3 dev days each. One PR per day on build days.

---

## 7. Key Assumptions

| # | Assumption | Risk if Wrong |
|---|-----------|---------------|
| A1 | Moroccan private clinics are willing to pay $39–49/mo for cloud-based HIS | Product dies — test with free beta first |
| A2 | Doctors will adopt AI-generated SOAP notes with text input (not voice-only) | AI copilot becomes unused — monitor adoption rate closely |
| A3 | MongoDB Atlas free tier is sufficient for dev + early beta | May need to upgrade to M10 ($57/mo) earlier than planned |
| A4 | OpenAI GPT-4o-mini is accurate enough for clinical SOAP expansion | Test against GPT-4o; consider Claude as fallback |
| A5 | Solo developer can ship MVP in 6 months at 15–20 hr/week | May need 8 months — acceptable |
| A6 | Receptionists at target clinics can use a web interface (no paper workflow) | Training materials needed; some clinics may not be ready |
| A7 | Event-driven architecture (Redis pub/sub) is reliable enough without a dedicated message queue | If events are lost, consider adding BullMQ or SQS in Phase 2 |
| A8 | Railway Starter tier ($5/service) handles 50 concurrent users | Load test before onboarding first clinic |

---

## 8. Known Constraints

### Technical
- **Stack is locked**: Next.js 14 (App Router) · NestJS · PostgreSQL (Prisma) · MongoDB (Mongoose) · Redis (ioredis) · FastAPI (AI sidecar only)
- **Solo developer**: 15–20 hours/week, build phases sized accordingly
- **No mobile apps in Phase 1**: Web-only, mobile-responsive
- **AI copilot is text-to-text only in MVP**: Schema supports ambient audio, but no ASR pipeline until Phase 2
- **MVP users**: Doctors + receptionists + org admins only. No patient-facing features

### Legal & Compliance
- **No HIPAA for Morocco MVP**: HIPAA is US law; not required for Casablanca-based clinics
- **GDPR-style data handling from day one**: Consent, right to delete, data minimization, encryption in transit/at rest, audit logs — even if not legally required yet in Morocco
- **HIPAA-ready architecture**: Segregation of PHI, logging, access controls designed in — hardening + BAAs added when pursuing US market
- **Data residency**: MongoDB Atlas EU (Ireland) for now. MENA region Atlas tier is cost-prohibitive
- **No formal certification required to launch in Morocco in Year 1**
- **When scaling to a hospital**: formal compliance consultation needed before signing contracts

### Organizational
- No budget for external contractors, designers, or compliance consultants in Phase 1
- Sustainable pace — no all-nighters, no burnout
- Hard stop: anything that would take >1 week to debug gets scoped out or replaced with simpler solution

---

## 9. Open Questions Log

| # | Question | Status | Impact | Resolved |
|---|----------|--------|--------|----------|
| Q1 | Stick with Redis Pub/Sub or add BullMQ for event reliability? | Open | If events drop, billing invoices won't auto-create | — |
| Q2 | ICD-10 code set — ship a local SQLite lookup or call an external API? | Open | Affects encounter editor offline capability | — |
| Q3 | Drug catalog — where does the initial data come from for Morocco? | Open | Prescription feature needs a drug list on day 1 | — |
| Q4 | SMS provider for Morocco — Twilio or local provider (Infobip, Vonage)? | Open | Twilio pricing may be unfavorable for Moroccan numbers | — |
| Q5 | Stripe availability in Morocco — is it live or do we need an alternative (CMI, PayPal)? | Open | Payment collection depends on this | — |
| Q6 | What latency is acceptable for AI copilot responses during encounter? | Open | Impacts model choice (GPT-4o vs GPT-4o-mini) and UX design | — |

---

## 10. Revision History

| Date | Change | Author |
|------|--------|--------|
| 2025 | Initial project conception | Oussama Zaki |
| 2025 | Architecture pivot: NestJS replaces FastAPI for core backend; hybrid DB strategy adopted | Oussama Zaki |
| 2026-04-07 | Full pre-dev charter rewritten with locked decisions: text-first AI, no patient portal/triage/telemed in MVP, aggressive pricing, GDPR-first compliance | Oussama Zaki / Antigravity |

---

**Founder Signature:** Oussama Zaki / EPIOSO Studio  
**Date:** April 7, 2026

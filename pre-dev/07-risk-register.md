# Phase 7 — Risk Register

## MediCore HIS — Risk Identification, Scoring & Mitigation

> Scoring: Probability (1–5) × Impact (1–5) = Risk Score. Scores ≥12 = Critical, 8–11 = High, 4–7 = Medium, 1–3 = Low.

---

## Technical Risks

| ID | Risk | Prob | Impact | Score | Mitigation | Owner | Status |
|----|------|------|--------|-------|------------|-------|--------|
| TR-01 | **Multi-tenancy data leak** — Coding error in org_id scoping exposes one org's data to another | 2 | 5 | **10** | Prisma middleware auto-injects org_id. Repository base class for Mongo. Mandatory E2E test before every release: create 2 orgs, verify zero cross-contamination | Oussama | Open |
| TR-02 | **AI copilot generates clinically inaccurate output** — Hallucinated diagnosis or drug interaction | 3 | 5 | **15** | Human-in-the-loop mandatory. All AI output labeled "suggestion — verify". Doctor sign-off required. Log AI outputs + doctor decisions for monthly review. Conservative prompts with explicit disclaimer injection | Oussama | Open |
| TR-03 | **Redis events lost** — Sign-off event doesn't reach billing subscriber, invoice never created | 3 | 4 | **12** | Daily reconciliation cron: scan signed_off encounters without matching invoices, auto-create. Phase 2: migrate to BullMQ for at-least-once delivery | Oussama | Open |
| TR-04 | **Database schema migration breaks production** — Prisma migration on PG or Mongo schema change causes data loss | 2 | 5 | **10** | Always run migrations against a staging copy first. PG: Prisma migration history tracked in git. Mongo: schema changes are additive-only (new optional fields), never rename or delete fields without migration script | Oussama | Open |
| TR-05 | **OpenAI API outage** — AI copilot becomes unavailable for extended period | 3 | 3 | **9** | Graceful degradation: AI sidebar shows "AI unavailable" message. Core HIS works without AI. Consider Claude as fallback provider | Oussama | Open |
| TR-06 | **OpenAI rate limit hit by multiple orgs simultaneously** — Shared API key throttled | 2 | 3 | **6** | Per-user rate limiting (20/hr) is well below OpenAI's API limits. Monitor usage. If needed: implement per-org API key provisioning or queue requests | Oussama | Open |
| TR-07 | **Railway Starter tier performance** — $5/service insufficient for 50 concurrent users | 3 | 3 | **9** | Load test with k6 before onboarding first clinic. If insufficient: upgrade to Developer tier ($20/service). Total cost increase: $45/mo | Oussama | Open |
| TR-08 | **MongoDB Atlas free tier (M0) limitations** — 512MB storage, shared resources, no dedicated CPU | 3 | 3 | **9** | M0 is for dev only. Upgrade to M10 ($57/mo) before first clinic goes live. M10 supports 100GB and dedicated resources | Oussama | Open |
| TR-09 | **SSE connection reliability** — Queue display loses SSE connection without reconnection | 2 | 2 | **4** | EventSource browser API auto-reconnects. Server-side: heartbeat every 30 seconds to keep connection alive. Client: show "Reconnecting..." indicator | Oussama | Open |
| TR-10 | **Cross-database consistency failure** — Encounter in Mongo and invoice in PG get out of sync | 2 | 4 | **8** | Outbox pattern with retry (3 attempts). Reconciliation cron as safety net. Both operations logged in audit trail for manual review if needed | Oussama | Open |

---

## Business Risks

| ID | Risk | Prob | Impact | Score | Mitigation | Owner | Status |
|----|------|------|--------|-------|------------|-------|--------|
| BR-01 | **Extended sales cycle** — Moroccan clinics hesitant to adopt new SaaS (fear of data migration, learning curve) | 4 | 4 | **16** | Offer 6-month free beta. Target new/young clinics with no existing digital system (no migration needed). Limit onboarding to 30 minutes or less. In-person demo at Casablanca medical society meetings | Oussama | Open |
| BR-02 | **Solo founder burnout** — 15–20 hr/week alongside ENSAM studies unsustainable long-term | 4 | 4 | **16** | Sustainable pace rules: 1 PR/day max, no all-nighters. Hard stop: any feature taking >1 week to debug gets scoped out. Seek co-builder within 3 months. Take 1 full week off every 8 weeks | Oussama | Open |
| BR-03 | **Payment collection in Morocco** — Stripe not fully available or unfavorable rates | 3 | 3 | **9** | Investigate CMI (Centre Monétique Interbancaire), PayPal Morocco. Fallback: manual bank transfer with invoice-based tracking. Cash collection accepted (record in system) | Oussama | Open |
| BR-04 | **No co-builder found within 6 months** — Product development stays at solo capacity | 3 | 3 | **9** | Product is designed to be viable as a solo operation. If no co-builder: focus on most profitable features only, delay Phase 2 features, consider part-time freelancer for frontend | Oussama | Open |
| BR-05 | **Pricing too low for sustainability** — $39–49/mo Solo doesn't cover growing infrastructure costs | 2 | 3 | **6** | Infrastructure costs scale slowly ($80–120/mo for first 10 customers). At 10 Solo customers ($390–490/mo MRR), already 3–4x break-even. Price increase possible at 18-month mark with grandfathering | Oussama | Open |
| BR-06 | **Competitor launches AI-native HIS for MENA** — First-mover advantage lost | 2 | 4 | **8** | Ship first, iterate fast. By the time a competitor launches, MediCore should have 6+ months of real clinical data and paying customers. Switching costs (patient data) are high | Oussama | Open |

---

## Regulatory & Legal Risks

| ID | Risk | Prob | Impact | Score | Mitigation | Owner | Status |
|----|------|------|--------|-------|------------|-------|--------|
| RR-01 | **Morocco introduces strict health data regulations** — New compliance requirements mid-build | 2 | 4 | **8** | Architecture is GDPR-aligned from day 1 (encryption, audit logs, access controls, data minimization). Any new regulation is likely a subset of GDPR | Oussama | Open |
| RR-02 | **AI liability incident** — Patient harmed by doctor following AI suggestion uncritically | 1 | 5 | **5** | Every AI output labeled "suggestion — verify". Doctor digital sign-off = doctor takes clinical responsibility. Terms of service explicitly state MediCore is not a medical device. Consider professional liability insurance when revenue > $10K/yr | Oussama | Open |
| RR-03 | **Data breach — patient data exposed** | 1 | 5 | **5** | Managed cloud with encryption at rest/transit. No self-hosted VPS. RBAC. Audit logs. Rate limiting. Penetration test before first clinic live. Incident response plan documented | Oussama | Open |
| RR-04 | **GDPR data erasure request from patient via clinic** — System must actually delete data | 3 | 2 | **6** | Anonymization endpoint implemented (see `06-privacy-compliance.md`). Clinical records retained anonymized for 10 years per medical regulation; PII permanently deleted | Oussama | Open |

---

## Risk Heat Map

```
Impact 5 │        TR-02     │ TR-01,04  │ RR-02,03
         │                  │           │
Impact 4 │                  │ BR-01,02  │ TR-03  RR-01  BR-06
         │                  │           │ TR-10
Impact 3 │                  │ TR-05,07  │ BR-03,04
         │                  │ TR-08     │
Impact 2 │                  │ TR-09     │ RR-04
         │                  │           │
Impact 1 │                  │           │
         └──────────────────┼───────────┼──────────────
           Prob 1           Prob 2-3     Prob 4-5
```

**Critical (Score ≥12)**: TR-02 (AI accuracy), TR-03 (lost events), BR-01 (sales cycle), BR-02 (burnout)
**High (Score 8–11)**: TR-01, TR-04, TR-05, TR-07, TR-08, TR-10, BR-06, RR-01

---

## Risk Review Schedule

| Frequency | Action |
|-----------|--------|
| Every 2 weeks | Review TR risks during development — update probability based on actual experience |
| Monthly | Review BR risks — update based on market feedback and financial runway |
| Quarterly | Review RR risks — check for new regulations, update compliance posture |
| On incident | Immediately update affected risk score and mitigation status |

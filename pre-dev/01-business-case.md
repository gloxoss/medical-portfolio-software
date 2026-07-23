# Phase 1 — Business Case

## MediCore HIS — Investment, Revenue, and Risk Assessment

> Numbers sourced from: R1/Grok ($8K-25K estimates), R2/Gemini ($3K-3.5K bootstrapped MVP), R3/Perplexity ($5K-15K extended), his-predev project charter ($0 external, $120/mo burn rate).

---

## 1. Investment Required

### Scenario: Bootstrapped Solo Founder (Oussama's Reality)

MediCore is bootstrapped with $0 external funding. All costs are operational monthly expenses funded by freelance income from other EPIOSO projects.

#### Pre-Revenue Costs (Months 1–8)

| Category | Cost | Notes |
|----------|------|-------|
| **Infrastructure (Dev)** | $160 ($20/mo × 8) | Railway Starter × 3 services + Redis plugin |
| **MongoDB Atlas** | $0 | M0 free tier during development |
| **AI API (OpenAI)** | $80 ($10/mo × 8) | Development testing only — low volume |
| **Domain** | $12 | medicore.ma or similar |
| **SSL/CDN** | $0 | Included with Vercel + Railway |
| **Email (SendGrid)** | $0 | Free tier: 100 emails/day |
| **SMS testing (Twilio)** | $20 | Dev testing only |
| **Design tools** | $0 | Figma free tier + shadcn/ui |
| **Total pre-revenue** | **~$272** | Over 8 months |

This is **not** the $15K-25K that research sources cite for a typical health-tech SaaS launch — because Oussama is the entire team. There are no salaries, no contractors, no designers, no compliance consultants in Phase 1.

#### Cost of First Customer Live (Month 8 onwards)

| Category | Monthly Cost |
|----------|-------------|
| Railway (3 services) | $15 |
| MongoDB Atlas M10 | $57 |
| Redis (Railway) | $5 |
| Vercel (Hobby) | $0 |
| Cloudflare R2 | $0 (within free tier) |
| OpenAI API | $20–30 |
| Twilio SMS | $5–10 |
| SendGrid | $0 (within free tier) |
| **Total monthly burn** | **$102–117/mo** |

**Break-even**: 3 Solo customers ($39/mo × 3 = $117/mo) or 1 Clinic customer ($149–199/mo). Achievable by Month 9–10.

---

## 2. Revenue Model

### Pricing Tiers (Locked — Aggressive Undercut Strategy)

| Tier | Price | Target | Includes |
|------|-------|--------|----------|
| **Solo** | $39–49/mo per organization | Solo practitioners, 1 facility, 1–2 users | Full EMR, scheduling, billing, AI copilot (100 notes/mo), SMS reminders |
| **Clinic** | $149–199/mo flat (not per-provider) | Polyclinics, 2–5 facilities, up to 15 users | Everything in Solo + unlimited AI notes, multi-facility, revenue dashboard, priority support |
| **Enterprise** | Custom (starting $1,000+/mo) | Hospital networks, 5+ facilities, 50+ users | Dedicated database instance, HL7-FHIR API, custom integrations, SLA with guaranteed uptime |

### Why This Pricing Works

1. **Undercuts every mid-market competitor by 85–92%**: A 5-doctor polyclinic pays $199/mo with MediCore vs $1,500–2,500/mo with Tebra or DrChrono
2. **Per-org, not per-provider**: This is the key difference — Tebra charges per provider ($349/provider), which penalizes growth. MediCore charges per organization, which rewards it
3. **AI is included in base price**: Competitors charge $99–200/mo extra for AI features. MediCore bundles it — removing a common purchasing objection
4. **Morocco purchasing power aligned**: At $39/mo Solo, the cost is comparable to a mobile phone plan — within reach of any private practitioner in Casablanca
5. **Upgrade path built in**: Solo → Clinic is a natural expansion when a doctor opens a second location

### Revenue Projections

| Time | Customers | Mix | MRR | ARR |
|------|-----------|-----|-----|-----|
| Month 8 | 1 Solo | 100% Solo | $39–49 | $468–588 |
| Month 10 | 3 Solo + 1 Clinic | 75/25 | $266–346 | $3,192–4,152 |
| Month 12 | 5 Solo + 2 Clinic | 55/45 | $493–643 | $5,916–7,716 |
| Month 18 | 15 Solo + 5 Clinic | 40/60 | $1,330–1,730 | $15,960–20,760 |
| Month 24 | 40 Solo + 12 Clinic | 30/70 | $3,348–4,348 | $40,176–52,176 |
| Month 36 | 80 Solo + 25 Clinic | 25/75 | $6,845–8,895 | $82,140–106,740 |

**Conservative**: These projections assume zero Enterprise customers and no investor-funded growth.

---

## 3. ROI & Payback Analysis

### For Oussama (the builder)

| Metric | Value |
|--------|-------|
| **Total investment to MVP** | ~$272 (cash) + 480–640 hours (opportunity cost at $30/hr freelance = $14,400–19,200) |
| **Monthly burn post-launch** | $102–117 |
| **Break-even (cash flow)** | Month 9–10 (3 Solo customers) |
| **Payback on time investment** | Month 18–24 (when ARR covers opportunity cost) |
| **Path to $500/mo MRR** | Month 12 (5 Solo + 2 Clinic) |
| **Path to full-time viability** | Month 24–30 ($3K+ MRR, assuming Moroccan cost of living) |

### For the Customer (Dr. Youssef — Solo)

| Metric | Value |
|--------|-------|
| **Monthly cost** | $39–49 |
| **Time saved** | 1–1.5 hours/day (AI documentation + automated billing) |
| **Revenue recovered** | $200–400/mo (from previously unbilled consultations) |
| **ROI** | 400–900% (($200–400 saved) / $39–49 cost) |
| **Payback** | Day 1 — the first unbilled consultation he recovers pays for the month |

### For the Customer (Dr. Amina — Clinic)

| Metric | Value |
|--------|-------|
| **Monthly cost** | $149–199 |
| **Revenue leakage reduction** | $1,500–3,000/mo (from currently unbilled/underbilled encounters) |
| **Receptionist time saved** | 6–8 hours/week across 3 locations |
| **ROI** | 750–1,500% |
| **Payback** | Week 1 |

---

## 4. Risk / Reward Summary

### Significant Risks

| # | Risk | Probability | Impact | Mitigation |
|---|------|------------|--------|------------|
| R1 | **Extended sales cycles** — clinics fear data migration and downtime | High | High | Free beta (6 months); start with new clinics that have no existing data to migrate |
| R2 | **Regulatory evolution** — Morocco introduces HIPAA-equivalent legislation | Medium | Medium | GDPR-style architecture from day 1; HIPAA-ready design; invest in compliance when legislation materializes |
| R3 | **AI hallucinations** — copilot generates clinically inaccurate suggestions | Medium | Critical | Mandatory human-in-the-loop; "AI suggestion — verify before saving" labels; doctor digital signature on sign-off |
| R4 | **Solo founder burnout** — 15–20 hr/week alongside ENSAM studies | High | High | Sustainable pace rules; 1 PR/day; hard stop on 1-week debugging sessions. Seek co-builder early |
| R5 | **Payment collection in Morocco** — Stripe may not be fully available | Medium | Medium | Investigate CMI (Centre Monétique Interbancaire), PayPal, bank transfer as alternatives |
| R6 | **Competitor response** — incumbent adds AI at lower price point | Low | Medium | Our architecture advantage (event-driven, multi-tenant) is structural — incumbents can't retrofit this quickly |
| R7 | **Data breach** — security incident destroys trust pre-launch | Low | Critical | Encryption at rest + in transit; RBAC; audit logs; managed cloud (not self-hosted VPS); penetration testing before first clinic live |

### Rewards

| Reward | Mechanism | Timeline |
|--------|-----------|----------|
| **Extremely high LTV** | Once a clinic integrates 12+ months of patient data, switching costs are astronomical | Year 2+ |
| **AI cost arbitrage** | AI features cost <$0.01/encounter to run but save doctors 1+ hour/day — 85–90% gross margins | Immediate |
| **Regional first-mover** | No AI-native HIS exists for the MENA/francophone Africa market | Year 1 |
| **Exit optionality** | AI-first architecture makes MediCore an attractive acquisition target for aging enterprise vendors | Year 3–5 |
| **Co-founder attraction** | A working product with paying customers is the strongest co-founder pitch possible | Year 1 |
| **Investor attractiveness** | Healthcare SaaS with proven PMF commands 10–20x ARR multiples | Year 2–3 |

---

## 5. Go / No-Go Recommendation

### ✅ GO — Conditional on Validation

**The case for building is strong:**
- The market is large ($5.7B+ SAM), growing (5.4% CAGR), and underserved in the AI + affordable segment
- The cash investment is trivial ($272 pre-revenue) — the real cost is Oussama's time
- The technology stack is sound, modern, and within Oussama's proven capabilities (Next.js, NestJS, MongoDB, PostgreSQL)
- The competitive positioning is unique and defensible (AI-native + aggressive pricing + multi-tenancy)
- The first customer break-even is achievable with just 3 Solo subscriptions

**Conditions for continued investment:**
1. **Month 6**: Working MVP with full encounter + AI copilot flow
2. **Month 8**: At least 1 clinic actively using it daily (free beta OK)
3. **Month 10**: At least 1 paying customer
4. **Month 12**: MRR ≥ $500

If conditions 1–2 aren't met by Month 8, pause and reassess whether the product concept or execution is the problem. If condition 4 isn't met by Month 14, consider pivoting to a different market segment (e.g., diagnostic labs instead of clinics) or exploring a B2B2B model (selling through clinic management consultancies).

---

## 6. Financial Model Summary

```
Year 1 Scenario (Conservative)
──────────────────────────────
Revenue:    ~$6,000–8,000 ARR
Costs:      ~$1,200–1,400 (infra)
Net:        ~$4,600–$6,600
Break-even: Month 9–10

Year 2 Scenario (Growing)
─────────────────────────
Revenue:    ~$40,000–52,000 ARR
Costs:      ~$3,600 (infra + upgraded services)
Net:        ~$36,400–$48,400
Full-time viability threshold crossed

Year 3 Scenario (Scaled)
────────────────────────
Revenue:    ~$82,000–107,000 ARR
Costs:      ~$12,000 (team additions, compliance)
Net:        ~$70,000–$95,000
Investor conversations become real
```

# Phase 8 — Project Proposal

## MediCore HIS — Full Project Proposal

---

## 1. Executive Summary

MediCore is a multi-tenant SaaS Hospital Information System designed for solo practitioners and polyclinic networks. It combines clinical operations management (patients, scheduling, encounters, billing) with an AI copilot that transforms shorthand clinical notes into structured medical documentation — reducing physician documentation time by 30–45 minutes per day.

The product targets an underserved segment: affordable ambulatory clinics in Morocco, MENA, and francophone Africa that need enterprise-grade functionality at a fraction of enterprise pricing.

---

## 2. Scope of Work

### 2.1 What Will Be Delivered (MVP)

| Module | Capabilities |
|--------|-------------|
| **Authentication & Tenancy** | JWT-based auth, multi-facility roles (RBAC), atomic onboarding wizard, org/facility management |
| **Patient Management** | Registration with auto-MRN, search (name/phone/MRN), allergy register, problem list, document uploads |
| **Scheduling** | Doctor schedule management, appointment booking with conflict prevention, queue management with real-time display, SMS confirmations, no-show detection |
| **Encounters (EMR)** | Vitals recording, SOAP note editor with autosave, ICD-10 diagnosis entry, prescription writing with allergy checking, encounter sign-off (irreversible) |
| **Billing** | Auto-invoice on encounter sign-off, invoice editing, cash + Stripe payment recording, revenue dashboard |
| **Communication** | SMS appointment confirmations/reminders (Twilio), invoice email with PDF (SendGrid), notification logging |
| **AI Copilot** | Patient summary generation, differential diagnosis suggestions, investigation recommendations (via GPT-4o/GPT-4o-mini) |
| **Frontend** | 25 screens across 4 shells (Auth, Admin, Clinical, Operations), responsive design, public queue display |

### 2.2 What Is Explicitly Excluded (Phase 2+)

| Excluded Feature | Phase |
|-----------------|-------|
| Patient portal (self-service appointments, results viewing) | Phase 2 |
| Triage chatbot | Phase 2 |
| Ambient audio transcription (voice-to-text AI) | Phase 2 |
| Telemedicine (video consultations) | Phase 2 |
| Full lab module (specimen tracking, result entry) | Phase 2 |
| Full radiology module (PACS/Orthanc integration) | Phase 2 |
| Pharmacy dispensing workflow | Phase 2 |
| Mobile applications (React Native / Flutter) | Phase 3 |
| HL7 FHIR interoperability API | Phase 3 |
| HR / attendance / payroll | Phase 3 |
| Workflow automation engine | Phase 3 |

---

## 3. Technical Architecture

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router, TypeScript, shadcn/ui) |
| Core Backend | NestJS (TypeScript, Prisma, Mongoose) |
| AI Sidecar | FastAPI (Python, LangChain, Pydantic) |
| Relational DB | PostgreSQL 16 (users, orgs, billing, audit) |
| Document DB | MongoDB 7.0 (patients, encounters, appointments) |
| Cache/Events | Redis 7.2 (pub/sub, queue state, rate limiting) |
| File Storage | Cloudflare R2 |
| Hosting | Vercel (frontend) + Railway (backend + DB) + MongoDB Atlas |

### Key Architectural Decisions
- Event-driven module communication via Redis (no direct cross-module imports)
- Multi-tenancy via `org_id` + `facility_id` scoping on every query
- FastAPI AI sidecar is stateless — never touches databases directly
- Shared JWT authentication between NestJS and FastAPI

Full C4 diagrams, data flow diagrams, ERD, and ADRs are available in the `pre-dev/` documentation package.

---

## 4. Timeline & Milestones

| Milestone | Target | Deliverables |
|-----------|--------|-------------|
| **M1 — Foundation** | Month 1 | Monorepo, auth, tenancy, Docker dev environment |
| **M2 — Backend MVP** | Month 3 | All 7 backend modules + AI copilot + API tests |
| **M3 — Full MVP** | Month 5 | All 25 frontend screens, end-to-end flow working |
| **M4 — First Clinic** | Month 7 | Production deployment, first real clinic using daily |
| **M5 — First Revenue** | Month 9 | At least 1 paying customer, MRR ≥ $50 |

**Developer capacity**: 15–20 hours/week (solo founder, part-time alongside studies).

---

## 5. Team & Roles

| Role | Person | Responsibility |
|------|--------|---------------|
| Founder / Lead Engineer | Oussama Zaki | Architecture, full-stack development, AI engineering, product vision |
| Clinical Advisor (TBD) | Seeking | Clinical workflow validation, user testing |
| Early Adopter Clinic (TBD) | Seeking | Real-world usage, feedback, case study |

---

## 6. Investment Breakdown

### Development Phase (Months 1–8)

| Item | Cost |
|------|------|
| Infrastructure (Railway + Atlas) | $160 ($20/mo × 8) |
| AI API testing (OpenAI) | $80 |
| Domain | $12 |
| SMS testing (Twilio) | $20 |
| **Total cash investment** | **~$272** |
| **Time investment** | **~500 hours** |

### Operational Phase (Month 8+)

| Item | Monthly Cost |
|------|-------------|
| Railway (3 services) | $15 |
| MongoDB Atlas M10 | $57 |
| Redis (Railway) | $5 |
| OpenAI API | $20–30 |
| Twilio SMS | $5–10 |
| **Total monthly** | **$102–117** |

### Revenue Targets

| Period | MRR Target |
|--------|-----------|
| Month 9 | $50 (covers hosting) |
| Month 12 | $500 |
| Month 24 | $3,500+ |

---

## 7. Pricing Model

| Tier | Price | Target |
|------|-------|--------|
| **Solo** | $39–49/month | Solo practitioners, 1 facility, 1–2 users |
| **Clinic** | $149–199/month (flat, not per-provider) | Polyclinics, 2–5 facilities, up to 15 users |
| **Enterprise** | Custom ($1,000+/month) | Hospital networks, dedicated instance, SLA |

---

## 8. Risk Summary

| Risk Category | Top Risk | Mitigation |
|--------------|----------|------------|
| **Technical** | AI hallucinations | Human-in-the-loop, mandatory review, conservative prompts |
| **Business** | Extended sales cycle | Free beta, target new clinics, in-person demos |
| **Operational** | Solo founder burnout | Sustainable pace, seek co-builder, hard stop rules |
| **Regulatory** | Data privacy compliance | GDPR-style design from day 1, HIPAA-ready architecture |

Full risk register with probability/impact scoring and mitigations is in `pre-dev/07-risk-register.md`.

---

## 9. Success Criteria

The project is considered successful if, by Month 12:

1. ✅ Working MVP used by at least 1 clinic daily
2. ✅ At least 1 paying customer (real subscription, not just beta)
3. ✅ MRR ≥ $500
4. ✅ Zero data leakage incidents between organizations
5. ✅ ≥60% of encounters use the AI copilot feature
6. ✅ AI copilot acceptance rate ≥70% (doctors keep AI suggestions)

---

## 10. What Happens Next

1. **Immediate**: Begin Step 1 — monorepo scaffolding
2. **Week 1**: Foundation complete (auth + tenancy)
3. **Month 1**: Core backend modules working
4. **Month 3**: AI copilot operational
5. **Month 5**: Full UI complete, internal testing begins
6. **Month 7**: First real clinic onboarded

# Phase 8 — Statement of Work

## MediCore HIS — Scope, Deliverables & Terms

---

## 1. Parties

| Role | Entity | Representative |
|------|--------|---------------|
| **Client / Product Owner** | EPIOSO Studio | Oussama Zaki |
| **Developer / Builder** | EPIOSO Studio | Oussama Zaki |

> This SOW documents the founder's commitment to himself and future stakeholders. It serves as a binding scope reference for any co-builders, contractors, or investors who join later.

---

## 2. Services to Be Delivered

### 2.1 Deliverable 1 — Pre-Development Package

| Item | Status |
|------|--------|
| Project charter | ✅ Complete |
| Market research & competitive analysis | ✅ Complete |
| User personas & business case | ✅ Complete |
| Product requirements (PRD, SRS, user stories) | ✅ Complete |
| System architecture (C4 diagrams, ADRs) | ✅ Complete |
| UX & information architecture | ✅ Complete |
| Data & API design (ERD, schema, OpenAPI) | ✅ Complete |
| Security & privacy compliance | ✅ Complete |
| Execution blueprint & milestones | ✅ Complete |
| Client presentation package | ✅ Complete |

### 2.2 Deliverable 2 — MVP Software

| Module | Scope | Acceptance Criteria |
|--------|-------|-------------------|
| Authentication | Login, refresh, logout, RBAC | User can log in, permissions are enforced |
| Tenancy | Org + facility management, onboarding | Atomic onboarding, zero cross-org data contamination |
| Patients | Register, search, allergies, problem list | Auto-MRN, fuzzy search, allergy register works |
| Scheduling | Doctor schedules, booking, queue, SSE | No double-booking, live queue updates |
| Encounters | Vitals, SOAP, diagnosis, prescriptions, sign-off | Full encounter flow with allergy check and event publishing |
| Billing | Auto-invoice, payments (cash + Stripe) | Invoice auto-creates on sign-off, payments recorded |
| Communication | SMS (Twilio) + email (SendGrid) | Appointment SMS, invoice email with PDF |
| AI Copilot | Summary, differentials, investigations | Three AI endpoints return clinically sensible output |
| Frontend | 25 screens, responsive, 4 shells | All screens per screen inventory with all listed states |

### 2.3 Deliverable 3 — Production Deployment

| Item | Criteria |
|------|---------|
| Frontend on Vercel | HTTPS, auto-deploy from main branch |
| Backend on Railway | 3 services, health checks, auto-restart |
| PostgreSQL on Railway | Daily backups, connection pooling |
| MongoDB on Atlas M10 | Encryption at rest, IP whitelist |
| Redis on Railway | Persistence enabled |
| Domain + DNS | medicore.app (or .ma) configured |
| Monitoring | Sentry for error tracking (all 3 services) |

---

## 3. Acceptance Criteria (System-Level)

The complete system is accepted when:

1. A new clinic can onboard via the wizard in <10 minutes, unassisted
2. A receptionist can register a patient and book an appointment in <2 minutes
3. A doctor can complete a full encounter (vitals → SOAP → AI copilot → diagnosis → Rx → sign-off) in <5 minutes
4. An invoice is auto-created within 5 seconds of encounter sign-off
5. Multi-tenancy is verified: 2+ organizations on same instance with zero data cross-contamination
6. AI copilot rate limiting works (21st request/hour returns 429)
7. Public queue display works without authentication on a separate device
8. System handles 50 concurrent users without performance degradation (P95 <500ms)
9. All passwords are bcrypt-hashed (verified by DB inspection)
10. All API endpoints return appropriate error codes (not generic 500)

---

## 4. Change Request Process

| Situation | Process |
|-----------|---------|
| Minor scope change (within a module) | Document in commit message. No formal review needed |
| New module or major feature addition | Update PRD + blueprint. Review impact on timeline. Decision logged in ADR |
| Architecture change | New ADR required. Update C4 diagrams. Review security implications |
| Feature removed from MVP | Document in PROGRESS.md with reason. Move to Phase 2 backlog |
| Timeline slip >2 weeks | Reassess scope. Consider cutting lowest-RICE features |

---

## 5. Payment Milestones

> Not applicable for bootstrapped solo project. This section is included for future reference if external funding or contractors are involved.

| Milestone | Payment Trigger | Amount |
|-----------|----------------|--------|
| M1 — Foundation complete | Steps 1–3 passing acceptance | 15% of total |
| M2 — Backend MVP complete | Steps 1–9 passing acceptance | 35% of total |
| M3 — Full MVP complete | All 13 steps passing acceptance | 35% of total |
| M4 — First clinic live | 2 weeks of daily usage confirmed | 15% of total |

---

## 6. Intellectual Property

| Asset | Ownership |
|-------|-----------|
| MediCore source code | EPIOSO Studio / Oussama Zaki |
| Pre-development documentation | EPIOSO Studio / Oussama Zaki |
| AI prompt templates | EPIOSO Studio / Oussama Zaki |
| Patient data (clinical records) | The respective clinic organization (data controller) |
| MediCore brand and trademarks | EPIOSO Studio / Oussama Zaki |

**Data processing relationship**: EPIOSO Studio (MediCore) is the **data processor**. Each clinic organization is the **data controller**. A Data Processing Agreement (DPA) will be provided to each clinic upon subscription.

---

## 7. Confidentiality

- All patient data is confidential and subject to GDPR-style data protection
- Source code is proprietary and not open-source
- AI prompt templates are trade secrets
- Pre-development documentation may be shared with potential investors under NDA
- Clinic data is never shared between organizations, used for marketing, or sold to third parties

---

## 8. Termination

| Scenario | Outcome |
|----------|---------|
| Project paused >3 months | Reassess viability. All code and docs remain with EPIOSO |
| Solo founder unable to continue | Seek acqui-hire or open-source the pre-dev docs as portfolio piece |
| First clinic cancels subscription | Conduct exit interview. Analyze why. Improve product. Find next customer |
| No paying customer by Month 14 | Pivot assessment: different market segment, B2B2B model, or archive project |

# Phase 6 — Privacy & Compliance

## MediCore HIS — GDPR-Aligned Privacy Framework

> **Compliance posture**: Morocco-first, GDPR-style data protection from day one. HIPAA-ready architecture designed in but not certified until US expansion. No formal certification required to launch in Morocco in Year 1.

---

## 1. Data Inventory — What We Collect and Why

### 1.1 Personal Data

| Data Category | Specific Fields | Legal Basis | Retention | Storage |
|--------------|----------------|------------|-----------|---------|
| **Account identity** | Email, password hash, first/last name, phone | Contract performance (service delivery) | Active account + 30 days post-deletion | PostgreSQL |
| **Patient demographics** | Name, DOB, gender, phone, national ID, address, emergency contact | Contract performance + Legitimate interest (clinical care) | Active patient + 10 years (medical record retention) | MongoDB |
| **Clinical data** | Vitals, SOAP notes, diagnoses (ICD-10), prescriptions, allergy register, problem list | Contract performance + Legal obligation (medical recordkeeping) | 10 years from last encounter (Moroccan health regulations) | MongoDB |
| **AI interaction data** | AI prompts sent, AI responses received, doctor accept/reject decisions | Legitimate interest (AI quality improvement) | 90 days (then anonymized for aggregate analytics) | Redis cache (1h) + MongoDB (90d) |
| **Billing data** | Invoice amounts, payment method, Stripe customer ID | Contract performance + Legal obligation (financial recordkeeping) | 10 years (Moroccan tax/accounting requirements) | PostgreSQL |
| **Communication logs** | SMS recipient phone, email recipient address, message content, delivery status | Contract performance | 1 year | MongoDB |
| **Audit trail** | User ID, action, timestamp, IP address, entity affected | Legal obligation (data protection accountability) | 5 years | PostgreSQL |
| **Usage analytics** | Page views, feature usage counts (aggregated, no PII) | Legitimate interest (product improvement) | Indefinite (anonymized) | External analytics (Phase 2) |

### 1.2 Special Category Data (Sensitive)

| Data | Classification | Extra Protections |
|------|---------------|-------------------|
| Clinical diagnoses (ICD-10 codes) | Health data (GDPR Art. 9) | Encrypted at rest, access restricted to DOCTOR + NURSE roles, audit logged |
| Prescription records | Health data | Same as above + allergy cross-reference |
| Allergy register | Health data | Same as above |
| SOAP notes (subjective complaints) | Health data | Same as above + AI de-identification before external API calls |
| Blood type, emergency contact | Health data | Access restricted, not exposed in list views |

---

## 2. GDPR Rights Implementation

### 2.1 Right to Access (Art. 15)

| Requirement | Implementation |
|-------------|---------------|
| Data subject can request all data held about them | `GET /patients/:id/data-export` returns JSON with all patient data, encounters, appointments, invoices, communication logs |
| Response within 30 days | Admin dashboard shows pending data requests with countdown timer |
| Free of charge for first request | System tracks request count per patient per year |

**MVP approach**: Admin manually triggers export via dashboard. Automated self-service in Phase 2 (patient portal).

### 2.2 Right to Rectification (Art. 16)

| Requirement | Implementation |
|-------------|---------------|
| Data subject can correct inaccurate data | Patient demographics editable by DOCTOR/NURSE/RECEPTIONIST roles |
| Clinical data correction | Signed-off encounters cannot be edited — corrections made via addendum encounter |

### 2.3 Right to Erasure / Right to be Forgotten (Art. 17)

| Requirement | Implementation |
|-------------|---------------|
| Data subject can request deletion | `DELETE /patients/:id/gdpr-erase` — admin-only endpoint |
| Medical records subject to legal retention | System retains anonymized clinical records for 10 years. Personal identifiers (name, phone, national ID) are permanently deleted. MRN retained but de-linked from identity |
| Cascading deletion | Patient deletion triggers: anonymize all encounters, void all open invoices, delete all notification logs, update audit log with "patient.erased" event |

**Anonymization strategy**:
- `name` → `{ first: "DELETED", last: "DELETED", display: "DELETED PATIENT" }`
- `phone` → null
- `email` → null
- `national_id` → null
- `address` → null
- `emergency_contact` → null
- `allergies` → preserved (clinical safety — substance names only, no PII)
- Encounters → `patient_id` retained but patient document no longer resolvable

### 2.4 Right to Data Portability (Art. 20)

| Requirement | Implementation |
|-------------|---------------|
| Export in machine-readable format | JSON export of patient record, encounters, prescriptions |
| Structured, commonly used format | Phase 3: FHIR R4 export for interoperability with other EHRs |

### 2.5 Right to Object (Art. 21)

| Requirement | Implementation |
|-------------|---------------|
| Object to processing for marketing | MediCore doesn't do marketing to patients in MVP |
| Object to AI processing | Patient (via doctor) can mark `ai_consent: false` on patient record → AI copilot shows "AI disabled for this patient" |

---

## 3. Consent Management

### 3.1 MVP Consent Model

| Consent | Type | Collection Point | Storage |
|---------|------|-----------------|---------|
| Terms of Service | Explicit (checkbox) | Onboarding wizard Step 3 | `users.tos_accepted_at` in PG |
| Data Processing Agreement | Explicit (checkbox) | Onboarding wizard Step 3 | `users.dpa_accepted_at` in PG |
| AI Data Usage | Opt-out | Patient profile setting | `patients.ai_consent` in MongoDB (default: true) |
| SMS Notifications | Implied (providing phone number) | Patient registration | Opt-out via reply "STOP" |

### 3.2 Phase 2 Consent Model (Patient Portal)

| Consent | Type | Collection Point |
|---------|------|-----------------|
| Portal account creation | Explicit | Patient self-registration |
| Appointment reminders | Explicit toggle | Patient portal settings |
| Invoice email notifications | Explicit toggle | Patient portal settings |
| Data sharing with other facilities in same org | Explicit | Patient portal settings |

---

## 4. Data Retention Policy

| Data Type | Active Retention | Archive Retention | Deletion |
|-----------|-----------------|-------------------|----------|
| User accounts | While active | 30 days post-deactivation | Hard delete after 30d |
| Patient records (demographics) | While active | 10 years from last encounter | Anonymize, then retain 10y |
| Clinical encounters | While active | 10 years from encounter date | Anonymize after 10y |
| Prescriptions | While active | 10 years | Anonymize after 10y |
| Invoices | While active | 10 years (tax law) | Archive after 10y |
| Audit logs | While active | 5 years | Hard delete after 5y |
| AI interaction logs | 90 days | — | Anonymize after 90d, delete after 1y |
| Communication logs | 1 year | — | Hard delete after 1y |
| Redis cache | TTL-based (1h–24h) | — | Auto-expires |
| Refresh tokens | 7 days | — | Hard delete on expiry/revocation |

**Retention enforcement**: Monthly cron job checks retention dates and triggers anonymization/deletion. Logged in audit trail.

---

## 5. Data Protection Impact Assessment (DPIA) — Summary

### 5.1 Processing Activities Requiring DPIA

| Activity | Risk Level | Justification |
|----------|-----------|---------------|
| Processing health data at scale | High | Special category data (Art. 9) + systematic monitoring |
| AI processing of patient clinical notes | High | Automated decision-making with health data + external API transmission |
| Multi-tenant data storage | Medium | Risk of cross-tenant data leakage |
| Cross-border data transfer (OpenAI) | Medium | Patient context sent to US-based API |

### 5.2 Mitigations for AI Data Processing

| Risk | Mitigation |
|------|-----------|
| Patient data sent to OpenAI | De-identify prompts: no MRN, no national ID, no full name. Use initials or "Patient" |
| OpenAI retains training data | Use OpenAI API with data opt-out (API usage is not used for training by default since March 2023) |
| AI generates clinically harmful output | Human-in-the-loop mandatory. All AI outputs labeled "suggestion — verify before saving". Doctor sign-off required |
| AI bias in differential suggestions | Log AI outputs + doctor decisions. Monthly review of acceptance rates by condition category |

### 5.3 Mitigations for Multi-Tenancy

| Risk | Mitigation |
|------|-----------|
| Cross-org data leak via query bug | `org_id` injected by Prisma middleware (PG) and repository base class (Mongo) — never from user input |
| Cross-facility data leak | `facility_id` filter on all facility-scoped queries |
| Testing gap | Mandatory E2E test: create 2 orgs with data, verify zero cross-contamination. Run before every release |

---

## 6. Compliance Roadmap

| Phase | Compliance Target | Actions |
|-------|------------------|---------|
| **MVP (Now)** | GDPR-style data protection | Encryption, RBAC, audit logs, data minimization, retention policy, consent management, anonymization endpoint |
| **Phase 2** | Enhanced privacy | Patient portal consent management, cookie banner (if web analytics added), data portability (JSON export) |
| **Phase 3** | HIPAA readiness | BAA with hosting providers (MongoDB Atlas, Railway), formal risk assessment, HIPAA-grade audit logging, data classification labels |
| **US Expansion** | HIPAA certification | Engage compliance consultant ($5K–10K), SOC 2 Type I audit, BAAs with all subprocessors, incident response plan, employee training documentation |

---

## 7. Incident Response Plan (MVP Level)

| Step | Action | Owner | Timeline |
|------|--------|-------|----------|
| 1 | **Detect** — Sentry alert, user report, or monitoring anomaly | Automated + Oussama | Immediate |
| 2 | **Contain** — Revoke compromised tokens, disable affected accounts, isolate affected service | Oussama | Within 1 hour |
| 3 | **Assess** — Determine scope: which orgs, which data, how many patients affected | Oussama | Within 4 hours |
| 4 | **Notify** — If personal data breach: notify affected org admins within 24 hours | Oussama | Within 24 hours |
| 5 | **Report** — If required by regulation: notify data protection authority within 72 hours (GDPR) | Oussama | Within 72 hours |
| 6 | **Remediate** — Fix root cause, rotate secrets, deploy patch | Oussama | Within 48 hours |
| 7 | **Review** — Post-mortem document, update threat model, improve monitoring | Oussama | Within 1 week |

**For MVP**: This is a lightweight, solo-founder plan. For HIPAA phase: formal incident response team, tabletop exercises, and documented procedures required.

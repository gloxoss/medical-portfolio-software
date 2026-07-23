# PLAN-portal-shell

# Step 15 T2: Portal Shell & Consent Gate Flow

## Goal
Establish the main shell layout for the Patient Portal (mobile tab bar + desktop sidebar) and enforce a strict, backend-synchronized GDPR/HIPAA transparency consent banner that blocks portal interaction until the user acknowledges it.

## Architecture Context
- **Frontend Stack**: Next.js 14 App Router, Tailwind CSS, Zustand (consent state overlay).
- **Backend Stack**: NestJS, PostgreSQL, TypeORM.
- **Decision (P3)**: Backend Synced Consent. The transparency agreement is logged to PostgreSQL with timestamp, IP, and User Agent to provide a medical-grade audit trail.

## Dependency Graph
```text
T1 (Consent Entity) → T2 (Consent Endpoints) → T3 (API Client/Hooks)
                                                       ↓
                         T4 (Consent Gate UI) ← T5 (Portal Shell Layout)
```

## Tasks

- [ ] **T1: Patient Consent Entity & Migration**
  **File:** `apps/api/src/modules/patients/entities/patient-consent.entity.ts`, `apps/api/database/migrations/XXXX-create-patient-consents.ts`
  **What:**
  - Create TypeORM Entity: `id` (uuid), `patient_id` (uuid), `org_id` (uuid), `consent_type` (string: `'privacy_terms' | 'ai_ambient_audio'`), `granted` (boolean), `granted_at` (timestamptz), `revoked_at` (timestamptz nullable), `ip_address` (string), `user_agent` (string).
  - Add compound index on `[patient_id, consent_type]`.
  **Done When:** Migration runs completely. `npx tsc` passes.

- [ ] **T2: Consent Backend Endpoints**
  **File:** `apps/api/src/modules/patients/patient-consent.controller.ts`, `patient-consent.service.ts`
  **What:**
  - `GET /portal/consents/status` → Checks if the logged-in patient has a valid, granted `privacy_terms` record.
  - `POST /portal/consents/accept` → Creates an insert for `consent_type: 'privacy_terms'`, grabbing IP from `req.ip` and UA from headers. 
  - Both routes protected by `JwtAuthGuard` enforcing `aud: 'patient-portal'`.
  **Done When:** Service tests pass for logic branches. Supertest covers 200 responses.

- [ ] **T3: Consent API Client & Hooks**
  **File:** `apps/web/src/lib/api/consent.api.ts`, `apps/web/src/lib/hooks/useConsent.ts`
  **What:**
  - `apiClient.get('/portal/consents/status')`
  - `apiClient.post('/portal/consents/accept')`
  - `useConsentStatus()` hook (`useQuery`).
  - `useAcceptTerms()` hook (`useMutation` that invalidates `consent-status` key).
  **Done When:** React Query hooks correctly surface the boolean status of the privacy terms.

- [ ] **T4: Consent Gate UI Component**
  **File:** `apps/web/src/components/portal/ConsentGate.tsx`
  **What:**
  - Full-screen, unskippable modal overlay.
  - Fetches state via `useConsentStatus()`.
  - If `isLoading`, show spinner or skeleton bounds.
  - If data returns `granted: false`, display the Privacy Policy summary. Require clicking a definitive "I Understand and Accept" button.
  - Clicking calls `useAcceptTerms()`, upon success the modal completely unmounts.
  **Done When:** Modal blocks all interaction until specific action is taken.

- [ ] **T5: Portal Shell Layout (Desktop/Mobile Parity)**
  **File:** `apps/web/src/app/(portal)/layout.tsx`, `apps/web/src/components/portal/PortalNavigation.tsx`
  **What:**
  - Create the authenticated portal wrapper.
  - **Mobile:** Bottom sticky tab bar with icons (Home, Encounters, Labs, Invoices, Profile).
  - **Desktop:** Left-hand sidebar matching previous clinical `Navbar`, but specifically styled for patients.
  - Mounts `<ConsentGate>` at the root level, ensuring it covers the `children` completely if unresolved.
  **Done When:** Layout is fully responsive. ConsentGate perfectly interrupts any child page if the backend states the terms were not accepted.

## Done When (Global)
- [ ] Patient Logging into the portal for the first time is halted by the Consent Gate.
- [ ] Inspecting the database confirms `ip_address` and `user_agent` are recorded against the consent.
- [ ] Refreshing the page recognizes the consent instantly through `useConsentStatus`.
- [ ] The routing shell works cleanly across `320px` (mobile bottom nav) and `1440px` (desktop sidebar).

# PLAN: CMI Payment Integration

## Phase -1: Context Check
We are adding CMI (Centre Monétique Interbancaire) integration to replacing/augmenting the current `Stripe` logic in MediCore HIS. The goal is to allow patients to pay their invoices via the Patient Portal or allow admins to process CMI links globally.

## Phase 0: Socratic Gate (Pending Decisions)
Before we jump into execution (`/create`), we need to clarify a few architectural decisions:
1. **Gateway Mode:** Are we using the standard CMI Hosted Payment Page (redirect) or the Iframe/Lightbox approach? Standard redirect is usually required for CMI 3D Secure compliance.
2. **Environment:** Do we have CMI sandbox credentials (storeKey, clientId) ready for development, or should we build a mock CMI provider service for local development?
3. **Webhooks/Callbacks:** When CMI calls back with success/failure, do we send an automated SMS/email receipt via the `CommunicationService`?

## Phase 1: Task Breakdown

### 1. Database & Security (`database-architect`, `security-auditor`)
- **Action:** Add tracking fields to the invoice/payment models (e.g., `cmiTransactionId`, `cmiAuthCode`, `paymentMethod: 'CMI'`).
- **Action:** Secure the CMI webhook callback route with hash signature validation (`storeKey` hashing).

### 2. Backend API (`backend-specialist`)
- **Action:** Build `CmiService` inside the `billing` module.
- **Action:** Implement `initiateCmiPayment(invoiceId)`: Generates the payload, calculates the hash, and returns the form data needed for the frontend.
- **Action:** Implement `handleCmiCallback(postData)`: Receives CMI webhook POST, verifies signature, updates invoice to `PAID`, and dispatches `payment.succeeded` event.

### 3. Frontend UI (`frontend-specialist`)
- **Action:** Update the invoice view (`(ops)/billing/[invoiceId]/page.tsx` and Patient Portal) to show a "Pay with CMI / Carte Bancaire" button instead of Stripe.
- **Action:** Build a redirect component that auto-submits a `<form>` to the CMI gateway URLs.
- **Action:** Create Success (`/payment/success`) and Error (`/payment/error`) landing pages to return to post-transaction.

### 4. Verification (`test-engineer`)
- **Action:** Seed a test invoice.
- **Action:** Simulate a CMI callback with an invalid hash to test rejection.
- **Action:** Simulate a valid CMI callback to test invoice status transitioning from `PENDING` to `PAID`.

## Agent Assignments
- `project-planner`: Created this plan file.
- `backend-specialist`: Will build the CMI signature logic and callback endpoints.
- `frontend-specialist`: Will update the UI billing buttons and redirect forms.
- `security-auditor`: Will focus strictly on webhook payload hash verification to prevent payment spoofing.

---
*Created by the project-planner agent per the `/plan` workflow.*

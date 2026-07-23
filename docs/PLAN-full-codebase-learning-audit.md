# MediCore HIS Full Learning, Audit, and Enhancement Plan

## 1) Purpose

This document is the master execution plan for a complete manual audit of the MediCore HIS codebase, with two outcomes:

1. Build deep understanding of architecture, logic, auth, tenancy, data flow, and security.
2. Convert understanding into targeted improvements (codebase quality + workflow quality + reusable learning artifacts).

This plan is designed to be followed step by step across sessions.

---

## 2) Mandatory Skill Stack Before Any Step

Before running any checkpoint in this plan, load and follow these skills in this exact order:

1. /session-report
2. karpathy-guidelines
3. medicore-his-dev

If one is unavailable, stop and resolve that first.

---

## 3) Scope

### In Scope

- Full structure audit of:
  - medicore-his/apps/api
  - medicore-his/apps/web
  - medicore-his/apps/ai
- Auth and tenancy flow tracing end to end.
- Branch/facility/org context propagation checks.
- Security pass (input validation, authN/authZ, tenant boundaries, leakage checks, rate limiting expectations).
- Improvement plan with prioritized implementation options.
- Learning artifacts for each completed checkpoint.

### Out of Scope (for this phase)

- Large speculative rewrites.
- New features not connected to audit findings.
- Infra-only modernization unless it blocks audit confidence.

---

## 4) Operating Principles

### 4.1 Brainstorm -> Plan -> Enhance

Each checkpoint follows this exact loop:

1. Brainstorm
- Define unknowns and risks.
- Capture assumptions explicitly.

2. Plan
- Define exact files to review.
- Define what "done" means for this checkpoint.

3. Enhance
- Produce issue cards.
- Offer exactly 3 options:
  - Option A: Minimal safe patch
  - Option B: Moderate cleanup
  - Option C: Structural improvement

### 4.2 Karpathy-Aligned Rules

- Think before coding.
- Simplicity first.
- Surgical changes only.
- Goal-driven verification.

### 4.3 MediCore Rules

- No mock data in production paths.
- No hardcoded secrets/URLs/config.
- All sensitive queries must be tenant scoped.
- Business rules stay out of UI components.

---

## 5) Deliverables

By the end of the full journey, we must have:

1. Architecture map (api + web + ai).
2. Auth and tenancy deep-dive report.
3. End-to-end flow map for critical journeys.
4. Security audit report with issue cards and severity.
5. Prioritized enhancement backlog with execution order.
6. Learning artifacts per major checkpoint:
- React lesson page
- Markdown learning doc

---

## 6) Session Cadence and Timeboxing

Recommended cadence:

- 1 checkpoint per focused session (60-120 minutes).
- Every 3 checkpoints, run a consolidation session.
- Every 5 checkpoints, implement one high-confidence enhancement.

Per session timebox:

1. 10 min: stack initialization + scope lock
2. 35-75 min: review and explanation
3. 15-25 min: issue cards + enhancement options
4. 10-20 min: learning artifact generation
5. 5-10 min: session report and next checkpoint

---

## 7) Master Roadmap (Simple to Complex)

## Phase A - Orientation and Baseline Map

### A1. Workspace and Build Topology

Target:

- Root planning and architecture docs
- medicore-his/package.json
- medicore-his/pnpm-workspace.yaml
- medicore-his/turbo.json

Outputs:

- Runtime/services map
- Build pipeline map
- Dependency boundary notes

Done When:

- You can explain how api/web/ai are built and related.

### A2. Entrypoint Audit (All Apps)

Target:

- apps/api/src/main.ts
- apps/api/src/app.module.ts
- apps/web/src/app/layout.tsx
- apps/web/src/app/page.tsx
- apps/ai/main.py

Outputs:

- Startup lifecycle map per app
- Provider and middleware registration map

Done When:

- You can explain request lifecycle from app start to first route.

## Phase B - Shared Infrastructure and Cross-Cutting Concerns

### B1. API Core Layer

Target:

- apps/api/src/core/decorators
- apps/api/src/core/guards
- apps/api/src/core/filters
- apps/api/src/core/pipes

Outputs:

- Guard chain model
- Validation and exception pipeline model

Done When:

- You can explain exactly where auth and tenancy checks execute.

### B2. API Infrastructure Layer

Target:

- apps/api/src/infrastructure/database
- apps/api/src/infrastructure/events
- apps/api/src/infrastructure/providers

Outputs:

- DB adapter boundaries
- Event publish/subscribe boundaries
- Vendor abstraction compliance map

Done When:

- You can point to where external SDK coupling exists (if any).

### B3. Web Shared Layer

Target:

- apps/web/src/lib/providers.tsx
- apps/web/src/lib/auth
- apps/web/src/lib/store
- apps/web/src/lib/api
- apps/web/src/lib/hooks
- apps/web/src/middleware.ts

Outputs:

- Frontend state ownership map
- API client and cache strategy map

Done When:

- You can explain auth state transition and API call path from UI.

## Phase C - Auth and Tenancy Deep Dive

### C1. API Auth Module

Target:

- apps/api/src/modules/auth
- apps/api/src/modules/tenancy

Outputs:

- Token issuance and refresh model
- Role/permission enforcement map
- Tenant context extraction model

Done When:

- You can explain how org_id and facility_id become query constraints.

### C2. Web Auth Integration

Target:

- apps/web/src/app/(auth)
- apps/web/src/lib/auth
- apps/web/src/middleware.ts

Outputs:

- Route protection map
- Session boundary model
- Failure path behavior map

Done When:

- You can explain auth behavior for logged-out, expired, and unauthorized states.

### C3. Branch/Facility Context Propagation

Target:

- All places where facility/org context is read, stored, or forwarded

Outputs:

- Context propagation matrix (source -> carrier -> sink)

Done When:

- No ambiguous context handoff remains undocumented.

## Phase D - Domain Module Audits (API then Web)

Run modules in this order (lower complexity to higher orchestration):

1. icd10
2. patients
3. scheduling
4. lab
5. pharmacy
6. portal
7. telemedicine
8. notifications
9. billing
10. encounters
11. audit
12. admin

For each module, execute D-Template below.

### D-Template (Per Module)

1. Files to review
- module folder in apps/api/src/modules/{module}
- matching web API client in apps/web/src/lib/api
- matching web hooks in apps/web/src/lib/hooks
- matching route groups and components in apps/web/src/app and apps/web/src/components

2. Explain order
- Why it exists
- Inputs and outputs
- Internal branching logic
- Dependencies in/out
- Data flow role
- Auth and tenancy implications
- Common failure points
- Fast confidence tests

3. Issue cards
- At least 1 card for correctness risk
- At least 1 card for security or boundary risk
- At least 1 card for maintainability risk

4. Enhancement options
- Option A / B / C with effort, risk, impact, recommendation

5. Learning artifact
- Generate React lesson page + markdown doc after checkpoint is understood

Done When:

- Module has full logic map, issue cards, options, and learning artifact.

## Phase E - AI Sidecar Audit

### E1. Router Layer

Target:

- apps/ai/routers

Outputs:

- AI endpoint inventory
- Input/output contract map
- Stub boundary identification

### E2. Service Layer

Target:

- apps/ai/services

Outputs:

- Context assembly map
- Cache and invalidation strategy notes
- LLM dependency boundary map

### E3. AI Security and Safety

Target:

- apps/ai/middleware
- prompt handling and request guards

Outputs:

- Prompt/data leakage risk map
- Injection and over-permission review

Done When:

- AI path is mapped with trust boundaries and failure modes.

## Phase F - End-to-End Flow Tracing

Trace each flow from UI action to persistence and back:

1. Login + refresh + protected navigation
2. Patient registration and retrieval
3. Encounter creation and updates
4. Lab order to result visibility
5. Billing invoice to payment status
6. Portal auth/otp and patient access

For each flow, capture:

- Entry point
- Validation points
- Auth/tenant checks
- Service/repository path
- Side effects/events
- UI synchronization and cache invalidation

Done When:

- Each flow has a full path map and at least one adversarial edge-case note.

## Phase G - Security Audit Pass

Run one consolidated security pass over all previous findings.

Checklist:

1. Input validation
2. Authentication
3. Authorization
4. Tenant scoping
5. Error leakage
6. Secret/config hygiene
7. Rate limiting expectations
8. Event and async side effects safety
9. Frontend exposure risks
10. AI prompt/data safety

Severity rubric:

- P0: Data breach or tenant boundary break
- P1: Authz bypass or high-risk leakage
- P2: Reliability/security hardening gap
- P3: Quality and maintainability debt

Done When:

- Every issue has severity, confidence, and fix path.

## Phase H - Enhancement Backlog and Execution

### H1. Backlog Construction

Group findings by category:

- Correctness
- Security
- Architecture
- Developer experience
- Testing gaps

### H2. Prioritization Model

Score each candidate on:

- User risk reduction (1-5)
- Security impact (1-5)
- Effort (1-5, lower is better)
- Architectural leverage (1-5)

Priority score formula:

Priority = (Risk + Security + Leverage) - Effort

### H3. Implementation Waves

- Wave 1: High-impact low-risk fixes (A options)
- Wave 2: Moderate cleanups (B options)
- Wave 3: Structural improvements (C options)

Done When:

- Top 10 backlog is ranked and execution-ready.

## Phase I - Learning System and Documentation

For each completed checkpoint:

1. Generate lesson page
2. Generate markdown learning notes
3. Add review questions
4. Add "what changed" and "why this design" summary

Naming convention:

- Topic slug from audited scope, for example: auth-tenant-guards

Outputs:

- medicore-his/apps/web/src/app/(ops)/learn/{topic}/page.tsx
- medicore-his/docs/reports/learning-courses/{topic}.md

Done When:

- You can revisit any checkpoint and relearn quickly without re-auditing from scratch.

---

## 8) Checkpoint Card Template (Use for Every Session)

## Checkpoint ID

- Example: C2-web-auth-integration

## Objective

- One sentence only.

## Scope

- Files/folders included.
- Explicitly list exclusions.

## Unknowns

- Unknown #1
- Unknown #2

## Plan

1. Read files in order
2. Explain logic and boundaries
3. Trace data and auth/tenant flow
4. Build issue cards
5. Propose A/B/C enhancements
6. Generate learning artifact

## Done Criteria

- Logic explained in plain language and code-level detail
- Data flow traced end to end
- Auth and tenant boundaries verified
- Problem locations documented
- Enhancement options delivered
- Learning artifact generated if requested

---

## 9) Issue Card Template

- Title:
- Location:
- Symptom:
- Trigger:
- Likely root cause:
- Confidence: low | medium | high
- Severity: P0 | P1 | P2 | P3
- Minimal fix path:
- Verification command or test:

---

## 10) Session Report Template (End of Every Checkpoint)

Use this exact section order:

1. summary
2. context
3. details
4. next steps

Details must include:

- file and folder logic summary
- data flow trace
- auth and tenant/branch boundary verification
- problem locations with confidence
- enhancement options A/B/C with recommendation

---

## 11) Validation Commands (Run as Applicable)

API:

- pnpm --filter api test
- pnpm --filter api typecheck

Web:

- pnpm --filter web test
- pnpm --filter web typecheck

AI:

- run targeted tests in apps/ai/tests

Note:

- If command names differ by workspace script configuration, use equivalent local scripts and record what was used.

---

## 12) First 10 Sessions (Recommended Start Sequence)

Session 1

- A1 Workspace and build topology

Session 2

- A2 Entrypoints

Session 3

- B1 API core layer

Session 4

- B2 API infrastructure

Session 5

- B3 Web shared layer

Session 6

- C1 API auth module

Session 7

- C2 Web auth integration

Session 8

- C3 Branch/facility context propagation

Session 9

- D module audit: icd10

Session 10

- D module audit: patients

After Session 10:

- Consolidation review + first enhancement wave candidate selection

---

## 13) Definition of Success

This plan is successful when:

1. You can explain the codebase from entrypoints to complex module interactions.
2. You can trace auth and tenancy boundaries with confidence.
3. You have a prioritized, justified enhancement roadmap.
4. You have reusable learning pages/docs for long-term retention.
5. You can onboard a new developer using only these audit artifacts.

---

## 14) Immediate Next Action

Start with Checkpoint A1 in the next session and produce the first checkpoint card and session report before moving to A2.

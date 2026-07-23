# Phase 7 — Definition of Done

## MediCore HIS — What "Done" Means at Every Level

---

## 1. Feature-Level Done

A feature is "done" when ALL of the following are true:

### Code Quality
- [ ] TypeScript strict mode — zero `any` types in production code
- [ ] All DTOs validated with `class-validator` decorators
- [ ] Error handling returns appropriate HTTP status codes (not generic 500)
- [ ] No commented-out code committed
- [ ] No `console.log` in production builds (use `Logger` service)
- [ ] Prisma/Mongoose queries scoped by `org_id` (verified by code review)

### Functionality
- [ ] Happy path works end-to-end (API → Frontend)
- [ ] Edge cases handled (empty state, max length, concurrent access)
- [ ] Error states render gracefully in UI (not blank page, not raw JSON)
- [ ] Loading states implemented (skeleton or spinner)
- [ ] Works on Chrome and Firefox latest
- [ ] Responsive at 1024px (iPad) and 1440px (desktop) minimum

### Testing
- [ ] API endpoint manually tested via Postman/Insomnia with documented request/response
- [ ] At least 1 E2E scenario tested for the critical path
- [ ] Multi-tenancy test: feature works correctly with 2 separate orgs, zero cross-contamination
- [ ] RBAC test: unauthorized role receives 403

### Security
- [ ] No sensitive data in URL parameters
- [ ] No sensitive data logged (passwords, tokens, PHI in error messages)
- [ ] Input validated server-side (not just client-side)
- [ ] Rate limiting applied to any unauthenticated or expensive endpoint

### Documentation
- [ ] API endpoint documented (at minimum: route, method, auth, request body, response body)
- [ ] Complex business logic has inline comments explaining "why" (not "what")

---

## 2. Step-Level Done (Blueprint Step)

A build step is "done" when:

- [ ] All acceptance criteria from the blueprint are met
- [ ] Feature-level "done" checklist passed for every feature in the step
- [ ] No regression in previously completed steps
- [ ] Code committed to git with descriptive commit message
- [ ] `pnpm dev` starts all services without errors
- [ ] Docker Compose services healthy

---

## 3. Milestone-Level Done

A milestone is "done" when:

### M1 — Foundation Complete
- [ ] Steps 1–3 all at step-level done
- [ ] `pnpm install && pnpm dev` works from clean clone
- [ ] Docker Compose PG + Mongo + Redis all pass health checks
- [ ] Login → JWT → protected endpoint → correct data for user's org

### M2 — Backend MVP Complete
- [ ] Steps 1–9 all at step-level done
- [ ] Full patient visit flow works via API: register → book → check-in → encounter → AI → sign-off → invoice → payment → SMS
- [ ] Postman collection with all endpoints documented and passing
- [ ] AI copilot returns sensible clinical output for at least 3 different cases

### M3 — Full MVP Complete
- [ ] Steps 1–13 all at step-level done
- [ ] All 25 screens from screen inventory implemented with all listed states
- [ ] Onboarding wizard works end-to-end (new user → first encounter in <30 minutes)
- [ ] 10-patient simulation completed by Oussama (full day of clinic operations)
- [ ] No UI elements that say "Coming soon", "TODO", or show placeholder data
- [ ] Logo and brand identity applied (even if simple)

### M4 — First Clinic Live
- [ ] Production environment deployed (Railway + Vercel + Atlas production)
- [ ] SSL/HTTPS verified on all endpoints
- [ ] At least 1 real clinic using daily for ≥2 weeks
- [ ] Zero critical bugs reported by clinic staff
- [ ] Revenue data matches clinic's manual records (±5%)
- [ ] AI copilot used in ≥60% of encounters (analytics verified)
- [ ] Backup restoration tested (restore from last night's backup, verify data integrity)

### M5 — First Revenue
- [ ] Stripe subscription active for ≥1 customer
- [ ] MRR ≥ $50 (covers hosting costs)
- [ ] Payment successful (bank account received funds)
- [ ] Price page exists on marketing site
- [ ] Terms of Service and Privacy Policy published

---

## 4. Project-Level Done (Pre-Dev Package)

The pre-development phase is "done" when:

- [x] Phase 0: Project charter reviewed and signed
- [x] Phase 1: Market, competitive, persona, and business case documents complete
- [x] Phase 2: PRD, SRS, and user stories with acceptance criteria complete
- [x] Phase 3: Architecture, tech stack, C4 diagrams, and ADRs complete
- [x] Phase 4: Information architecture, user journeys, and screen inventory complete
- [x] Phase 5: ERD, database schema, data flow, and OpenAPI spec complete
- [x] Phase 6: Threat model, security requirements, and privacy compliance complete
- [x] Phase 7: Blueprint, milestones, risk register, and this definition of done complete
- [x] Phase 8: Executive summary, project proposal, statement of work, and sign-off checklist complete
- [x] All decisions are locked and documented
- [x] No open questions that block Step 1 execution
- [x] A developer could read this folder cold and start building without asking the founder a single clarifying question

---

## 5. Quality Gates (Before Each Milestone)

| Gate | Check | Tool |
|------|-------|------|
| Type safety | `pnpm typecheck` — zero errors | `tsc --noEmit` |
| Lint | `pnpm lint` — zero errors | ESLint + Prettier |
| Build | `pnpm build` — all apps build successfully | Turborepo |
| Security | No credentials in source code | `git-secrets` or manual review |
| Dependencies | No critical vulnerabilities | `pnpm audit` |
| Schema | Database migrations applied cleanly | `npx prisma migrate deploy` |
| Multi-tenancy | Cross-org test passes | Manual E2E test script |

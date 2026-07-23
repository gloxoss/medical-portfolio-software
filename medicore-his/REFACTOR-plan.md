# MediCore HIS — Codebase Restructure Plan

**Decisions:** A, A, A — Full restructure now + merge notifications + reorganize everything
**Goal:** Move from ad-hoc flat layout to a consistent `core/` + `infrastructure/providers/` + `modules/` structure where every vendor SDK is behind an interface.
**Estimated sessions:** 2 focused sessions

---

## The Problem in One Diagram

```
BEFORE (messy)                        AFTER (clean)
──────────────────────────────────    ──────────────────────────────────
src/
  auth/              ← top-level      src/
  billing/           ← top-level        core/           ← guards, decorators
  communication/     ← top-level        infrastructure/
  encounters/        ← top-level          database/     ← prisma, mongo
  modules/                               providers/    ← ALL vendors here
    admin/           ← nested              payment/    → IPaymentProvider
    notifications/   ← nested              sms/        → ISmsProvider
  portal/                                  email/      → IEmailProvider
    otp/adapters/    ← partially right     video/      → IVideoProvider
  telemedicine/                            otp/        → IOtpProvider
                                           storage/    → IStorageProvider
  billing.service.ts                   modules/        ← ALL domains here
    → require('stripe') ← WRONG          auth/
  communication.service.ts               billing/     → injects IPaymentProvider
    → twilio SDK inline ← WRONG          telemedicine/ → injects IVideoProvider
  telemedicine.service.ts               notifications/ ← merged comm+notifs
    → Daily.co SDK inline ← WRONG        portal/      → injects IOtpProvider
```

---

## Phase 1: Backend Restructure (Session 42)

### Task Group A — Create new folder skeleton

```
T-A1: Create src/core/ with guards/, decorators/, filters/, pipes/
T-A2: Create src/infrastructure/database/ (prisma/, mongo/)
T-A3: Create src/infrastructure/providers/payment/
T-A4: Create src/infrastructure/providers/sms/
T-A5: Create src/infrastructure/providers/email/
T-A6: Create src/infrastructure/providers/video/
T-A7: Create src/infrastructure/providers/otp/
T-A8: Create src/infrastructure/providers/storage/
T-A9: Create src/modules/ (all domain module folders move here)
```

### Task Group B — Move core shared code

```
T-B1: Move auth/guards/ → core/guards/
      (JwtAuthGuard, JwtRefreshGuard, PermissionsGuard)
T-B2: Move auth/decorators/ → core/decorators/
      (@CurrentUser, @Permissions)
T-B3: Move common/filters/ → core/filters/
T-B4: Move prisma/ → infrastructure/database/prisma/
T-B5: Move common/events/ → infrastructure/events/
      (RedisPublisherService, EventsModule)
```

### Task Group C — Create provider interfaces + implementations

```
T-C1: Create infrastructure/providers/payment/payment.interface.ts
      → IPaymentProvider { createCheckoutSession, constructWebhookEvent }
T-C2: Create infrastructure/providers/payment/stripe.provider.ts
      → Extract Stripe SDK from billing.service.ts into here
T-C3: Create infrastructure/providers/payment/payment.module.ts

T-C4: Create infrastructure/providers/sms/sms.interface.ts
      → ISmsProvider { send(to, message): Promise<void> }
T-C5: Create infrastructure/providers/sms/twilio.provider.ts
      → Extract Twilio SMS from communication.service.ts
T-C6: Create infrastructure/providers/sms/sms.module.ts

T-C7: Create infrastructure/providers/email/email.interface.ts
      → IEmailProvider { send(to, subject, html): Promise<void> }
T-C8: Create infrastructure/providers/email/sendgrid.provider.ts
      → Extract SendGrid from communication.service.ts
T-C9: Create infrastructure/providers/email/email.module.ts

T-C10: Create infrastructure/providers/video/video.interface.ts
       → IVideoProvider { createRoom, createToken, deleteRoom }
T-C11: Create infrastructure/providers/video/daily.provider.ts
       → Extract Daily.co from telemedicine.service.ts
T-C12: Create infrastructure/providers/video/video.module.ts

T-C13: Move portal/otp/adapters/ → infrastructure/providers/otp/
       → Already has interface pattern — just relocate
T-C14: Create infrastructure/providers/otp/otp.module.ts

T-C15: Create infrastructure/providers/storage/storage.interface.ts
       → IStorageProvider { upload, getUrl, delete }
T-C16: Create infrastructure/providers/storage/r2.provider.ts
T-C17: Create infrastructure/providers/storage/storage.module.ts
```

### Task Group D — Move domain modules + update imports

```
T-D1: Move auth/ → modules/auth/         (update all imports)
T-D2: Move billing/ → modules/billing/   (inject IPaymentProvider)
T-D3: Move encounters/ → modules/encounters/
T-D4: Move icd10/ → modules/icd10/
T-D5: Move lab/ → modules/lab/
T-D6: Move patients/ → modules/patients/
T-D7: Move pharmacy/ → modules/pharmacy/
T-D8: Move portal/ → modules/portal/     (inject IOtpProvider via infrastructure)
T-D9: Move scheduling/ → modules/scheduling/
T-D10: Move telemedicine/ → modules/telemedicine/ (inject IVideoProvider)
T-D11: Move tenancy/ → modules/tenancy/
T-D12: Move audit-log/ → modules/audit/
```

### Task Group E — Merge communication + notifications → one module

```
T-E1: Create modules/notifications/ as the single outbound comms module
T-E2: Move notification.templates.ts → modules/notifications/templates/
T-E3: Move subscribers/ → modules/notifications/subscribers/
T-E4: Merge communication.service into notifications.service
      → notifications.service injects ISmsProvider + IEmailProvider
      → PDF generation becomes notifications/pdf.service.ts
T-E5: Move notification-log.schema → modules/notifications/schemas/
T-E6: Delete communication/ (merged) and modules/notifications/ (relocated)
T-E7: Remove ai-context/ (stub with no real usage — dead code)
```

### Task Group F — Update app.module.ts

```
T-F1: Update app.module.ts to import from new paths
      → InfrastructureModule (new) registers all providers
      → CoreModule (new) registers guards + filters globally
      → All domain modules import from modules/{module}
T-F2: pnpm exec tsc --noEmit → exit 0 required before done
```

---

## Phase 2: Frontend Cleanup (Session 43)

### Task Group G — Remove duplicate routes

```
T-G1: Remove (ops)/patients/ and (ops)/patients/new
      → (ops)/ops/patients/ is the kept version (already tested)
T-G2: Remove (clinical)/encounter/[id] (legacy)
      → (clinical)/encounters/[id] is the active workspace
T-G3: Remove (clinical)/encounter/new
      → Either redirect to encounters or integrate into encounters/[id]
T-G4: pnpm vitest run → all existing tests still pass
```

### Task Group H — Organize lib/ layer

```
T-H1: Audit apps/web/src/lib/ — ensure all API calls go through lib/api/*.api.ts
T-H2: Ensure all React Query hooks are in lib/hooks/
T-H3: Move any inline fetch() calls from page.tsx files → lib/api/
```

---

## Verification Checkpoints (After Each Phase)

### After Phase 1:
```bash
cd apps/api
pnpm exec tsc --noEmit           # Must pass — catches all broken imports
pnpm test -- --runInBand         # All 27 spec files must still pass
pnpm test:e2e -- --runInBand     # E2E suite must still pass
```

### After Phase 2:
```bash
cd apps/web
pnpm exec tsc --noEmit           # Must pass
pnpm vitest run                  # All 36 page tests must still pass
```

---

## What Gets Removed (Dead Weight)

| Module | Reason | Action |
|--------|---------|--------|
| `ai-context/` | Stub only, no real AI logic | Delete |
| `communication/` | Merged into modules/notifications/ | Delete after merge |
| `(clinical)/encounter/[id]` (legacy) | Superseded by encounters/[id] | Delete |
| `(clinical)/encounter/new` | Never properly implemented | Redirect or delete |
| `(ops)/patients/` | Duplicate of ops/patients/ | Delete |

---

## Order of Execution

```
Session 42:  Phase 1 Tasks A → B → C → D → E → F
             End: pnpm tsc + pnpm test both green

Session 43:  Phase 2 Tasks G → H
             End: pnpm vitest all green
             Then: ready for feature remapping with screens
```

---

## What Changes for Day-to-Day Development

After this refactor, adding a new feature follows this checklist:

1. **New vendor dependency?** → Create `infrastructure/providers/{vendor}/` with interface + implementation
2. **New domain feature?** → Add to `modules/{module}/` only
3. **Business service needs email/sms/payment?** → Inject the interface (`ISmsProvider`), not the SDK
4. **New page?** → `app/(group)/route/page.tsx` — thin shell only, logic in `lib/hooks/`
5. **New API call?** → Add to `lib/api/{module}.api.ts`, call from hooks

No more hunting through flat directories. No more wondering where something lives.

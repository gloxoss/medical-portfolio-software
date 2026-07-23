# Phase 6 — Security Requirements

## MediCore HIS — Authentication, Authorization, Encryption & Operational Security

---

## 1. Authentication Requirements

### 1.1 User Authentication

| ID | Requirement | Implementation |
|----|------------|---------------|
| SEC-001 | Passwords must be hashed with bcrypt, cost factor ≥12 | `bcrypt.hash(password, 12)` — never store plaintext. Cost factor 12 = ~250ms per hash on modern hardware |
| SEC-002 | Access tokens must be JWTs with 15-minute expiry | Payload: `{ sub: userId, org_id, email, iat, exp }`. Signed with HS256 + 64-char hex secret |
| SEC-003 | Refresh tokens must be stored as SHA-256 hashes in PostgreSQL | Actual token in HttpOnly cookie. Only hash in DB. Revocable on logout |
| SEC-004 | Refresh tokens must have 7-day expiry and support rotation | On each refresh: old token revoked, new token issued. Prevents replay attacks |
| SEC-005 | Failed login attempts must be rate-limited | 5 attempts per IP per 15 minutes on `/auth/login`. Returns 429 with `Retry-After` header |
| SEC-006 | Login error messages must not reveal whether email exists | Always return "Invalid email or password" — never "User not found" |
| SEC-007 | Password requirements: minimum 8 characters | Server-side validation via class-validator DTO. Client-side hint but no bypass |

### 1.2 Service-to-Service Authentication

| ID | Requirement | Implementation |
|----|------------|---------------|
| SEC-010 | FastAPI → NestJS internal calls must use `X-Internal-Service-Key` header | Shared secret, separate from JWT_SECRET. Validated by NestJS InternalGuard |
| SEC-011 | FastAPI must validate the same JWT tokens issued by NestJS | Shared `JWT_SECRET` environment variable. FastAPI `python-jose` validates HS256 |
| SEC-012 | Internal endpoints (`/internal/*`) must reject external requests | InternalGuard checks both `X-Internal-Service-Key` and request origin (private network only) |

### 1.3 Session Management

| ID | Requirement | Implementation |
|----|------------|---------------|
| SEC-015 | Sessions must be invalidated on password change | All refresh tokens for user revoked on password update |
| SEC-016 | Sessions must be invalidated on user deactivation | Middleware checks `user.status === ACTIVE` on every authenticated request |
| SEC-017 | Active sessions visible to org admins | `GET /admin/sessions` shows active refresh tokens per user (count, last used) |

---

## 2. Authorization Matrix

### 2.1 Role-Permission Mapping

| Permission | ORG_ADMIN | FACILITY_ADMIN | DOCTOR | NURSE | RECEPTIONIST | ACCOUNTANT |
|-----------|:---------:|:--------------:|:------:|:-----:|:------------:|:----------:|
| **Tenancy** | | | | | | |
| org.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| org.update | ✅ | — | — | — | — | — |
| facility.create | ✅ | — | — | — | — | — |
| facility.update | ✅ | ✅ | — | — | — | — |
| user.invite | ✅ | ✅ | — | — | — | — |
| user.deactivate | ✅ | ✅ | — | — | — | — |
| **Patients** | | | | | | |
| patient.create | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| patient.read | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| patient.update | ✅ | ✅ | ✅ | ✅ | — | — |
| patient.allergy.write | ✅ | — | ✅ | ✅ | — | — |
| **Scheduling** | | | | | | |
| schedule.manage | ✅ | ✅ | ✅* | — | — | — |
| appointment.book | ✅ | ✅ | ✅ | — | ✅ | — |
| appointment.checkin | ✅ | ✅ | — | — | ✅ | — |
| appointment.cancel | ✅ | ✅ | ✅ | — | ✅ | — |
| **Encounters** | | | | | | |
| encounter.create | — | — | ✅ | — | — | — |
| encounter.read | ✅ | ✅ | ✅ | ✅ | — | — |
| encounter.write | — | — | ✅ | — | — | — |
| encounter.sign_off | — | — | ✅ | — | — | — |
| **Billing** | | | | | | |
| invoice.read | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| invoice.edit | ✅ | ✅ | — | — | ✅ | ✅ |
| invoice.send | ✅ | ✅ | — | — | ✅ | ✅ |
| payment.record | ✅ | ✅ | — | — | ✅ | ✅ |
| revenue.view | ✅ | ✅ | — | — | — | ✅ |
| **AI Copilot** | | | | | | |
| ai.copilot.use | — | — | ✅ | — | — | — |
| **Admin** | | | | | | |
| audit.read | ✅ | ✅ | — | — | — | — |
| settings.manage | ✅ | — | — | — | — | — |
| analytics.view | ✅ | ✅ | — | — | — | ✅ |

*\*DOCTOR can manage their own schedule only, not other doctors' schedules.*

### 2.2 Authorization Enforcement

```
Request → JwtAuthGuard (extract user)
       → TenantScopeGuard (inject org_id from token, ignore request body org_id)
       → PermissionsGuard (check user role has required permission via @Permissions() decorator)
       → Handler
```

**Critical rule**: The `org_id` used in all queries ALWAYS comes from the JWT payload, NEVER from query params or request body. This prevents horizontal privilege escalation.

---

## 3. Encryption Requirements

| ID | Scope | Requirement | Implementation |
|----|-------|------------|---------------|
| SEC-030 | In Transit | All HTTP traffic encrypted via TLS 1.2+ | Vercel + Railway enforce HTTPS. HSTS header with 1-year max-age |
| SEC-031 | In Transit | Database connections encrypted | MongoDB Atlas: TLS enforced by default. Railway PG: `?sslmode=require` |
| SEC-032 | In Transit | Redis connection encrypted | Railway Redis: TLS available. Use `rediss://` protocol |
| SEC-033 | At Rest | PostgreSQL data encrypted | Railway PG: volume-level encryption (AES-256) |
| SEC-034 | At Rest | MongoDB data encrypted | Atlas: WiredTiger encryption at rest (AES-256-CBC) enabled by default on M10+ |
| SEC-035 | At Rest | File uploads encrypted | Cloudflare R2: server-side encryption by default |
| SEC-036 | At Rest | Backups encrypted | Atlas and Railway encrypt backups by default |
| SEC-037 | Application | Sensitive fields never logged | Middleware strips `password`, `token`, `secret` from log output |
| SEC-038 | Application | API keys stored in environment variables only | Never committed to git. `env.template` has placeholders |

---

## 4. Input Validation Rules

| Rule | Scope | Implementation |
|------|-------|---------------|
| All DTOs validated server-side | Every endpoint | NestJS `class-validator` with `whitelist: true, forbidNonWhitelisted: true` |
| SQL injection prevented | All PG queries | Prisma ORM (parameterized queries only). No raw SQL |
| NoSQL injection prevented | All Mongo queries | Mongoose typed queries. No `$where` or string-constructed queries |
| XSS prevented | Frontend rendering | React auto-escaping. No `dangerouslySetInnerHTML`. CSP headers |
| File upload validation | Patient documents | Allowed types: PDF, JPG, PNG, DICOM. Max 10MB. Filename sanitized |
| Request body size limit | All endpoints | `express.json({ limit: '1mb' })` for JSON. Multer with 10MB limit for files |
| Pagination enforced | All list endpoints | Max `limit=100`. Default `limit=20`. Offset-based with total count |

---

## 5. Rate Limiting Strategy

| Endpoint Group | Limit | Window | Response |
|---------------|-------|--------|----------|
| `/auth/login` | 5 requests | 15 minutes | 429 + `Retry-After` header |
| `/auth/refresh` | 10 requests | 15 minutes | 429 |
| `/ai/copilot/*` | 20 requests | 1 hour | 429 + usage count in response |
| All other authenticated endpoints | 300 requests | 1 minute | 429 |
| `/orgs/onboard` (public) | 3 requests | 1 hour | 429 |

Implementation: Redis-backed sliding window counter. Key format: `rate:{endpoint_group}:{identifier}`.

---

## 6. CORS Configuration

```typescript
// Production
app.enableCors({
  origin: ['https://medicore.app', 'https://www.medicore.app'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24h preflight cache
});
```

No wildcard origins. No `Access-Control-Allow-Origin: *`. Credentials (cookies) require explicit origin listing.

---

## 7. Security Headers

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS for 1 year |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src fonts.gstatic.com; img-src 'self' *.r2.cloudflarestorage.com` | XSS mitigation |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused browser APIs |

# MediCore HIS — API Gap Tracker

> Tracks all 25 missing endpoints found during the Pages Bible audit.
> Each entry includes: the endpoint, which page needs it, implementation priority, and a skeleton.

---

## Phase 1 — MVP (15 Endpoints)

### AUTH-01: Forgot Password
```yaml
Path:    POST /auth/forgot-password
Page:    PG-002
Priority: P0
Body:    { email: string }
Response: 200 (always — no email enumeration)
```
```typescript
// Skeleton
@Post('forgot-password')
@HttpCode(200)
async forgotPassword(@Body() dto: ForgotPasswordDto) {
  // Always return success (don't reveal if email exists)
  await this.authService.sendResetEmail(dto.email);
  return { message: 'If the email exists, a reset link has been sent.' };
}
```

---

### AUTH-02: Reset Password
```yaml
Path:    POST /auth/reset-password
Page:    PG-003
Priority: P0
Body:    { token: string, new_password: string }
Response: 200 | 400 (invalid/expired token)
```
```typescript
@Post('reset-password')
@HttpCode(200)
async resetPassword(@Body() dto: ResetPasswordDto) {
  await this.authService.resetPassword(dto.token, dto.newPassword);
  return { message: 'Password has been reset.' };
}
```

---

### ORG-01: Check Slug Availability
```yaml
Path:    GET /orgs/check-slug/:slug
Page:    PG-004 (Onboarding)
Priority: P0
Response: { available: boolean, suggestion?: string }
```
```typescript
@Get('check-slug/:slug')
async checkSlug(@Param('slug') slug: string) {
  const available = await this.orgService.isSlugAvailable(slug);
  return {
    available,
    suggestion: available ? undefined : await this.orgService.suggestSlug(slug),
  };
}
```

---

### PAT-01: Update Patient
```yaml
Path:    PUT /patients/:id
Page:    PG-021
Priority: P0
Body:    Partial<CreatePatientDto>
Guards:  JwtAuth, Roles(RECEPTIONIST, FACILITY_ADMIN), TenantScoped
```
```typescript
@Put(':id')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('RECEPTIONIST', 'FACILITY_ADMIN')
async update(
  @Param('id') id: string,
  @Body() dto: UpdatePatientDto,
  @TenantScoped() tenant: TenantContext,
) {
  return this.patientService.update(tenant, id, dto);
}
```

---

### PAT-02: Delete Allergy
```yaml
Path:    DELETE /patients/:id/allergies/:allergyId
Page:    PG-021
Priority: P0
Guards:  JwtAuth, Roles(DOCTOR, RECEPTIONIST), TenantScoped
```

---

### PAT-03: Patient Timeline
```yaml
Path:    GET /patients/:id/timeline
Page:    PG-022
Priority: P1
Query:   ?page=1&limit=20&type=encounter,lab,invoice,document
Response: Paginated unified feed (encounters + labs + invoices + docs), sorted by date DESC
```
```typescript
// Service pattern: aggregate from multiple tables
async getTimeline(tenant: TenantContext, patientId: string, filters: TimelineFilters) {
  const [encounters, labOrders, invoices, documents] = await Promise.all([
    this.encounterRepo.findByPatient(tenant, patientId),
    this.labOrderRepo.findByPatient(tenant, patientId),
    this.invoiceRepo.findByPatient(tenant, patientId),
    this.documentRepo.findByPatient(tenant, patientId),
  ]);

  return this.mergeAndSort([...encounters, ...labOrders, ...invoices, ...documents])
    .slice((filters.page - 1) * filters.limit, filters.page * filters.limit);
}
```

---

### SCHED-01: Get Doctor Schedule Rules
```yaml
Path:    GET /doctors/:id/schedule
Page:    PG-030
Priority: P0
Response: Array of schedule rules (day, start, end, slot_duration, breaks[])
```

---

### SCHED-02: Update Schedule Rule
```yaml
Path:    PUT /doctors/:id/schedule/:scheduleId
Page:    PG-030
Priority: P0
```

---

### APPT-01: Reschedule Appointment
```yaml
Path:    PUT /appointments/:id
Page:    PG-032
Priority: P0
Body:    { start_time: ISO8601, doctor_id?: string, reason?: string }
Response: Updated appointment with audit entry
```

---

### ENC-01: Order Lab Tests from Encounter
```yaml
Path:    POST /encounters/:id/lab-orders
Page:    PG-040
Priority: P0
Body:    { tests: [{ test_id, urgency, fasting_required?, clinical_notes? }] }
Events:  Publishes 'lab.order.created' → Lab queue
```

---

### DRUG-01: Drug Search
```yaml
Path:    GET /drugs/search?q=
Page:    PG-042
Priority: P0
Response: Array of { id, brand_name, generic_name, form, strengths[], category }
Notes:   Preloaded from the drug catalog (admin-managed). Supports fuzzy matching.
```

---

### ICD-01: ICD-10 Search
```yaml
Path:    GET /icd10/search?q=
Page:    PG-040
Priority: P0
Response: Array of { code, description, category }
Notes:   Read-only reference data. Loaded from WHO ICD-10 dataset.
```

---

### INV-01: Create Manual Invoice
```yaml
Path:    POST /invoices
Page:    PG-050
Priority: P0
Body:    { patient_id, facility_id, items: [{ service_id, qty, unit_price, discount? }] }
Notes:   For walk-ins or services not linked to an encounter.
```

---

### INV-02: Void Invoice
```yaml
Path:    POST /invoices/:id/void
Page:    PG-051
Priority: P0
Body:    { reason: string }
Notes:   Soft delete — marks as VOID, keeps record for audit. Refund if payments exist.
```

---

### INV-03: Generate Invoice PDF
```yaml
Path:    GET /invoices/:id/pdf
Page:    PG-051
Priority: P0
Response: application/pdf stream
Notes:   Uses clinic branding (logo, header, footer from org settings).
```

---

### NOTIF-01: Notifications
```yaml
Path:    GET /notifications?page=&limit=&unread_only=
         PUT /notifications/:id/read
Page:    PG-009 (TopBar)
Priority: P1
Response: Paginated notifications with SSE for real-time push
```

---

## Phase 2 (10 Endpoints)

### PAT-04: Documents
```yaml
GET  /patients/:id/documents     # List uploaded files
POST /patients/:id/documents     # Upload to R2
```

### PAT-05: Vitals Trend
```yaml
GET /patients/:id/vitals-trend?metric=bp,weight,bmi&from=&to=
```

### APPT-02: Appointment Audit Trail
```yaml
GET /appointments/:id/audit      # Who booked, changed, cancelled
```

### ENC-02: Order Sets
```yaml
GET /order-sets                  # Saved clinical order templates
POST /order-sets                 # Create new template
```

### ENC-03: Amendment
```yaml
POST /encounters/:id/amend      # Create amendment after sign-off
GET  /encounters/:id/amendments  # Amendment history
```

### REV-01: Revenue by Service/Doctor
```yaml
GET /orgs/:id/revenue/by-service?period=month
GET /orgs/:id/revenue/by-doctor?period=month
```

### RPT-01: Report Export
```yaml
GET /reports/export?type=revenue&format=csv&from=&to=
```

### USR-01: User Activity
```yaml
GET /users/:id/activity?page=&limit=
```

### SUPER-01: Super Admin
```yaml
GET /super/tenants               # All org summaries
GET /super/metrics               # System-wide KPIs
```

---

## Implementation Checklist

When implementing an endpoint, verify:

- [ ] Route matches the OpenAPI path above
- [ ] Request body validated with Zod/class-validator DTO
- [ ] Response shape matches the spec (no extra fields)
- [ ] Guards applied: `@UseGuards(JwtAuthGuard, RolesGuard)`
- [ ] Tenant scoping: `@TenantScoped()` on all data-accessing endpoints
- [ ] Audit log: state-changing ops go through AuditLogInterceptor
- [ ] Events published: if the action triggers downstream modules
- [ ] Error handling: proper HTTP status codes (400, 401, 403, 404, 409)
- [ ] Tests: unit test for service, integration test for controller
- [ ] Rate limiting: applied (especially on auth, expensive ops)

# MediCore HIS — Testing Patterns

> TDD patterns for each layer. Write tests BEFORE implementation.

---

## 1. Test File Naming & Location

```
# Backend
src/modules/patients/tests/
  ├── patient.service.spec.ts       # Unit tests (service logic)
  ├── patient.controller.spec.ts    # Integration tests (HTTP layer)
  └── patient.repository.spec.ts    # DB tests (if complex queries)

# Frontend
src/components/clinical/
  ├── PatientForm.tsx
  └── PatientForm.test.tsx          # Co-located component tests

src/lib/hooks/
  ├── usePatients.ts
  └── usePatients.test.ts           # Hook tests

# E2E
e2e/
  ├── auth.spec.ts                  # Login/register flows
  ├── patient-registration.spec.ts  # Register → verify → view
  ├── encounter-flow.spec.ts        # Queue → encounter → sign-off → billing
  └── fixtures/                     # Shared test data factories
```

---

## 2. Test Data Factories (No Mock Data)

Instead of hardcoding test data, use **factories** that generate realistic data:

```typescript
// test/factories/patient.factory.ts
import { faker } from '@faker-js/faker';

export function createPatientData(overrides: Partial<CreatePatientDto> = {}) {
  return {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    phone: `+212${faker.string.numeric(9)}`,
    date_of_birth: faker.date.birthdate({ min: 1, max: 90, mode: 'age' }).toISOString(),
    sex: faker.helpers.arrayElement(['M', 'F']),
    email: faker.internet.email(),
    ...overrides,
  };
}

export function createTenantContext(overrides: Partial<TenantContext> = {}): TenantContext {
  return {
    orgId: `org-${faker.string.uuid()}`,
    facilityId: `fac-${faker.string.uuid()}`,
    userId: `usr-${faker.string.uuid()}`,
    role: 'RECEPTIONIST',
    ...overrides,
  };
}

// Usage:
const patient = createPatientData({ first_name: 'Ahmed' });
const tenant = createTenantContext({ role: 'DOCTOR' });
```

---

## 3. Unit Tests (Service Layer)

### Pattern: Test business logic, mock the repository

```typescript
// modules/patients/tests/patient.service.spec.ts
import { Test } from '@nestjs/testing';
import { PatientService } from '../patient.service';
import { PatientRepository } from '../patient.repository';
import { EventPublisher } from '../../../common/events/event-publisher';
import { createPatientData, createTenantContext } from '../../../../test/factories';

describe('PatientService', () => {
  let service: PatientService;
  let repo: jest.Mocked<PatientRepository>;
  let events: jest.Mocked<EventPublisher>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PatientService,
        {
          provide: PatientRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAll: jest.fn(),
            findByPhone: jest.fn(),
            getNextMrnSequence: jest.fn(),
          },
        },
        {
          provide: EventPublisher,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PatientService);
    repo = module.get(PatientRepository);
    events = module.get(EventPublisher);
  });

  describe('create', () => {
    const tenant = createTenantContext();

    it('should generate MRN with org prefix and current year', async () => {
      const orgPrefix = 'CEA';
      repo.getNextMrnSequence.mockResolvedValue(48);

      const dto = createPatientData();
      const result = await service.create(tenant, dto);

      expect(result.mrn).toMatch(/^[A-Z]{3}-2026-\d{5}$/);
    });

    it('should return warning when phone already exists for another patient', async () => {
      const dto = createPatientData({ phone: '+212600000001' });

      repo.findByPhone.mockResolvedValue({
        id: 'existing-id',
        mrn: 'CEA-2026-00001',
      } as any);

      const result = await service.create(tenant, dto);

      expect(result.warnings).toContain('DUPLICATE_PHONE');
      expect(result.patient).toBeDefined(); // Still created
    });

    it('should reject when first_name is missing', async () => {
      const dto = createPatientData({ first_name: '' });

      await expect(service.create(tenant, dto))
        .rejects.toThrow('first_name is required');
    });

    it('should enforce tenant scoping', async () => {
      const dto = createPatientData();

      await service.create(tenant, dto);

      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: tenant.orgId,
          facility_id: tenant.facilityId,
        }),
      );
    });

    it('should publish patient.created event', async () => {
      const dto = createPatientData();
      repo.getNextMrnSequence.mockResolvedValue(1);

      await service.create(tenant, dto);

      expect(events.publish).toHaveBeenCalledWith(
        'patient.created',
        expect.objectContaining({
          orgId: tenant.orgId,
        }),
      );
    });
  });
});
```

---

## 4. Integration Tests (Controller/API Layer)

### Pattern: Test HTTP layer with real validation, mock service

```typescript
// modules/patients/tests/patient.controller.spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PatientModule } from '../patient.module';
import { PatientService } from '../patient.service';

describe('PatientController (Integration)', () => {
  let app: INestApplication;
  let patientService: jest.Mocked<PatientService>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PatientModule],
    })
      .overrideProvider(PatientService)
      .useValue({
        create: jest.fn(),
        findAll: jest.fn(),
        findById: jest.fn(),
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    patientService = module.get(PatientService);
  });

  afterAll(() => app.close());

  describe('POST /patients', () => {
    it('should return 201 with valid data', async () => {
      const dto = createPatientData();
      patientService.create.mockResolvedValue({
        id: 'new-id',
        mrn: 'CEA-2026-00048',
        ...dto,
      } as any);

      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', 'Bearer test-token')
        .set('X-Facility-Id', 'fac-1')
        .send(dto);

      expect(res.status).toBe(201);
      expect(res.body.mrn).toBeDefined();
    });

    it('should return 400 with invalid email', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', 'Bearer test-token')
        .send({ first_name: 'Test', email: 'not-an-email' });

      expect(res.status).toBe(400);
    });

    it('should return 401 without auth token', async () => {
      const res = await request(app.getHttpServer())
        .post('/patients')
        .send(createPatientData());

      expect(res.status).toBe(401);
    });

    it('should return 403 for unauthorized role', async () => {
      // Simulate PATIENT role trying to create a patient
      const res = await request(app.getHttpServer())
        .post('/patients')
        .set('Authorization', 'Bearer patient-token')
        .send(createPatientData());

      expect(res.status).toBe(403);
    });
  });
});
```

---

## 5. Frontend Component Tests

### Pattern: Test user interactions, not implementation details

```tsx
// components/clinical/PatientForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientForm } from './PatientForm';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '../../../test/utils';

// Wrap with providers
function renderWithProviders(ui: React.ReactElement) {
  return render(
    <QueryClientProvider client={createTestQueryClient()}>
      {ui}
    </QueryClientProvider>
  );
}

describe('PatientForm', () => {
  it('should show MRN preview after entering name', async () => {
    renderWithProviders(<PatientForm orgPrefix="CEA" />);

    await userEvent.type(screen.getByLabelText('First name'), 'Ahmed');
    await userEvent.type(screen.getByLabelText('Last name'), 'Benali');

    expect(screen.getByText(/CEA-2026-/)).toBeInTheDocument();
  });

  it('should auto-calculate age from date of birth', async () => {
    renderWithProviders(<PatientForm orgPrefix="CEA" />);

    await userEvent.type(screen.getByLabelText('Date of birth'), '1984-03-15');

    await waitFor(() => {
      expect(screen.getByText(/42 years/)).toBeInTheDocument();
    });
  });

  it('should show allergy severity badge when adding allergy', async () => {
    renderWithProviders(<PatientForm orgPrefix="CEA" />);

    await userEvent.click(screen.getByText('+ Add Allergy'));
    await userEvent.type(screen.getByLabelText('Allergen'), 'Penicillin');
    await userEvent.selectOptions(screen.getByLabelText('Severity'), 'severe');
    await userEvent.click(screen.getByText('Add'));

    expect(screen.getByText('🔴 Penicillin')).toBeInTheDocument();
    expect(screen.getByText('Severe')).toBeInTheDocument();
  });

  it('should show duplicate phone warning but allow submission', async () => {
    // Mock API to return duplicate warning
    server.use(
      rest.post('/patients', (req, res, ctx) =>
        res(ctx.json({ patient: { id: '1' }, warnings: ['DUPLICATE_PHONE'] }))
      ),
    );

    renderWithProviders(<PatientForm orgPrefix="CEA" />);

    await userEvent.type(screen.getByLabelText('Phone'), '+212600000001');
    await userEvent.click(screen.getByText('Register Patient'));

    await waitFor(() => {
      expect(screen.getByText(/Another patient.*has this phone/)).toBeInTheDocument();
    });
    // Form should NOT block submission
    expect(screen.queryByText('Registration failed')).not.toBeInTheDocument();
  });

  it('should disable submit until required fields are filled', () => {
    renderWithProviders(<PatientForm orgPrefix="CEA" />);

    const submitBtn = screen.getByRole('button', { name: /Register Patient/ });
    expect(submitBtn).toBeDisabled();
  });
});
```

---

## 6. E2E Tests (Playwright)

### Pattern: Test full user journeys

```typescript
// e2e/encounter-flow.spec.ts
import { test, expect } from '@playwright/test';
import { loginAs, createTestPatient } from './helpers';

test.describe('Encounter Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'doctor');
  });

  test('Doctor: queue → encounter → sign-off → invoice created', async ({ page }) => {
    // Step 1: Navigate to queue
    await page.goto('/ops/queue');
    await expect(page.getByText('Queue Management')).toBeVisible();

    // Step 2: Click on a checked-in patient
    const patientRow = page.getByText('Ahmed Benali');
    await expect(patientRow).toBeVisible();
    await patientRow.click();

    // Step 3: Encounter workspace opens
    await expect(page.getByText('SOAP Notes')).toBeVisible();

    // Step 4: Fill vitals
    await page.fill('[name="bp_systolic"]', '130');
    await page.fill('[name="bp_diastolic"]', '82');
    await page.fill('[name="heart_rate"]', '78');

    // Wait for autosave
    await expect(page.getByText('Saved ✓')).toBeVisible({ timeout: 5000 });

    // Step 5: Add SOAP notes
    await page.fill('[name="soap_subjective"]', 'Patient reports fatigue');
    await page.fill('[name="soap_assessment"]', 'Type 2 Diabetes follow-up');

    // Step 6: Add diagnosis
    await page.fill('[data-testid="icd10-search"]', 'E11');
    await page.click('[data-testid="icd10-result-E11.2"]');
    await expect(page.getByText('E11.2')).toBeVisible();

    // Step 7: Sign off
    await page.click('button:has-text("Sign Off Encounter")');
    await expect(page.getByText('Confirm & Sign Off')).toBeVisible();
    await page.click('button:has-text("Confirm & Sign Off")');

    // Step 8: Verify invoice was created (redirect or toast)
    await expect(page.getByText('Encounter signed off')).toBeVisible();

    // Step 9: Navigate to billing and verify invoice exists
    await page.goto('/ops/billing');
    await expect(page.getByText('Ahmed Benali')).toBeVisible();
  });
});
```

---

## 7. Security Tests

```typescript
// test/security/auth-security.spec.ts
describe('Auth Security', () => {
  it('should not reveal if email exists on login failure', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'nonexistent@test.com', password: 'wrong' });

    expect(res.body.message).toBe('Invalid credentials');
    // NOT "Email not found" or "Wrong password"
  });

  it('should rate-limit login attempts', async () => {
    const attempts = Array(10).fill(null).map(() =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@test.com', password: 'wrong' })
    );

    const results = await Promise.all(attempts);
    const blocked = results.filter(r => r.status === 429);
    expect(blocked.length).toBeGreaterThan(0);
  });

  it('should not expose stack traces in error responses', async () => {
    const res = await request(app.getHttpServer())
      .get('/patients/invalid-uuid');

    expect(res.body).not.toHaveProperty('stack');
    expect(res.body).not.toHaveProperty('trace');
  });

  it('should enforce tenant isolation', async () => {
    // User from org-1 should not see patients from org-2
    const res = await request(app.getHttpServer())
      .get(`/patients/${patientFromOrg2.id}`)
      .set('Authorization', `Bearer ${org1Token}`);

    expect(res.status).toBe(404); // Not 403 — don't reveal it exists
  });
});
```

---

## 8. Test Coverage Guidelines

### Minimum Coverage Per Module

| Module | Service | Controller | Components | E2E |
|--------|---------|------------|------------|-----|
| Auth | 95% | 90% | Login/Register forms | Login flow |
| Patients | 90% | 85% | PatientForm, PatientList | Register → View |
| Appointments | 90% | 85% | Calendar, BookingForm | Book → Check-in |
| Encounters | 90% | 85% | EncounterWorkspace | Queue → Sign-off |
| Billing | 85% | 80% | InvoiceDetail, PaymentModal | Sign-off → Pay |
| Pharmacy | 85% | 80% | DispensingForm | Order → Dispense |
| Lab | 85% | 80% | ResultEntry | Order → Results |

### Running Tests

```bash
# Unit tests
npm run test -- --filter=patients         # Single module
npm run test                               # All
npm run test -- --coverage                 # With coverage report

# E2E tests
npx playwright test                        # All E2E
npx playwright test encounter-flow         # Single spec
npx playwright test --headed               # With browser visible

# Type checking (not a test, but catches errors)
npx tsc --noEmit
```

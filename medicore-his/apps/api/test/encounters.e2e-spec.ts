import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import * as request from 'supertest';
import { EncountersController } from '../src/encounters/encounters.controller';
import { EncountersService } from '../src/encounters/encounters.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';

type UserShape = { id: string; orgId: string; email: string };

const MOCK_USER: UserShape = {
  id: 'doctor-001',
  orgId: 'org-001',
  email: 'doctor@medicore.ma',
};

const createMockEncountersService = () => ({
  create: jest.fn(),
  getById: jest.fn(),
  updateVitals: jest.fn(),
  updateSoap: jest.fn(),
  addDiagnosis: jest.fn(),
  removeDiagnosis: jest.fn(),
  addPrescription: jest.fn(),
  addLabOrder: jest.fn(),
  signOff: jest.fn(),
  getPatientEncounters: jest.fn(),
});

async function buildEncounterTestApp(
  serviceMock: ReturnType<typeof createMockEncountersService>,
  allowPermission = true,
): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [EncountersController],
    providers: [{ provide: EncountersService, useValue: serviceMock }],
  })
    .overrideGuard(JwtAuthGuard)
    .useValue({ canActivate: () => true })
    .overrideGuard(PermissionsGuard)
    .useValue({ canActivate: () => allowPermission })
    .compile();

  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.use((req: { user?: UserShape }, _res: unknown, next: () => void) => {
    req.user = MOCK_USER;
    next();
  });
  await app.init();
  return app;
}

describe('Encounters E2E', () => {
  let app: INestApplication;
  let serviceMock: ReturnType<typeof createMockEncountersService>;

  beforeEach(async () => {
    serviceMock = createMockEncountersService();
    app = await buildEncounterTestApp(serviceMock, true);
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('DELETE /api/v1/encounters/:id/diagnoses/:code', () => {
    it('returns 200 and routes diagnosis removal through service', async () => {
      serviceMock.removeDiagnosis.mockResolvedValue({
        _id: 'enc-001',
        diagnoses: [],
      });

      const res = await request(app.getHttpServer())
        .delete('/api/v1/encounters/enc-001/diagnoses/I10')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(serviceMock.removeDiagnosis).toHaveBeenCalledWith('org-001', 'enc-001', 'I10');
    });

    it('returns 404 when diagnosis does not exist', async () => {
      serviceMock.removeDiagnosis.mockRejectedValue(
        new NotFoundException('Diagnosis not found in encounter'),
      );

      const res = await request(app.getHttpServer())
        .delete('/api/v1/encounters/enc-001/diagnoses/I10')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/encounters/:id/sign-off', () => {
    it('returns 200 and routes sign-off through service', async () => {
      serviceMock.signOff.mockResolvedValue({
        _id: 'enc-001',
        status: 'signed_off',
        signed_off_by: 'doctor-001',
      });

      const res = await request(app.getHttpServer())
        .post('/api/v1/encounters/enc-001/sign-off')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(serviceMock.signOff).toHaveBeenCalledWith('org-001', 'doctor-001', 'enc-001');
    });

    it('returns 422 when sign-off clinical preconditions fail', async () => {
      serviceMock.signOff.mockRejectedValue(
        new UnprocessableEntityException('Cannot sign off: Assessment field is required'),
      );

      const res = await request(app.getHttpServer())
        .post('/api/v1/encounters/enc-001/sign-off')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(422);
    });

    it('returns 403 when permissions guard denies access', async () => {
      const restrictedApp = await buildEncounterTestApp(serviceMock, false);

      const res = await request(restrictedApp.getHttpServer())
        .post('/api/v1/encounters/enc-001/sign-off')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(403);
      await restrictedApp.close();
    });
  });
});

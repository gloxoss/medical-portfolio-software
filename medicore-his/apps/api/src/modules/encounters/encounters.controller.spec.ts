import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import * as request from 'supertest';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';

const mockEncountersService = {
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
};

const MOCK_USER = { id: 'doctor-001', orgId: 'org-001', email: 'doctor@medicore.ma' };

describe('EncountersController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EncountersController],
      providers: [{ provide: EncountersService, useValue: mockEncountersService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use((req: { user: unknown }, _res: unknown, next: () => void) => {
      req.user = MOCK_USER;
      next();
    });
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  describe('POST /encounters', () => {
    it('returns 201 and forwards facility and doctor context to service', async () => {
      const createdEncounter = { _id: 'enc-010', patient_id: 'pat-001', status: 'in_progress' };
      const payload = {
        patient_id: 'pat-001',
        visit_date: '2026-04-12T09:00:00.000Z',
      };
      mockEncountersService.create.mockResolvedValue(createdEncounter);

      const res = await request(app.getHttpServer())
        .post('/encounters')
        .set('Authorization', 'Bearer mock-jwt')
        .set('x-facility-id', 'fac-001')
        .send(payload);

      expect(res.status).toBe(201);
      expect(mockEncountersService.create).toHaveBeenCalledWith(
        'org-001',
        'fac-001',
        'doctor-001',
        payload,
      );
    });

    it('returns 400 when x-facility-id header is missing', async () => {
      const payload = {
        patient_id: 'pat-001',
        visit_date: '2026-04-12T09:00:00.000Z',
      };

      const res = await request(app.getHttpServer())
        .post('/encounters')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(400);
      expect(mockEncountersService.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /encounters/:id', () => {
    it('returns 200 and forwards org and encounter id', async () => {
      const encounter = { _id: 'enc-001', patient_id: 'pat-001', status: 'in_progress' };
      mockEncountersService.getById.mockResolvedValue(encounter);

      const res = await request(app.getHttpServer())
        .get('/encounters/enc-001')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(mockEncountersService.getById).toHaveBeenCalledWith('org-001', 'enc-001');
    });

    it('returns 404 when encounter is not found', async () => {
      mockEncountersService.getById.mockRejectedValue(new NotFoundException('Encounter not found'));

      const res = await request(app.getHttpServer())
        .get('/encounters/enc-missing')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /encounters/:id/vitals', () => {
    it('returns 200 and forwards vitals dto', async () => {
      const payload = { bp: '120/80', hr: 72, temp: 36.8 };
      const updatedEncounter = { _id: 'enc-001', vitals: payload };
      mockEncountersService.updateVitals.mockResolvedValue(updatedEncounter);

      const res = await request(app.getHttpServer())
        .put('/encounters/enc-001/vitals')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockEncountersService.updateVitals).toHaveBeenCalledWith(
        'org-001',
        'enc-001',
        payload,
      );
    });

    it('returns 400 when vitals types are invalid', async () => {
      const invalidPayload = { hr: 'high' };

      const res = await request(app.getHttpServer())
        .put('/encounters/enc-001/vitals')
        .set('Authorization', 'Bearer mock-jwt')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(mockEncountersService.updateVitals).not.toHaveBeenCalled();
    });
  });

  describe('PUT /encounters/:id/soap', () => {
    it('returns 200 and forwards soap dto', async () => {
      const payload = {
        subjective: 'Headache for 2 days',
        objective: 'Afebrile',
        assessment: 'Likely tension headache',
        plan: 'Hydration and analgesic',
      };
      const updatedEncounter = { _id: 'enc-001', soap: payload };
      mockEncountersService.updateSoap.mockResolvedValue(updatedEncounter);

      const res = await request(app.getHttpServer())
        .put('/encounters/enc-001/soap')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockEncountersService.updateSoap).toHaveBeenCalledWith(
        'org-001',
        'enc-001',
        payload,
      );
    });

    it('returns 400 when soap fields have invalid types', async () => {
      const invalidPayload = { assessment: 12345 };

      const res = await request(app.getHttpServer())
        .put('/encounters/enc-001/soap')
        .set('Authorization', 'Bearer mock-jwt')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(mockEncountersService.updateSoap).not.toHaveBeenCalled();
    });
  });

  describe('GET /encounters/patients/:patientId/encounters', () => {
    it('uses default page and limit when query params are omitted', async () => {
      mockEncountersService.getPatientEncounters.mockResolvedValue({
        data: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      const res = await request(app.getHttpServer())
        .get('/encounters/patients/pat-001/encounters')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(mockEncountersService.getPatientEncounters).toHaveBeenCalledWith(
        'org-001',
        'pat-001',
        1,
        20,
      );
    });

    it('forwards parsed page and limit query params', async () => {
      mockEncountersService.getPatientEncounters.mockResolvedValue({
        data: [],
        page: 2,
        limit: 50,
        total: 0,
      });

      const res = await request(app.getHttpServer())
        .get('/encounters/patients/pat-001/encounters?page=2&limit=50')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(mockEncountersService.getPatientEncounters).toHaveBeenCalledWith(
        'org-001',
        'pat-001',
        2,
        50,
      );
    });
  });

  describe('POST /encounters/:id/diagnoses', () => {
    it('returns 200 and forwards diagnosis dto', async () => {
      const payload = {
        code: 'I10',
        description: 'Essential (primary) hypertension',
        type: 'primary',
      };
      const updatedEncounter = {
        _id: 'enc-001',
        diagnoses: [payload],
      };
      mockEncountersService.addDiagnosis.mockResolvedValue(updatedEncounter);

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/diagnoses')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockEncountersService.addDiagnosis).toHaveBeenCalledWith(
        'org-001',
        'enc-001',
        payload,
      );
    });

    it('returns 400 when diagnosis type is invalid', async () => {
      const invalidPayload = {
        code: 'I10',
        description: 'Essential (primary) hypertension',
        type: 'invalid',
      };

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/diagnoses')
        .set('Authorization', 'Bearer mock-jwt')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(mockEncountersService.addDiagnosis).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /encounters/:id/diagnoses/:code', () => {
    it('returns 200 and forwards org, encounter id, and diagnosis code', async () => {
      const updatedEncounter = {
        _id: 'enc-001',
        diagnoses: [{ code: 'E11', description: 'Type 2 diabetes mellitus', type: 'secondary' }],
      };
      mockEncountersService.removeDiagnosis.mockResolvedValue(updatedEncounter);

      const res = await request(app.getHttpServer())
        .delete('/encounters/enc-001/diagnoses/I10')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ _id: 'enc-001' });
      expect(mockEncountersService.removeDiagnosis).toHaveBeenCalledWith(
        'org-001',
        'enc-001',
        'I10',
      );
    });

    it('returns 404 when diagnosis is not found', async () => {
      mockEncountersService.removeDiagnosis.mockRejectedValue(
        new NotFoundException('Diagnosis not found in encounter'),
      );

      const res = await request(app.getHttpServer())
        .delete('/encounters/enc-001/diagnoses/I10')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(404);
    });

    it('returns 403 when permissions guard denies access', async () => {
      const restrictedModule = await Test.createTestingModule({
        controllers: [EncountersController],
        providers: [{ provide: EncountersService, useValue: mockEncountersService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const restrictedApp = restrictedModule.createNestApplication();
      restrictedApp.use((req: { user: unknown }, _res: unknown, next: () => void) => {
        req.user = MOCK_USER;
        next();
      });
      await restrictedApp.init();

      const res = await request(restrictedApp.getHttpServer())
        .delete('/encounters/enc-001/diagnoses/I10')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(403);
      await restrictedApp.close();
    });
  });

  describe('POST /encounters/:id/prescriptions', () => {
    it('returns 200 and forwards prescription dto', async () => {
      const payload = {
        drug_name: 'Paracetamol',
        dosage: '500 mg',
        frequency: 'BID',
        duration: '5 days',
        notes: 'After meals',
      };
      const updatedEncounter = {
        _id: 'enc-001',
        prescriptions: [payload],
      };
      mockEncountersService.addPrescription.mockResolvedValue(updatedEncounter);

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/prescriptions')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockEncountersService.addPrescription).toHaveBeenCalledWith(
        'org-001',
        'enc-001',
        payload,
      );
    });

    it('returns 400 when required prescription fields are missing', async () => {
      const invalidPayload = {
        drug_name: 'Paracetamol',
      };

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/prescriptions')
        .set('Authorization', 'Bearer mock-jwt')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(mockEncountersService.addPrescription).not.toHaveBeenCalled();
    });

    it('returns 422 when service rejects due to clinical guard', async () => {
      const payload = {
        drug_name: 'Amoxicillin',
        dosage: '500 mg',
        frequency: 'TID',
        duration: '7 days',
      };
      mockEncountersService.addPrescription.mockRejectedValue(
        new UnprocessableEntityException('Allergy warning: override required'),
      );

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/prescriptions')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(422);
    });

    it('returns 403 when permissions guard denies access', async () => {
      const restrictedModule = await Test.createTestingModule({
        controllers: [EncountersController],
        providers: [{ provide: EncountersService, useValue: mockEncountersService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const restrictedApp = restrictedModule.createNestApplication();
      restrictedApp.use((req: { user: unknown }, _res: unknown, next: () => void) => {
        req.user = MOCK_USER;
        next();
      });
      await restrictedApp.init();

      const res = await request(restrictedApp.getHttpServer())
        .post('/encounters/enc-001/prescriptions')
        .set('Authorization', 'Bearer mock-jwt')
        .send({
          drug_name: 'Paracetamol',
          dosage: '500 mg',
          frequency: 'BID',
          duration: '5 days',
        });

      expect(res.status).toBe(403);
      await restrictedApp.close();
    });
  });

  describe('POST /encounters/:id/lab-orders', () => {
    it('returns 200 and forwards lab order dto', async () => {
      const payload = {
        test_code: 'CBC',
        test_name: 'Complete Blood Count',
        notes: 'Urgent',
      };
      const updatedEncounter = {
        _id: 'enc-001',
        lab_orders: [payload],
      };
      mockEncountersService.addLabOrder.mockResolvedValue(updatedEncounter);

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/lab-orders')
        .set('Authorization', 'Bearer mock-jwt')
        .send(payload);

      expect(res.status).toBe(200);
      expect(mockEncountersService.addLabOrder).toHaveBeenCalledWith(
        'org-001',
        'enc-001',
        payload,
      );
    });

    it('returns 400 when lab order payload is invalid', async () => {
      const invalidPayload = {
        test_code: 'CBC',
      };

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/lab-orders')
        .set('Authorization', 'Bearer mock-jwt')
        .send(invalidPayload);

      expect(res.status).toBe(400);
      expect(mockEncountersService.addLabOrder).not.toHaveBeenCalled();
    });

    it('returns 403 when permissions guard denies access', async () => {
      const restrictedModule = await Test.createTestingModule({
        controllers: [EncountersController],
        providers: [{ provide: EncountersService, useValue: mockEncountersService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const restrictedApp = restrictedModule.createNestApplication();
      restrictedApp.use((req: { user: unknown }, _res: unknown, next: () => void) => {
        req.user = MOCK_USER;
        next();
      });
      await restrictedApp.init();

      const res = await request(restrictedApp.getHttpServer())
        .post('/encounters/enc-001/lab-orders')
        .set('Authorization', 'Bearer mock-jwt')
        .send({
          test_code: 'CBC',
          test_name: 'Complete Blood Count',
        });

      expect(res.status).toBe(403);
      await restrictedApp.close();
    });
  });

  describe('POST /encounters/:id/sign-off', () => {
    it('returns 200 and forwards org, doctor, and encounter id', async () => {
      const signedOffEncounter = {
        _id: 'enc-001',
        status: 'signed_off',
        signed_off_by: 'doctor-001',
      };
      mockEncountersService.signOff.mockResolvedValue(signedOffEncounter);

      const res = await request(app.getHttpServer())
        .post('/encounters/enc-001/sign-off')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(mockEncountersService.signOff).toHaveBeenCalledWith(
        'org-001',
        'doctor-001',
        'enc-001',
      );
    });

    it('returns 403 when permissions guard denies access', async () => {
      const restrictedModule = await Test.createTestingModule({
        controllers: [EncountersController],
        providers: [{ provide: EncountersService, useValue: mockEncountersService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => false })
        .compile();

      const restrictedApp = restrictedModule.createNestApplication();
      restrictedApp.use((req: { user: unknown }, _res: unknown, next: () => void) => {
        req.user = MOCK_USER;
        next();
      });
      await restrictedApp.init();

      const res = await request(restrictedApp.getHttpServer())
        .post('/encounters/enc-001/sign-off')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(403);
      await restrictedApp.close();
    });
  });
});

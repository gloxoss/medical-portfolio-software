import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as request from 'supertest';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';

// ─── Stub service ─────────────────────────────────────────────────────────────

const mockPatientsService = {
  register: jest.fn(),
  search: jest.fn(),
  getById: jest.fn(),
  addAllergy: jest.fn(),
};

// ─── Mock user injected on every request ─────────────────────────────────────

const MOCK_USER = { id: 'user-001', orgId: 'org-001', email: 'admin@medicore.ma' };

describe('PatientsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [{ provide: PatientsService, useValue: mockPatientsService }],
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

  // ── POST /patients ──────────────────────────────────────────────────────────

  describe('POST /patients', () => {
    const validPayload = {
      name_first: 'Fatima',
      name_last: 'Benali',
      dob: '1990-05-15',
      gender: 'female',
      phone: '+212612345678',
    };

    it('should return 201 and the created patient', async () => {
      const createdPatient = { _id: 'patient-001', mrn: 'CEA-2026-00001', ...validPayload };
      mockPatientsService.register.mockResolvedValue(createdPatient);

      const res = await request(app.getHttpServer())
        .post('/patients')
        .send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ mrn: 'CEA-2026-00001' });
      expect(mockPatientsService.register).toHaveBeenCalledWith('org-001', validPayload);
    });

    it('should return 403 when PermissionsGuard denies', async () => {
      const guardlessModule = await Test.createTestingModule({
        controllers: [PatientsController],
        providers: [{ provide: PatientsService, useValue: mockPatientsService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => true })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => { throw new ForbiddenException(); } })
        .compile();

      const restrictedApp = guardlessModule.createNestApplication();
      restrictedApp.useGlobalPipes(new ValidationPipe({ whitelist: true }));
      restrictedApp.use((req: { user: unknown }, _r: unknown, next: () => void) => { req.user = MOCK_USER; next(); });
      await restrictedApp.init();

      const res = await request(restrictedApp.getHttpServer())
        .post('/patients')
        .send(validPayload);

      expect(res.status).toBe(403);
      await restrictedApp.close();
    });
  });

  // ── GET /patients/search ────────────────────────────────────────────────────

  describe('GET /patients/search', () => {
    it('should return 200 with paginated results', async () => {
      const searchResult = {
        patients: [{ _id: 'p-001', firstName: 'Fatima' }],
        total: 1,
        page: 1,
        limit: 20,
      };
      mockPatientsService.search.mockResolvedValue(searchResult);

      const res = await request(app.getHttpServer())
        .get('/patients/search?q=Fatima&page=1&limit=20');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ total: 1 });
      expect(mockPatientsService.search).toHaveBeenCalledWith('org-001', expect.objectContaining({ q: 'Fatima' }));
    });

    it('should return 200 when q is omitted and keep q undefined in DTO', async () => {
      mockPatientsService.search.mockResolvedValue({ patients: [], total: 0, page: 1, limit: 10 });

      const res = await request(app.getHttpServer())
        .get('/patients/search?page=1&limit=10');

      expect(res.status).toBe(200);
      expect(mockPatientsService.search).toHaveBeenCalledWith(
        'org-001',
        expect.objectContaining({ page: 1, limit: 10 }),
      );

      const dto = mockPatientsService.search.mock.calls[0][1];
      expect(dto.q).toBeUndefined();
    });

    it('should return 400 when q is explicitly empty', async () => {
      const res = await request(app.getHttpServer())
        .get('/patients/search?q=');

      expect(res.status).toBe(400);
      expect(mockPatientsService.search).not.toHaveBeenCalled();
    });

    it('should return 400 when q has fewer than 2 characters', async () => {
      const res = await request(app.getHttpServer())
        .get('/patients/search?q=a');

      expect(res.status).toBe(400);
      expect(mockPatientsService.search).not.toHaveBeenCalled();
    });

    it('should return 200 with empty list when no match', async () => {
      mockPatientsService.search.mockResolvedValue({ patients: [], total: 0, page: 1, limit: 20 });

      const res = await request(app.getHttpServer()).get('/patients/search?q=NonExistent');

      expect(res.status).toBe(200);
      expect(res.body.patients).toHaveLength(0);
    });
  });

  // ── GET /patients/:id ───────────────────────────────────────────────────────

  describe('GET /patients/:id', () => {
    it('should return 200 when patient exists in org', async () => {
      const patient = { _id: 'patient-abc', mrn: 'CEA-2026-00001', firstName: 'Fatima' };
      mockPatientsService.getById.mockResolvedValue(patient);

      const res = await request(app.getHttpServer()).get('/patients/patient-abc');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ mrn: 'CEA-2026-00001' });
    });

    it('should return 404 when patient not found in org', async () => {
      mockPatientsService.getById.mockRejectedValue(new NotFoundException('Patient not found'));

      const res = await request(app.getHttpServer()).get('/patients/unknown-id');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /patients/:id/allergies ────────────────────────────────────────────

  describe('POST /patients/:id/allergies', () => {
    it('should return 200 when allergy added successfully', async () => {
      const updated = { _id: 'patient-abc', allergies: [{ substance: 'Penicillin', severity: 'HIGH' }] };
      mockPatientsService.addAllergy.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .post('/patients/patient-abc/allergies')
        .send({ substance: 'Penicillin', type: 'drug', severity: 'severe', reaction: 'Anaphylaxis' });

      expect(res.status).toBe(200);
      expect(mockPatientsService.addAllergy).toHaveBeenCalledWith(
        'org-001',
        'patient-abc',
        expect.objectContaining({ substance: 'Penicillin', type: 'drug' }),
      );
    });
  });
});

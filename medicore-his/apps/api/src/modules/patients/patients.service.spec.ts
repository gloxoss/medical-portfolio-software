import { Test, TestingModule } from '@nestjs/testing';
import { PatientsService } from './patients.service';
import { PatientsRepository } from './patients.repository';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { NotFoundException } from '@nestjs/common';

const mockPatient = {
  _id: '6601234567890abcdef01234',
  org_id: 'org-001',
  mrn: 'CEA-2026-00001',
  name: { first: 'Amine', last: 'Benhassou', display: 'Amine Benhassou' },
  phone: '+212612345678',
  gender: 'male',
  status: 'active',
  allergies: [],
};

const mockRepo = {
  create: jest.fn(),
  findByPhone: jest.fn(),
  findById: jest.fn(),
  search: jest.fn(),
  addAllergy: jest.fn(),
};

const mockEvents = { publish: jest.fn().mockResolvedValue(undefined) };

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientsService,
        { provide: PatientsRepository, useValue: mockRepo },
        { provide: RedisPublisherService, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  // ─── register ──────────────────────────────────────────────────────────────
  describe('register', () => {
    const dto = { name_first: 'Amine', name_last: 'Benhassou', phone: '+212612345678' };

    it('should create patient and return MRN', async () => {
      mockRepo.findByPhone.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockPatient);

      const result = await service.register('org-001', dto) as { patient: typeof mockPatient; warnings: string[] };

      expect(result.patient.mrn).toBe('CEA-2026-00001');
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn DUPLICATE_PHONE but still register', async () => {
      mockRepo.findByPhone.mockResolvedValue(mockPatient); // existing patient with same phone
      mockRepo.create.mockResolvedValue({ ...mockPatient, mrn: 'CEA-2026-00002' });

      const result = await service.register('org-001', dto) as { patient: typeof mockPatient; warnings: string[] };

      expect(result.warnings).toContain('DUPLICATE_PHONE');
      expect(result.patient).toBeDefined(); // registration still succeeds
    });

    it('should publish patient.created event', async () => {
      mockRepo.findByPhone.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(mockPatient);

      await service.register('org-001', dto);
      await new Promise((r) => setTimeout(r, 10));

      expect(mockEvents.publish).toHaveBeenCalledWith(
        'patient.created',
        expect.objectContaining({ mrn: 'CEA-2026-00001', orgId: 'org-001' }),
      );
    });
  });

  // ─── getById ───────────────────────────────────────────────────────────────
  describe('getById', () => {
    it('should return patient when found in org', async () => {
      mockRepo.findById.mockResolvedValue(mockPatient);
      const result = await service.getById('org-001', '6601234567890abcdef01234');
      expect(result).toBeDefined();
    });

    it('should throw 404 when patient not in org (cross-org isolation)', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(
        service.getById('org-002', '6601234567890abcdef01234'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw 404 for invalid ObjectId', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(service.getById('org-001', 'not-valid-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ─── search ────────────────────────────────────────────────────────────────
  describe('search', () => {
    it('should return paginated results', async () => {
      mockRepo.search.mockResolvedValue({ data: [mockPatient], total: 1 });
      const result = await service.search('org-001', { q: 'amine', page: 1, limit: 20 }) as {
        data: unknown[]; total: number; page: number;
      };
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  // ─── addAllergy ────────────────────────────────────────────────────────────
  describe('addAllergy', () => {
    const allergyDto = { substance: 'Penicillin', type: 'drug', severity: 'severe' };

    it('should add allergy and return updated patient', async () => {
      const updated = { ...mockPatient, allergies: [{ substance: 'Penicillin', severity: 'severe' }] };
      mockRepo.addAllergy.mockResolvedValue(updated);

      const result = await service.addAllergy('org-001', '6601234567890abcdef01234', allergyDto);
      expect(result).toBeDefined();
    });

    it('should throw 404 when patient not found', async () => {
      mockRepo.addAllergy.mockResolvedValue(null);
      await expect(
        service.addAllergy('org-001', '6601234567890abcdef01234', allergyDto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

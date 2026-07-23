import { Test, TestingModule } from '@nestjs/testing';
import { EncountersService } from './encounters.service';
import { EncountersRepository } from './encounters.repository';
import { PatientsRepository } from '../patients/patients.repository';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import {
  NotFoundException, ConflictException,
  BadRequestException, UnprocessableEntityException,
} from '@nestjs/common';

const mockRepo = {
  create: jest.fn(),
  findById: jest.fn(),
  findByAppointmentId: jest.fn(),
  update: jest.fn(),
  pushDiagnosis: jest.fn(),
  pullDiagnosisByCode: jest.fn(),
  pushPrescription: jest.fn(),
  findByPatient: jest.fn(),
};

const mockPatientsRepo = {
  findById: jest.fn(),
};

const mockRedis = {
  publish: jest.fn(),
};

describe('EncountersService', () => {
  let service: EncountersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
        { provide: EncountersRepository, useValue: mockRepo },
        { provide: PatientsRepository, useValue: mockPatientsRepo },
        { provide: RedisPublisherService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<EncountersService>(EncountersService);
    jest.clearAllMocks();
  });

  // ── Create ──────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('creates an encounter in in_progress state', async () => {
      mockRepo.create.mockResolvedValue({ _id: 'enc1' } as any);
      const dto = { patient_id: 'p1', visit_date: '2026-04-08T00:00:00.000Z' };
      const res = await service.create('org1', 'fac1', 'doc1', dto);
      expect(res).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        org_id: 'org1', status: 'in_progress',
      }));
    });

    it('throws 409 if appointment already has an encounter', async () => {
      mockRepo.findByAppointmentId.mockResolvedValue({ _id: 'existing' } as any);
      const dto = { patient_id: 'p1', appointment_id: 'apt1', visit_date: '2026-04-08' };
      await expect(service.create('org1', 'fac1', 'doc1', dto)).rejects.toThrow(ConflictException);
    });
  });

  // ── Sign-Off ────────────────────────────────────────────────────────────────

  describe('signOff', () => {
    it('updates status and publishes event when assessment present', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', doctor_id: 'doc1',
        patient_id: 'p1', facility_id: 'fac1',
        soap: { assessment: 'Hypertension Grade 2' },
      } as any);
      mockRepo.update.mockResolvedValue({ _id: 'enc1', status: 'signed_off' } as any);

      const res = await service.signOff('org1', 'doc1', 'enc1');
      expect(mockRepo.update).toHaveBeenCalledWith('enc1', 'org1', expect.objectContaining({ status: 'signed_off' }));
      expect(mockRedis.publish).toHaveBeenCalledWith('encounter.signed_off', expect.objectContaining({
        encounter_id: 'enc1',
      }));
      expect(res?.status).toBe('signed_off');
    });

    it('throws 409 if already signed off', async () => {
      mockRepo.findById.mockResolvedValue({ _id: 'enc1', status: 'signed_off', doctor_id: 'doc1' } as any);
      await expect(service.signOff('org1', 'doc1', 'enc1')).rejects.toThrow(ConflictException);
    });

    it('throws 400 if different doctor tries to sign off', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', doctor_id: 'doc1',
        soap: { assessment: 'Test' },
      } as any);
      await expect(service.signOff('org1', 'doc2', 'enc1')).rejects.toThrow(BadRequestException);
    });

    it('throws 422 when Assessment is empty', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', doctor_id: 'doc1',
        soap: { subjective: 'headache', assessment: '' },
      } as any);
      await expect(service.signOff('org1', 'doc1', 'enc1')).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when SOAP is null (no assessment at all)', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', doctor_id: 'doc1',
        soap: null,
      } as any);
      await expect(service.signOff('org1', 'doc1', 'enc1')).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── Update Sections ─────────────────────────────────────────────────────────

  describe('updateVitals', () => {
    it('throws 422 if encounter is signed off', async () => {
      mockRepo.findById.mockResolvedValue({ _id: 'enc1', status: 'signed_off' } as any);
      await expect(service.updateVitals('org1', 'enc1', { hr: 80 }))
        .rejects.toThrow(UnprocessableEntityException);
    });

    it('merges partial vitals with existing', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress',
        vitals: { hr: 72, bp: '120/80' },
      } as any);
      mockRepo.update.mockResolvedValue({ vitals: { hr: 80, bp: '120/80' } } as any);

      await service.updateVitals('org1', 'enc1', { hr: 80 });
      expect(mockRepo.update).toHaveBeenCalledWith('enc1', 'org1', expect.objectContaining({
        vitals: expect.objectContaining({ hr: 80, bp: '120/80' }),
      }));
    });
  });

  describe('updateSoap', () => {
    it('sets last_autosaved_at timestamp on SOAP update', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', soap: {},
      } as any);
      mockRepo.update.mockResolvedValue({ _id: 'enc1' } as any);

      await service.updateSoap('org1', 'enc1', { subjective: 'Headache for 3 days' });
      expect(mockRepo.update).toHaveBeenCalledWith('enc1', 'org1', expect.objectContaining({
        last_autosaved_at: expect.any(Date),
      }));
    });
  });

  // ── Diagnosis ───────────────────────────────────────────────────────────────

  describe('addDiagnosis', () => {
    it('pushes diagnosis to encounter', async () => {
      mockRepo.findById.mockResolvedValue({ _id: 'enc1', status: 'in_progress' } as any);
      mockRepo.pushDiagnosis.mockResolvedValue({ _id: 'enc1', diagnoses: [{ code: 'I10' }] } as any);

      const res = await service.addDiagnosis('org1', 'enc1', {
        code: 'I10', description: 'Essential hypertension', type: 'primary',
      });
      expect(mockRepo.pushDiagnosis).toHaveBeenCalled();
      expect(res!.diagnoses).toHaveLength(1);
    });

    it('throws 422 on signed-off encounter', async () => {
      mockRepo.findById.mockResolvedValue({ _id: 'enc1', status: 'signed_off' } as any);
      await expect(
        service.addDiagnosis('org1', 'enc1', { code: 'I10', description: 'HTN', type: 'primary' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('removeDiagnosis', () => {
    it('removes diagnosis by code from encounter', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1',
        status: 'in_progress',
        diagnoses: [{ code: 'I10', description: 'HTN', type: 'primary' }],
      } as any);
      mockRepo.pullDiagnosisByCode.mockResolvedValue({ _id: 'enc1', diagnoses: [] } as any);

      const res = await service.removeDiagnosis('org1', 'enc1', 'i10');

      expect(mockRepo.pullDiagnosisByCode).toHaveBeenCalledWith('enc1', 'org1', 'I10');
      expect(res!.diagnoses).toHaveLength(0);
    });

    it('throws 404 when diagnosis code is not present', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1',
        status: 'in_progress',
        diagnoses: [{ code: 'E11', description: 'Diabetes', type: 'primary' }],
      } as any);

      await expect(service.removeDiagnosis('org1', 'enc1', 'I10')).rejects.toThrow(NotFoundException);
      expect(mockRepo.pullDiagnosisByCode).not.toHaveBeenCalled();
    });

    it('throws 422 on signed-off encounter', async () => {
      mockRepo.findById.mockResolvedValue({ _id: 'enc1', status: 'signed_off' } as any);

      await expect(service.removeDiagnosis('org1', 'enc1', 'I10')).rejects.toThrow(UnprocessableEntityException);
      expect(mockRepo.pullDiagnosisByCode).not.toHaveBeenCalled();
    });
  });

  // ── Prescriptions + Allergy Cross-Check ─────────────────────────────────────

  describe('addPrescription', () => {
    const basePrescription = {
      drug_name: 'Paracetamol',
      dosage: '500mg',
      frequency: '3x/day',
      duration: '5 days',
    };

    it('adds prescription when no allergies', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', patient_id: 'p1',
      } as any);
      mockPatientsRepo.findById.mockResolvedValue({ allergies: [] });
      mockRepo.pushPrescription.mockResolvedValue({ _id: 'enc1' } as any);

      await service.addPrescription('org1', 'enc1', basePrescription);
      expect(mockRepo.pushPrescription).toHaveBeenCalled();
    });

    it('throws 422 when prescribing Amoxicillin with Penicillin allergy', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', patient_id: 'p1',
      } as any);
      mockPatientsRepo.findById.mockResolvedValue({
        allergies: [{
          substance: 'Penicillin',
          substance_normalized: 'penicillin',
          type: 'drug',
          severity: 'severe',
          reaction: 'Anaphylaxis',
        }],
      });

      await expect(
        service.addPrescription('org1', 'enc1', {
          ...basePrescription,
          drug_name: 'Amoxicillin',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows prescription with allergy_override: true', async () => {
      mockRepo.findById.mockResolvedValue({
        _id: 'enc1', status: 'in_progress', patient_id: 'p1',
      } as any);
      mockPatientsRepo.findById.mockResolvedValue({
        allergies: [{
          substance: 'Penicillin',
          substance_normalized: 'penicillin',
          type: 'drug',
          severity: 'severe',
        }],
      });
      mockRepo.pushPrescription.mockResolvedValue({ _id: 'enc1' } as any);

      const res = await service.addPrescription('org1', 'enc1', {
        ...basePrescription,
        drug_name: 'Amoxicillin',
        allergy_override: true,
      });
      expect(mockRepo.pushPrescription).toHaveBeenCalled();
    });

    it('throws 422 on signed-off encounter', async () => {
      mockRepo.findById.mockResolvedValue({ _id: 'enc1', status: 'signed_off' } as any);
      await expect(
        service.addPrescription('org1', 'enc1', basePrescription),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── Patient Encounters History ──────────────────────────────────────────────

  describe('getPatientEncounters', () => {
    it('returns paginated encounter history for a patient', async () => {
      mockRepo.findByPatient.mockResolvedValue({
        data: [{ _id: 'enc1' }, { _id: 'enc2' }],
        total: 2,
      });

      const result = await service.getPatientEncounters('org1', 'p1', 1, 20);
      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(mockRepo.findByPatient).toHaveBeenCalledWith('org1', 'p1', 1, 20);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { PharmacyService } from './pharmacy.service';
import { PharmacyRepository } from './pharmacy.repository';
import { PharmacyQueueRepository } from './pharmacy-queue.repository';
import { PatientsRepository } from '../patients/patients.repository';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';

const mockRepo = {
  listDrugs: jest.fn(),
  createDrug: jest.fn(),
  findDrugById: jest.fn(),
  listInventory: jest.fn(),
  findInventoryBatch: jest.fn(),
  upsertInventoryBatch: jest.fn(),
  decrementBatchQuantity: jest.fn(),
  findFefoBatches: jest.fn(),
  getTotalDrugQuantity: jest.fn(),
  listSuppliers: jest.fn(),
  createSupplier: jest.fn(),
  listPurchaseOrders: jest.fn(),
  createPurchaseOrder: jest.fn(),
  findPurchaseOrder: jest.fn(),
  updatePurchaseOrderStatus: jest.fn(),
};

const mockQueueRepo = {
  upsertQueueItem: jest.fn(),
  findQueue: jest.fn(),
  findByPrescription: jest.fn(),
  findByEncounter: jest.fn(),
  createDispensingLog: jest.fn(),
  markCompleted: jest.fn(),
};

const mockPatientsRepo = {
  findById: jest.fn(),
};

const mockRedis = {
  publish: jest.fn(),
};

describe('PharmacyService', () => {
  let service: PharmacyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyService,
        { provide: PharmacyRepository, useValue: mockRepo },
        { provide: PharmacyQueueRepository, useValue: mockQueueRepo },
        { provide: PatientsRepository, useValue: mockPatientsRepo },
        { provide: RedisPublisherService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PharmacyService>(PharmacyService);
    jest.clearAllMocks();
  });

  it('dispenses using FEFO allocation across batches', async () => {
    mockQueueRepo.findByEncounter.mockResolvedValue({ prescription_id: 'rx_1' });
    mockPatientsRepo.findById.mockResolvedValue({ allergies: [] });

    mockRepo.findDrugById.mockResolvedValue({ id: 'drug_1', name: 'Metformin' });
    mockRepo.findFefoBatches.mockResolvedValue([
      {
        id: 'batch_a',
        batchNumber: 'MET-001',
        quantity: 10,
        unitPrice: 5,
        reorderLevel: 5,
        facilityId: 'facility_1',
      },
      {
        id: 'batch_b',
        batchNumber: 'MET-002',
        quantity: 10,
        unitPrice: 5,
        reorderLevel: 5,
        facilityId: 'facility_1',
      },
    ]);
    mockRepo.getTotalDrugQuantity.mockResolvedValue(3);

    const result = await service.dispense('org_1', 'pharmacist_1', {
      patient_id: 'patient_1',
      encounter_id: 'enc_1',
      facility_id: 'facility_1',
      items: [{ drug_id: 'drug_1', quantity: 15 }],
    });

    expect(mockRepo.decrementBatchQuantity).toHaveBeenCalledWith('batch_a', 10);
    expect(mockRepo.decrementBatchQuantity).toHaveBeenCalledWith('batch_b', 5);
    expect(mockQueueRepo.markCompleted).toHaveBeenCalledWith('org_1', 'rx_1');
    expect(mockRedis.publish).toHaveBeenCalledWith(
      'pharmacy.dispensed',
      expect.objectContaining({
        org_id: 'org_1',
        encounter_id: 'enc_1',
      }),
    );
    expect(result.success).toBe(true);
    expect(result.dispensed_items).toHaveLength(2);
  });

  it('throws when stock is insufficient for FEFO allocation', async () => {
    mockQueueRepo.findByEncounter.mockResolvedValue({ prescription_id: 'rx_2' });
    mockPatientsRepo.findById.mockResolvedValue({ allergies: [] });

    mockRepo.findDrugById.mockResolvedValue({ id: 'drug_1', name: 'Amoxicillin' });
    mockRepo.findFefoBatches.mockResolvedValue([
      {
        id: 'batch_only',
        batchNumber: 'AMX-001',
        quantity: 5,
        unitPrice: 3,
        reorderLevel: 2,
        facilityId: 'facility_1',
      },
    ]);

    await expect(
      service.dispense('org_1', 'pharmacist_1', {
        patient_id: 'patient_1',
        encounter_id: 'enc_2',
        facility_id: 'facility_1',
        items: [{ drug_id: 'drug_1', quantity: 10 }],
      }),
    ).rejects.toThrow(UnprocessableEntityException);

    expect(mockRepo.decrementBatchQuantity).not.toHaveBeenCalled();
  });

  it('records allergy warnings in dispense result when drug matches allergy substance', async () => {
    mockQueueRepo.findByPrescription.mockResolvedValue({ prescription_id: 'rx_3' });

    mockPatientsRepo.findById.mockResolvedValue({
      allergies: [{ substance: 'Penicillin' }],
    });

    mockRepo.findDrugById.mockResolvedValue({ id: 'drug_2', name: 'Penicillin V' });
    mockRepo.findInventoryBatch.mockResolvedValue({
      id: 'batch_pen',
      batchNumber: 'PEN-001',
      quantity: 25,
      unitPrice: 7,
      reorderLevel: 4,
      facilityId: 'facility_1',
    });
    mockRepo.getTotalDrugQuantity.mockResolvedValue(20);

    const result = await service.dispense('org_1', 'pharmacist_1', {
      patient_id: 'patient_2',
      encounter_id: 'enc_3',
      facility_id: 'facility_1',
      prescription_id: 'rx_3',
      items: [{ drug_id: 'drug_2', quantity: 2, batch_number: 'PEN-001' }],
    });

    expect(result.allergy_warnings.length).toBeGreaterThan(0);
    expect(mockQueueRepo.createDispensingLog).toHaveBeenCalledWith(
      expect.objectContaining({
        allergy_warnings: expect.arrayContaining([expect.stringContaining('Potential allergy match')]),
      }),
    );
  });
});

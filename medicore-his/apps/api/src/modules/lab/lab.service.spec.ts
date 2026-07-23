import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LabOrderStatus as PrismaLabOrderStatus } from '@prisma/client';
import { EncountersService } from '../encounters/encounters.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { LabResultRepository } from './lab-result.repository';
import { LabService } from './lab.service';

const ORG_ID = 'org_1';
const FACILITY_ID = 'facility_1';
const USER_ID = 'user_1';
const FIXED_DATE = new Date('2026-04-11T09:00:00.000Z');

type MutableRecord = Record<string, unknown>;

const mockPrisma = {
  labOrder: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

const mockEncountersService = {
  getById: jest.fn(),
};

const mockLabResultRepository = {
  findByOrderId: jest.fn(),
  create: jest.fn(),
  findByPatientId: jest.fn(),
};

const mockRedisPublisher = {
  publish: jest.fn(),
};

function buildPrismaOrder(overrides: MutableRecord = {}) {
  return {
    id: 'lab_order_1',
    patientId: 'patient_1',
    encounterId: 'enc_1',
    orgId: ORG_ID,
    facilityId: FACILITY_ID,
    orderedBy: USER_ID,
    panelCode: 'CBC',
    notes: null,
    status: PrismaLabOrderStatus.PENDING,
    orderedAt: FIXED_DATE,
    resultedAt: null,
    createdAt: FIXED_DATE,
    updatedAt: FIXED_DATE,
    ...overrides,
  };
}

function buildLabResultDoc(overrides: MutableRecord = {}) {
  return {
    _id: '507f1f77bcf86cd799439011',
    order_id: 'lab_order_1',
    patient_id: 'patient_1',
    encounter_id: 'enc_1',
    panel_code: 'CBC',
    org_id: ORG_ID,
    facility_id: FACILITY_ID,
    components: [
      {
        name: 'WBC',
        value: 8.1,
        unit: 'x10^9/L',
        ref_range_low: 4,
        ref_range_high: 11,
        flag: 'normal',
      },
    ],
    freetext_note: 'Within normal range',
    resulted_by: USER_ID,
    resulted_at: FIXED_DATE,
    ...overrides,
  };
}

describe('LabService', () => {
  let service: LabService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EncountersService, useValue: mockEncountersService },
        { provide: LabResultRepository, useValue: mockLabResultRepository },
        { provide: RedisPublisherService, useValue: mockRedisPublisher },
      ],
    }).compile();

    service = module.get<LabService>(LabService);
    jest.clearAllMocks();
  });

  describe('placeOrder', () => {
    it('rejects when encounter is not in selected facility', async () => {
      mockEncountersService.getById.mockResolvedValue({
        facility_id: 'facility_other',
        patient_id: 'patient_1',
        status: 'in_progress',
      });

      await expect(
        service.placeOrder(ORG_ID, FACILITY_ID, USER_ID, {
          patientId: 'patient_1',
          encounterId: 'enc_1',
          panelCode: 'CBC',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects when patient does not match encounter', async () => {
      mockEncountersService.getById.mockResolvedValue({
        facility_id: FACILITY_ID,
        patient_id: 'patient_other',
        status: 'in_progress',
      });

      await expect(
        service.placeOrder(ORG_ID, FACILITY_ID, USER_ID, {
          patientId: 'patient_1',
          encounterId: 'enc_1',
          panelCode: 'CBC',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when encounter is locked', async () => {
      mockEncountersService.getById.mockResolvedValue({
        facility_id: FACILITY_ID,
        patient_id: 'patient_1',
        status: 'signed_off',
      });

      await expect(
        service.placeOrder(ORG_ID, FACILITY_ID, USER_ID, {
          patientId: 'patient_1',
          encounterId: 'enc_1',
          panelCode: 'CBC',
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('creates order and publishes lab.order.placed event', async () => {
      mockEncountersService.getById.mockResolvedValue({
        facility_id: FACILITY_ID,
        patient_id: 'patient_1',
        status: 'in_progress',
      });

      mockPrisma.labOrder.create.mockResolvedValue(buildPrismaOrder());

      const order = await service.placeOrder(ORG_ID, FACILITY_ID, USER_ID, {
        patientId: 'patient_1',
        encounterId: 'enc_1',
        panelCode: 'CBC',
        notes: 'STAT',
      });

      expect(mockPrisma.labOrder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orgId: ORG_ID,
          facilityId: FACILITY_ID,
          orderedBy: USER_ID,
          panelCode: 'CBC',
          status: PrismaLabOrderStatus.PENDING,
        }),
      });

      expect(mockRedisPublisher.publish).toHaveBeenCalledWith(
        'lab.order.placed',
        expect.objectContaining({
          order_id: 'lab_order_1',
          org_id: ORG_ID,
          facility_id: FACILITY_ID,
          patient_id: 'patient_1',
          encounter_id: 'enc_1',
        }),
      );

      expect(order.status).toBe('pending');
    });
  });

  describe('listOrders and getOrderById', () => {
    it('lists facility-scoped orders without requiring patient or encounter filter', async () => {
      mockPrisma.labOrder.findMany.mockResolvedValue([
        buildPrismaOrder({ id: 'order_1' }),
        buildPrismaOrder({ id: 'order_2', status: PrismaLabOrderStatus.COMPLETED }),
      ]);

      const orders = await service.listOrders(ORG_ID, FACILITY_ID, {});

      expect(mockPrisma.labOrder.findMany).toHaveBeenCalledWith({
        where: {
          orgId: ORG_ID,
          facilityId: FACILITY_ID,
          patientId: undefined,
          encounterId: undefined,
          status: undefined,
        },
        orderBy: { orderedAt: 'desc' },
        take: 100,
      });
      expect(orders).toHaveLength(2);
    });

    it('applies status filter when provided', async () => {
      mockPrisma.labOrder.findMany.mockResolvedValue([
        buildPrismaOrder({ id: 'order_completed', status: PrismaLabOrderStatus.COMPLETED }),
      ]);

      await service.listOrders(ORG_ID, FACILITY_ID, { status: 'completed' });

      expect(mockPrisma.labOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PrismaLabOrderStatus.COMPLETED,
          }),
        }),
      );
    });

    it('returns tenant-scoped order by id', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(buildPrismaOrder({ id: 'order_42' }));

      const order = await service.getOrderById(ORG_ID, FACILITY_ID, 'order_42');

      expect(mockPrisma.labOrder.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'order_42',
          orgId: ORG_ID,
          facilityId: FACILITY_ID,
        },
      });
      expect(order.id).toBe('order_42');
    });

    it('throws when tenant-scoped order is not found', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(null);

      await expect(service.getOrderById(ORG_ID, FACILITY_ID, 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('allows pending -> collected transition', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.PENDING }),
      );
      mockPrisma.labOrder.update.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.COLLECTED }),
      );

      const order = await service.updateStatus(ORG_ID, FACILITY_ID, 'lab_order_1', 'collected');

      expect(mockPrisma.labOrder.update).toHaveBeenCalledWith({
        where: { id: 'lab_order_1' },
        data: {
          status: PrismaLabOrderStatus.COLLECTED,
          resultedAt: null,
        },
      });
      expect(order.status).toBe('collected');
    });

    it('allows collected -> in_progress transition', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.COLLECTED }),
      );
      mockPrisma.labOrder.update.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.IN_PROGRESS }),
      );

      const order = await service.updateStatus(ORG_ID, FACILITY_ID, 'lab_order_1', 'in_progress');

      expect(order.status).toBe('in_progress');
    });

    it('allows in_progress -> completed and stamps resultedAt', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.IN_PROGRESS, resultedAt: null }),
      );
      mockPrisma.labOrder.update.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.COMPLETED, resultedAt: FIXED_DATE }),
      );

      await service.updateStatus(ORG_ID, FACILITY_ID, 'lab_order_1', 'completed');

      expect(mockPrisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: PrismaLabOrderStatus.COMPLETED,
            resultedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('rejects invalid status transition', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.PENDING }),
      );

      await expect(
        service.updateStatus(ORG_ID, FACILITY_ID, 'lab_order_1', 'completed'),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrisma.labOrder.update).not.toHaveBeenCalled();
    });

    it('is idempotent when target status equals current status', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.COLLECTED }),
      );

      const order = await service.updateStatus(ORG_ID, FACILITY_ID, 'lab_order_1', 'collected');

      expect(mockPrisma.labOrder.update).not.toHaveBeenCalled();
      expect(order.status).toBe('collected');
    });
  });

  describe('recordResult and result retrieval', () => {
    it('rejects result recording for cancelled orders', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.CANCELLED }),
      );

      await expect(
        service.recordResult(ORG_ID, FACILITY_ID, 'lab_order_1', USER_ID, {
          components: [],
        }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('rejects when result already exists', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(buildPrismaOrder());
      mockLabResultRepository.findByOrderId.mockResolvedValue(buildLabResultDoc());

      await expect(
        service.recordResult(ORG_ID, FACILITY_ID, 'lab_order_1', USER_ID, {
          components: [],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('maps duplicate key errors to conflict exception', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(buildPrismaOrder());
      mockLabResultRepository.findByOrderId.mockResolvedValue(null);
      mockLabResultRepository.create.mockRejectedValue({ code: 11000 });

      await expect(
        service.recordResult(ORG_ID, FACILITY_ID, 'lab_order_1', USER_ID, {
          components: [],
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('records result, completes order, and publishes lab.result.ready', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.IN_PROGRESS }),
      );
      mockLabResultRepository.findByOrderId.mockResolvedValue(null);
      mockLabResultRepository.create.mockResolvedValue(buildLabResultDoc());
      mockPrisma.labOrder.update.mockResolvedValue(
        buildPrismaOrder({ status: PrismaLabOrderStatus.COMPLETED, resultedAt: FIXED_DATE }),
      );

      const result = await service.recordResult(ORG_ID, FACILITY_ID, 'lab_order_1', USER_ID, {
        components: [
          {
            name: 'WBC',
            value: 12.2,
            unit: 'x10^9/L',
            refRangeLow: 4,
            refRangeHigh: 11,
            flag: 'high',
          },
        ],
        freetextNote: 'Leukocytosis noted',
      });

      expect(mockLabResultRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          order_id: 'lab_order_1',
          patient_id: 'patient_1',
          panel_code: 'CBC',
          org_id: ORG_ID,
          facility_id: FACILITY_ID,
          resulted_by: USER_ID,
          components: [
            expect.objectContaining({
              name: 'WBC',
              value: 12.2,
              flag: 'high',
              ref_range_low: 4,
              ref_range_high: 11,
            }),
          ],
        }),
      );

      expect(mockPrisma.labOrder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'lab_order_1' },
          data: expect.objectContaining({
            status: PrismaLabOrderStatus.COMPLETED,
            resultedAt: expect.any(Date),
          }),
        }),
      );

      expect(mockRedisPublisher.publish).toHaveBeenCalledWith(
        'lab.result.ready',
        expect.objectContaining({
          order_id: 'lab_order_1',
          org_id: ORG_ID,
          facility_id: FACILITY_ID,
          patient_id: 'patient_1',
        }),
      );

      expect(result.orderId).toBe('lab_order_1');
      expect(result.components[0]?.flag).toBe('normal');
    });

    it('throws not found when order result document does not exist', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(buildPrismaOrder());
      mockLabResultRepository.findByOrderId.mockResolvedValue(null);

      await expect(service.getResult(ORG_ID, FACILITY_ID, 'lab_order_1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns mapped result for an order', async () => {
      mockPrisma.labOrder.findFirst.mockResolvedValue(buildPrismaOrder());
      mockLabResultRepository.findByOrderId.mockResolvedValue(
        buildLabResultDoc({
          components: [
            {
              name: 'Glucose',
              value: 132,
              unit: 'mg/dL',
              ref_range_low: 70,
              ref_range_high: 100,
              flag: 'high',
            },
          ],
        }),
      );

      const result = await service.getResult(ORG_ID, FACILITY_ID, 'lab_order_1');

      expect(result.components[0]).toMatchObject({
        name: 'Glucose',
        value: 132,
        refRangeLow: 70,
        refRangeHigh: 100,
        flag: 'high',
      });
    });

    it('returns only results linked to completed orders for patient', async () => {
      mockPrisma.labOrder.findMany.mockResolvedValue([{ id: 'order_a' }]);
      mockLabResultRepository.findByPatientId.mockResolvedValue([
        buildLabResultDoc({ order_id: 'order_a', panel_code: 'CBC' }),
        buildLabResultDoc({ order_id: 'order_b', panel_code: 'LFT' }),
      ]);

      const results = await service.getResultsForPatient(ORG_ID, FACILITY_ID, 'patient_1');

      expect(results).toHaveLength(1);
      expect(results[0]?.orderId).toBe('order_a');
    });

    it('returns empty array when patient has no completed orders', async () => {
      mockPrisma.labOrder.findMany.mockResolvedValue([]);

      const results = await service.getResultsForPatient(ORG_ID, FACILITY_ID, 'patient_1');

      expect(results).toEqual([]);
      expect(mockLabResultRepository.findByPatientId).not.toHaveBeenCalled();
    });
  });
});

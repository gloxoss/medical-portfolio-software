import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  LabOrder as PrismaLabOrder,
  LabOrderStatus as PrismaLabOrderStatus,
} from '@prisma/client';
import { Types } from 'mongoose';
import type {
  LabOrder,
  LabResult,
  LabStatus,
} from '@medicore/shared-types';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { LabResultRepository } from './lab-result.repository';
import { PlaceLabOrderDto, RecordLabResultDto } from './lab.dto';
import type { LabResultDocument } from './lab-result.schema';

const STATUS_TO_PRISMA: Record<LabStatus, PrismaLabOrderStatus> = {
  pending: PrismaLabOrderStatus.PENDING,
  collected: PrismaLabOrderStatus.COLLECTED,
  in_progress: PrismaLabOrderStatus.IN_PROGRESS,
  completed: PrismaLabOrderStatus.COMPLETED,
  cancelled: PrismaLabOrderStatus.CANCELLED,
};

const STATUS_FROM_PRISMA: Record<PrismaLabOrderStatus, LabStatus> = {
  PENDING: 'pending',
  COLLECTED: 'collected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

const STATUS_TRANSITIONS: Record<LabStatus, LabStatus[]> = {
  pending: ['collected', 'cancelled'],
  collected: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

@Injectable()
export class LabService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encountersService: EncountersService,
    private readonly labResultRepository: LabResultRepository,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async placeOrder(
    orgId: string,
    facilityId: string,
    orderedBy: string,
    dto: PlaceLabOrderDto,
  ): Promise<LabOrder> {
    const encounter = await this.encountersService.getById(orgId, dto.encounterId);

    if (encounter.facility_id !== facilityId) {
      throw new NotFoundException('Encounter not found in the selected facility');
    }

    if (encounter.patient_id !== dto.patientId) {
      throw new BadRequestException('Patient does not match encounter');
    }

    if (encounter.status === 'signed_off' || encounter.status === 'archived') {
      throw new UnprocessableEntityException('Cannot place lab orders on locked encounters');
    }

    const created = await this.prisma.labOrder.create({
      data: {
        patientId: dto.patientId,
        encounterId: dto.encounterId,
        orgId,
        facilityId,
        orderedBy,
        panelCode: dto.panelCode,
        notes: dto.notes,
        status: PrismaLabOrderStatus.PENDING,
      },
    });

    await this.redisPublisher.publish('lab.order.placed', {
      order_id: created.id,
      org_id: orgId,
      facility_id: facilityId,
      patient_id: created.patientId,
      encounter_id: created.encounterId,
      panel_code: created.panelCode,
      ordered_by: orderedBy,
    });

    return this.toLabOrder(created);
  }

  async listOrders(
    orgId: string,
    facilityId: string,
    query: { patientId?: string; encounterId?: string; status?: LabStatus },
  ): Promise<LabOrder[]> {
    const rows = await this.prisma.labOrder.findMany({
      where: {
        orgId,
        facilityId,
        patientId: query.patientId,
        encounterId: query.encounterId,
        status: query.status ? STATUS_TO_PRISMA[query.status] : undefined,
      },
      orderBy: { orderedAt: 'desc' },
      take: 100,
    });

    return rows.map((row) => this.toLabOrder(row));
  }

  async getOrderById(orgId: string, facilityId: string, orderId: string): Promise<LabOrder> {
    const order = await this.findTenantOrder(orgId, facilityId, orderId);
    return this.toLabOrder(order);
  }

  async updateStatus(
    orgId: string,
    facilityId: string,
    orderId: string,
    status: LabStatus,
  ): Promise<LabOrder> {
    const current = await this.findTenantOrder(orgId, facilityId, orderId);
    const currentStatus = STATUS_FROM_PRISMA[current.status];

    if (currentStatus === status) {
      return this.toLabOrder(current);
    }

    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Invalid status transition: ${currentStatus} -> ${status}`,
      );
    }

    const updated = await this.prisma.labOrder.update({
      where: { id: orderId },
      data: {
        status: STATUS_TO_PRISMA[status],
        resultedAt: status === 'completed' ? new Date() : current.resultedAt,
      },
    });

    return this.toLabOrder(updated);
  }

  async recordResult(
    orgId: string,
    facilityId: string,
    orderId: string,
    resultedBy: string,
    dto: RecordLabResultDto,
  ): Promise<LabResult> {
    const order = await this.findTenantOrder(orgId, facilityId, orderId);
    const currentStatus = STATUS_FROM_PRISMA[order.status];

    if (currentStatus === 'cancelled') {
      throw new UnprocessableEntityException('Cannot record a result for a cancelled order');
    }

    const existing = await this.labResultRepository.findByOrderId(orgId, orderId);
    if (existing) {
      throw new ConflictException('A result already exists for this order');
    }

    const now = new Date();

    let created: LabResultDocument;
    try {
      created = await this.labResultRepository.create({
        order_id: order.id,
        patient_id: order.patientId,
        encounter_id: order.encounterId,
        panel_code: order.panelCode,
        org_id: orgId,
        facility_id: facilityId,
        components: dto.components.map((component) => ({
          name: component.name,
          value: component.value,
          unit: component.unit,
          ref_range_low: component.refRangeLow,
          ref_range_high: component.refRangeHigh,
          flag: component.flag,
        })),
        freetext_note: dto.freetextNote,
        resulted_by: resultedBy,
        resulted_at: now,
      });
    } catch (error: unknown) {
      const duplicateError =
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as { code?: number }).code === 11000;

      if (duplicateError) {
        throw new ConflictException('A result already exists for this order');
      }

      throw error;
    }

    await this.prisma.labOrder.update({
      where: { id: order.id },
      data: {
        status: PrismaLabOrderStatus.COMPLETED,
        resultedAt: now,
      },
    });

    await this.redisPublisher.publish('lab.result.ready', {
      order_id: order.id,
      org_id: orgId,
      facility_id: facilityId,
      patient_id: order.patientId,
      encounter_id: order.encounterId,
      panel_code: order.panelCode,
      resulted_by: resultedBy,
      resulted_at: now.toISOString(),
    });

    return this.toLabResult(created);
  }

  async getResult(orgId: string, facilityId: string, orderId: string): Promise<LabResult> {
    await this.findTenantOrder(orgId, facilityId, orderId);

    const result = await this.labResultRepository.findByOrderId(orgId, orderId);
    if (!result) {
      throw new NotFoundException('Lab result not found');
    }

    return this.toLabResult(result);
  }

  async getResultsForPatient(
    orgId: string,
    facilityId: string | undefined,
    patientId: string,
  ): Promise<LabResult[]> {
    const completedOrders = await this.prisma.labOrder.findMany({
      where: {
        orgId,
        ...(facilityId ? { facilityId } : {}),
        patientId,
        status: PrismaLabOrderStatus.COMPLETED,
      },
      select: {
        id: true,
      },
    });

    if (completedOrders.length === 0) {
      return [];
    }

    const completedOrderIds = new Set(completedOrders.map((order) => order.id));
    const results = await this.labResultRepository.findByPatientId(orgId, patientId);

    return results
      .filter((result) => completedOrderIds.has(result.order_id))
      .map((result) => this.toLabResult(result));
  }

  private async findTenantOrder(
    orgId: string,
    facilityId: string,
    orderId: string,
  ): Promise<PrismaLabOrder> {
    const order = await this.prisma.labOrder.findFirst({
      where: {
        id: orderId,
        orgId,
        facilityId,
      },
    });

    if (!order) {
      throw new NotFoundException('Lab order not found');
    }

    return order;
  }

  private toLabOrder(order: PrismaLabOrder): LabOrder {
    return {
      id: order.id,
      patientId: order.patientId,
      encounterId: order.encounterId,
      orgId: order.orgId,
      facilityId: order.facilityId,
      orderedBy: order.orderedBy,
      panelCode: order.panelCode,
      status: STATUS_FROM_PRISMA[order.status],
      orderedAt: order.orderedAt.toISOString(),
      resultedAt: order.resultedAt?.toISOString() ?? null,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
    };
  }

  private toLabResult(doc: LabResultDocument): LabResult {
    return {
      id: this.asId(doc._id),
      orderId: doc.order_id,
      patientId: doc.patient_id,
      encounterId: doc.encounter_id,
      panelCode: doc.panel_code,
      components: doc.components.map((component) => ({
        name: component.name,
        value: component.value,
        unit: component.unit,
        refRangeLow: component.ref_range_low,
        refRangeHigh: component.ref_range_high,
        flag: component.flag,
      })),
      freetextNote: doc.freetext_note,
      resultedBy: doc.resulted_by,
      resultedAt: doc.resulted_at.toISOString(),
      orgId: doc.org_id,
      facilityId: doc.facility_id,
    };
  }

  private asId(value: unknown): string {
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }

    return String(value);
  }
}

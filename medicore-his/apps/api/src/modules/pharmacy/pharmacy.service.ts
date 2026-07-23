import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PurchaseOrderStatus } from '@prisma/client';
import { PatientsRepository } from '../patients/patients.repository';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { PharmacyRepository } from './pharmacy.repository';
import { PharmacyQueueRepository } from './pharmacy-queue.repository';
import { AdjustInventoryDto, InventoryAdjustmentType } from './dto/adjust-inventory.dto';
import { CreateDrugDto } from './dto/create-drug.dto';
import { ListDrugsDto } from './dto/list-drugs.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import {
  CreatePurchaseOrderDto,
  CreatePurchaseOrderItemDto,
  ReceivePurchaseOrderDto,
} from './dto/create-purchase-order.dto';
import { DispenseDto } from './dto/dispense.dto';

interface RxEventPayload {
  org_id?: string;
  orgId?: string;
  facility_id?: string;
  facilityId?: string;
  patient_id?: string;
  patientId?: string;
  encounter_id?: string;
  encounterId?: string;
  doctor_id?: string;
  doctorId?: string;
  prescription_id?: string;
  prescriptionId?: string;
  source_event?: string;
  drugs?: Array<{
    drug_id?: string;
    drug_name?: string;
    form?: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
  }>;
  prescriptions?: Array<{
    drug_name?: string;
    form?: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
  }>;
}

@Injectable()
export class PharmacyService {
  private readonly logger = new Logger(PharmacyService.name);

  constructor(
    private readonly repository: PharmacyRepository,
    private readonly queueRepository: PharmacyQueueRepository,
    private readonly patientsRepository: PatientsRepository,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  async listDrugs(orgId: string, query: ListDrugsDto) {
    return this.repository.listDrugs(orgId, query.search, query.category);
  }

  async createDrug(orgId: string, dto: CreateDrugDto) {
    return this.repository.createDrug(orgId, dto);
  }

  async listInventory(orgId: string, facilityId: string, lowStockOnly?: boolean, expiringSoon?: boolean) {
    if (!facilityId) {
      throw new BadRequestException('facility_id query parameter is required.');
    }

    return this.repository.listInventory(orgId, facilityId, lowStockOnly, expiringSoon);
  }

  async adjustInventory(orgId: string, dto: AdjustInventoryDto) {
    const drug = await this.repository.findDrugById(orgId, dto.drug_id);
    if (!drug) {
      throw new NotFoundException('Drug not found in this organisation.');
    }

    const isDecrement = dto.type === InventoryAdjustmentType.WRITE_OFF;

    if (isDecrement) {
      if (!dto.batch_number) {
        throw new BadRequestException('batch_number is required for WRITE_OFF adjustments.');
      }

      const existing = await this.repository.findInventoryBatch(
        orgId,
        dto.facility_id,
        dto.drug_id,
        dto.batch_number,
      );

      if (!existing) {
        throw new NotFoundException('Inventory batch not found.');
      }

      if (existing.quantity < dto.quantity) {
        throw new UnprocessableEntityException('Insufficient stock in selected batch.');
      }

      await this.repository.decrementBatchQuantity(existing.id, dto.quantity);
      const updated = await this.repository.findInventoryBatch(orgId, dto.facility_id, dto.drug_id, dto.batch_number);
      return updated;
    }

    if (!dto.batch_number || !dto.expiry_date || dto.unit_price === undefined) {
      throw new BadRequestException(
        'batch_number, expiry_date and unit_price are required for RECEIVE/RETURN/ADJUST operations.',
      );
    }

    return this.repository.upsertInventoryBatch({
      orgId,
      facilityId: dto.facility_id,
      drugId: dto.drug_id,
      batchNumber: dto.batch_number,
      expiryDate: new Date(dto.expiry_date),
      quantityDelta: dto.quantity,
      unitCost: dto.unit_cost,
      unitPrice: dto.unit_price,
      reorderLevel: dto.reorder_level,
    });
  }

  async enqueueFromEvent(payload: RxEventPayload, sourceEvent: string) {
    const orgId = payload.org_id ?? payload.orgId;
    const facilityId = payload.facility_id ?? payload.facilityId;
    const patientId = payload.patient_id ?? payload.patientId;
    const encounterId = payload.encounter_id ?? payload.encounterId;
    const prescriptionId =
      payload.prescription_id ?? payload.prescriptionId ?? payload.encounter_id ?? payload.encounterId;

    if (!orgId || !facilityId || !patientId || !encounterId || !prescriptionId) {
      this.logger.error('Invalid pharmacy rx event payload. Required identifiers are missing.');
      return null;
    }

    const rawDrugs = payload.drugs ?? payload.prescriptions ?? [];
    if (rawDrugs.length === 0) {
      this.logger.warn(`Ignored ${sourceEvent}: no prescription rows found.`);
      return null;
    }

    const queueItem = await this.queueRepository.upsertQueueItem({
      org_id: orgId,
      facility_id: facilityId,
      patient_id: patientId,
      encounter_id: encounterId,
      prescription_id: prescriptionId,
      doctor_id: payload.doctor_id ?? payload.doctorId,
      source_event: sourceEvent,
      drugs: rawDrugs.map((drug) => ({
        drug_id: (drug as { drug_id?: string }).drug_id,
        drug_name: drug.drug_name ?? 'Unknown Drug',
        form: drug.form,
        strength: drug.strength,
        dosage: drug.dosage,
        frequency: drug.frequency,
        duration: drug.duration,
        quantity: drug.quantity,
      })),
      allergy_warnings: [],
    });

    return queueItem;
  }

  async listQueue(orgId: string, facilityId: string, statuses?: string[]) {
    if (!facilityId) {
      throw new BadRequestException('facility_id query parameter is required.');
    }

    return this.queueRepository.findQueue(orgId, facilityId, statuses);
  }

  async dispense(orgId: string, dispensedBy: string, dto: DispenseDto) {
    if (dto.items.length === 0) {
      throw new BadRequestException('At least one dispense item is required.');
    }

    const queueItem = dto.prescription_id
      ? await this.queueRepository.findByPrescription(orgId, dto.prescription_id)
      : await this.queueRepository.findByEncounter(orgId, dto.encounter_id);

    if (!queueItem) {
      throw new NotFoundException('Prescription queue item not found.');
    }

    const allergyWarnings = await this.resolveAllergyWarnings(orgId, dto.patient_id, dto.items);

    const allocations: Array<{
      drugId: string;
      drugName: string;
      batchId: string;
      batchNumber: string;
      quantity: number;
      unitPrice: number;
      reorderLevel: number;
      facilityId: string;
    }> = [];

    for (const item of dto.items) {
      const drug = await this.repository.findDrugById(orgId, item.drug_id);
      if (!drug) {
        throw new NotFoundException(`Drug ${item.drug_id} not found in this organisation.`);
      }

      if (item.batch_number) {
        const batch = await this.repository.findInventoryBatch(orgId, dto.facility_id, item.drug_id, item.batch_number);
        if (!batch || batch.quantity < item.quantity) {
          throw new UnprocessableEntityException(
            `Insufficient stock for ${drug.name} in batch ${item.batch_number}.`,
          );
        }

        allocations.push({
          drugId: item.drug_id,
          drugName: item.drug_name ?? drug.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: item.quantity,
          unitPrice: Number(batch.unitPrice),
          reorderLevel: batch.reorderLevel,
          facilityId: batch.facilityId,
        });
        continue;
      }

      const batches = await this.repository.findFefoBatches(orgId, dto.facility_id, item.drug_id);
      let remaining = item.quantity;

      for (const batch of batches) {
        if (remaining <= 0) break;

        const take = Math.min(batch.quantity, remaining);
        remaining -= take;

        allocations.push({
          drugId: item.drug_id,
          drugName: item.drug_name ?? drug.name,
          batchId: batch.id,
          batchNumber: batch.batchNumber,
          quantity: take,
          unitPrice: Number(batch.unitPrice),
          reorderLevel: batch.reorderLevel,
          facilityId: batch.facilityId,
        });
      }

      if (remaining > 0) {
        throw new UnprocessableEntityException(`Insufficient stock for ${drug.name}.`);
      }
    }

    for (const allocation of allocations) {
      await this.repository.decrementBatchQuantity(allocation.batchId, allocation.quantity);
    }

    const dispensedItems = allocations.map((allocation) => ({
      drug_id: allocation.drugId,
      drug_name: allocation.drugName,
      batch_number: allocation.batchNumber,
      quantity: allocation.quantity,
      unit_price: allocation.unitPrice,
      line_total: allocation.quantity * allocation.unitPrice,
    }));

    await this.queueRepository.createDispensingLog({
      org_id: orgId,
      facility_id: dto.facility_id,
      patient_id: dto.patient_id,
      encounter_id: dto.encounter_id,
      prescription_id: queueItem.prescription_id,
      dispensed_by: dispensedBy,
      allergy_warnings: allergyWarnings,
      items: dispensedItems,
    });

    await this.queueRepository.markCompleted(orgId, queueItem.prescription_id);

    await this.redisPublisher.publish('pharmacy.dispensed', {
      org_id: orgId,
      facility_id: dto.facility_id,
      patient_id: dto.patient_id,
      encounter_id: dto.encounter_id,
      prescription_id: queueItem.prescription_id,
      dispensed_by: dispensedBy,
      dispensed_items: dispensedItems,
      allergy_warnings: allergyWarnings,
      dispensed_at: new Date().toISOString(),
    });

    for (const allocation of allocations) {
      const currentQty = await this.repository.getTotalDrugQuantity(
        orgId,
        allocation.facilityId,
        allocation.drugId,
      );

      if (allocation.reorderLevel > 0 && currentQty <= allocation.reorderLevel) {
        await this.redisPublisher.publish('pharmacy.stock.low', {
          org_id: orgId,
          facility_id: allocation.facilityId,
          drug_id: allocation.drugId,
          drug_name: allocation.drugName,
          current_qty: currentQty,
          reorder_level: allocation.reorderLevel,
        });
      }
    }

    return {
      success: true,
      prescription_id: queueItem.prescription_id,
      dispensed_items: dispensedItems,
      allergy_warnings: allergyWarnings,
    };
  }

  async listSuppliers(orgId: string) {
    return this.repository.listSuppliers(orgId);
  }

  async createSupplier(orgId: string, dto: CreateSupplierDto) {
    return this.repository.createSupplier(orgId, dto);
  }

  async listPurchaseOrders(orgId: string) {
    return this.repository.listPurchaseOrders(orgId);
  }

  async createPurchaseOrder(orgId: string, userId: string, dto: CreatePurchaseOrderDto) {
    return this.repository.createPurchaseOrder(orgId, userId, dto);
  }

  async approvePurchaseOrder(orgId: string, userId: string, purchaseOrderId: string) {
    const po = await this.repository.findPurchaseOrder(orgId, purchaseOrderId);
    if (!po) throw new NotFoundException('Purchase order not found.');

    if (po.status !== PurchaseOrderStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED purchase orders can be approved.');
    }

    return this.repository.updatePurchaseOrderStatus(orgId, purchaseOrderId, PurchaseOrderStatus.APPROVED, userId);
  }

  async receivePurchaseOrder(
    orgId: string,
    userId: string,
    purchaseOrderId: string,
    dto: ReceivePurchaseOrderDto,
  ) {
    const po = await this.repository.findPurchaseOrder(orgId, purchaseOrderId);
    if (!po) throw new NotFoundException('Purchase order not found.');

    if (po.status !== PurchaseOrderStatus.APPROVED) {
      throw new BadRequestException('Only APPROVED purchase orders can be received.');
    }

    const items: CreatePurchaseOrderItemDto[] =
      dto.items && dto.items.length > 0
        ? dto.items
        : po.items.map((item) => ({
            drug_id: item.drugId,
            quantity: item.quantity,
            unit_cost: Number(item.unitCost),
          }));

    for (const item of items) {
      if (!item.batch_number || !item.expiry_date) {
        throw new BadRequestException(
          'Receiving stock requires batch_number and expiry_date for each item.',
        );
      }

      await this.repository.upsertInventoryBatch({
        orgId,
        facilityId: po.facilityId,
        drugId: item.drug_id,
        batchNumber: item.batch_number,
        expiryDate: new Date(item.expiry_date),
        quantityDelta: item.quantity,
        unitCost: item.unit_cost,
        unitPrice: item.unit_price ?? item.unit_cost,
        reorderLevel: item.reorder_level,
      });
    }

    return this.repository.updatePurchaseOrderStatus(orgId, purchaseOrderId, PurchaseOrderStatus.RECEIVED, userId);
  }

  private async resolveAllergyWarnings(
    orgId: string,
    patientId: string,
    items: Array<{ drug_id: string; drug_name?: string }>,
  ): Promise<string[]> {
    const patient = await this.patientsRepository.findById(orgId, patientId);
    if (!patient || !patient.allergies || patient.allergies.length === 0) return [];

    const warnings: string[] = [];

    for (const item of items) {
      const drug = await this.repository.findDrugById(orgId, item.drug_id);
      if (!drug) continue;

      const label = (item.drug_name ?? drug.name).toLowerCase();
      for (const allergy of patient.allergies) {
        const substance = allergy.substance.toLowerCase();
        if (label.includes(substance) || substance.includes(label)) {
          warnings.push(`Potential allergy match: ${drug.name} vs ${allergy.substance}`);
        }
      }
    }

    return warnings;
  }
}

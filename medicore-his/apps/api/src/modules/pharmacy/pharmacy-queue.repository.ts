import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  PharmacyQueueItem,
  PharmacyQueueItemDocument,
} from './schemas/pharmacy-queue-item.schema';
import { DispensingLog, DispensingLogDocument } from './schemas/dispensing-log.schema';

interface QueueCreateInput {
  org_id: string;
  facility_id: string;
  patient_id: string;
  encounter_id: string;
  prescription_id: string;
  doctor_id?: string;
  source_event?: string;
  drugs: Array<{
    drug_id?: string;
    drug_name: string;
    form?: string;
    strength?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
  }>;
  allergy_warnings?: string[];
}

@Injectable()
export class PharmacyQueueRepository {
  constructor(
    @InjectModel(PharmacyQueueItem.name)
    private readonly queueModel: Model<PharmacyQueueItemDocument>,
    @InjectModel(DispensingLog.name)
    private readonly dispensingLogModel: Model<DispensingLogDocument>,
  ) {}

  async upsertQueueItem(input: QueueCreateInput) {
    return this.queueModel.findOneAndUpdate(
      { org_id: input.org_id, prescription_id: input.prescription_id },
      {
        $setOnInsert: {
          org_id: input.org_id,
          facility_id: input.facility_id,
          patient_id: input.patient_id,
          encounter_id: input.encounter_id,
          prescription_id: input.prescription_id,
          doctor_id: input.doctor_id,
          source_event: input.source_event,
          drugs: input.drugs,
          allergy_warnings: input.allergy_warnings ?? [],
          status: 'pending',
        },
      },
      { new: true, upsert: true },
    ).lean();
  }

  async findQueue(orgId: string, facilityId: string, statuses?: string[]) {
    const where = {
      org_id: orgId,
      facility_id: facilityId,
      ...(statuses && statuses.length > 0 ? { status: { $in: statuses } } : {}),
    };

    return this.queueModel.find(where).sort({ createdAt: -1 }).lean();
  }

  async findByPrescription(orgId: string, prescriptionId: string) {
    return this.queueModel.findOne({ org_id: orgId, prescription_id: prescriptionId }).lean();
  }

  async findByEncounter(orgId: string, encounterId: string) {
    return this.queueModel.findOne({ org_id: orgId, encounter_id: encounterId }).sort({ createdAt: -1 }).lean();
  }

  async markCompleted(orgId: string, prescriptionId: string) {
    return this.queueModel.findOneAndUpdate(
      { org_id: orgId, prescription_id: prescriptionId },
      { $set: { status: 'completed' } },
      { new: true },
    ).lean();
  }

  async createDispensingLog(payload: {
    org_id: string;
    facility_id: string;
    patient_id: string;
    encounter_id: string;
    prescription_id: string;
    dispensed_by: string;
    allergy_warnings: string[];
    items: Array<{
      drug_id: string;
      drug_name: string;
      batch_number: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }) {
    const created = new this.dispensingLogModel({
      ...payload,
      status: 'completed',
    });

    return created.save();
  }
}

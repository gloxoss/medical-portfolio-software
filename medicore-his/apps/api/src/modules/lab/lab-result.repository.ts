import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LabResultRecord,
  LabResultDocument,
} from './lab-result.schema';

type CreateLabResultInput = {
  order_id: string;
  patient_id: string;
  encounter_id?: string;
  panel_code: string;
  org_id: string;
  facility_id: string;
  components: Array<{
    name: string;
    value: number | string;
    unit: string;
    ref_range_low?: number;
    ref_range_high?: number;
    flag: 'normal' | 'low' | 'high' | 'critical';
  }>;
  freetext_note?: string;
  resulted_by: string;
  resulted_at: Date;
};

@Injectable()
export class LabResultRepository {
  constructor(
    @InjectModel(LabResultRecord.name)
    private readonly model: Model<LabResultDocument>,
  ) {}

  async create(input: CreateLabResultInput): Promise<LabResultDocument> {
    const created = new this.model(input);
    return created.save();
  }

  async findByOrderId(orgId: string, orderId: string): Promise<LabResultDocument | null> {
    return this.model.findOne({ org_id: orgId, order_id: orderId }).exec();
  }

  async findByPatientId(orgId: string, patientId: string): Promise<LabResultDocument[]> {
    return this.model
      .find({ org_id: orgId, patient_id: patientId })
      .sort({ resulted_at: -1 })
      .exec();
  }
}

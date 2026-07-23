import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Encounter, EncounterDocument, Diagnosis, Prescription, LabOrder } from './encounter.schema';

@Injectable()
export class EncountersRepository {
  constructor(
    @InjectModel(Encounter.name) private readonly model: Model<EncounterDocument>,
  ) {}

  async create(data: Partial<Encounter>): Promise<EncounterDocument> {
    const created = new this.model(data);
    return created.save();
  }

  async findById(orgId: string, id: string): Promise<EncounterDocument | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model.findOne({ _id: id, org_id: orgId }).exec();
  }

  async findByAppointmentId(orgId: string, appointmentId: string): Promise<EncounterDocument | null> {
    return this.model.findOne({ org_id: orgId, appointment_id: appointmentId }).exec();
  }

  async update(id: string, orgId: string, updateData: Record<string, unknown>): Promise<EncounterDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, org_id: orgId },
      { $set: updateData },
      { new: true },
    ).exec();
  }

  async pushDiagnosis(id: string, orgId: string, diagnosis: Diagnosis): Promise<EncounterDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, org_id: orgId },
      { $push: { diagnoses: diagnosis } },
      { new: true },
    ).exec();
  }

  async pullDiagnosisByCode(id: string, orgId: string, code: string): Promise<EncounterDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, org_id: orgId },
      { $pull: { diagnoses: { code } } },
      { new: true },
    ).exec();
  }

  async pushPrescription(id: string, orgId: string, prescription: Prescription): Promise<EncounterDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, org_id: orgId },
      { $push: { prescriptions: prescription } },
      { new: true },
    ).exec();
  }

  async pushLabOrder(id: string, orgId: string, labOrder: LabOrder): Promise<EncounterDocument | null> {
    return this.model.findOneAndUpdate(
      { _id: id, org_id: orgId },
      { $push: { lab_orders: labOrder } },
      { new: true },
    ).exec();
  }

  async findByPatient(
    orgId: string,
    patientId: string,
    page: number,
    limit: number,
  ): Promise<{ data: EncounterDocument[]; total: number }> {
    const filter = { org_id: orgId, patient_id: patientId };
    const [data, total] = await Promise.all([
      this.model.find(filter)
        .sort({ visit_date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);
    return { data, total };
  }
}

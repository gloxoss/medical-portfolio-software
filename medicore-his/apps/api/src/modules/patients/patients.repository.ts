import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Patient, PatientDocument_, Allergy } from './schemas/patient.schema';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';

@Injectable()
export class PatientsRepository {
  constructor(
    @InjectModel(Patient.name)
    private readonly model: Model<PatientDocument_>,
    private readonly prisma: PrismaService,
  ) {}

  // ─── MRN generation ────────────────────────────────────────────────────────
  // Uses an atomic PostgreSQL increment to guarantee uniqueness even under
  // concurrent registrations. Two receptionists registering at the same
  // millisecond get sequential, never duplicate MRNs.
  async generateMrn(orgId: string): Promise<string> {
    const org = await this.prisma.organization.update({
      where: { id: orgId },
      data: { mrnCounter: { increment: 1 } },
      select: { mrnPrefix: true, mrnCounter: true },
    });

    const year = new Date().getFullYear();
    const seq = String(org.mrnCounter).padStart(5, '0');
    return `${org.mrnPrefix}-${year}-${seq}`;
  }

  // ─── Create ────────────────────────────────────────────────────────────────
  async create(orgId: string, dto: CreatePatientDto): Promise<PatientDocument_> {
    const mrn = await this.generateMrn(orgId);

    const display = `${dto.name_first} ${dto.name_last}`.trim();

    return this.model.create({
      org_id: orgId,
      mrn,
      name: { first: dto.name_first, last: dto.name_last, display },
      dob: dto.dob ? new Date(dto.dob) : undefined,
      gender: dto.gender ?? 'unknown',
      blood_type: dto.blood_type,
      phone: dto.phone,
      email: dto.email,
      national_id: dto.national_id,
      address: dto.address
        ? {
            line1: dto.address.line1,
            city: dto.address.city,
            country: dto.address.country,
          }
        : undefined,
      emergency_contact: dto.emergency_contact,
      status: 'active',
    });
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  // Full-text search using MongoDB text index. Scoped to org always.
  async search(
    orgId: string,
    q: string | undefined,
    page: number,
    limit: number,
  ): Promise<{ data: PatientDocument_[]; total: number }> {
    const filter: Record<string, any> = {
      org_id: orgId,
      status: 'active',
    };
    if (q) {
      filter.$text = { $search: q };
    }

    const [data, total] = await Promise.all([
      this.model
        .find(filter, q ? { score: { $meta: 'textScore' } } : undefined)
        .sort(q ? { score: { $meta: 'textScore' } } as any : { _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return { data: data as unknown as PatientDocument_[], total };
  }

  // ─── Find by ID ────────────────────────────────────────────────────────────
  // Always scopes to orgId — cross-org access returns null, not the patient.
  async findById(orgId: string, id: string): Promise<PatientDocument_ | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({ _id: id, org_id: orgId })
      .lean()
      .exec() as Promise<PatientDocument_ | null>;
  }

  // ─── Find by phone within org ──────────────────────────────────────────────
  async findByPhone(orgId: string, phone: string): Promise<PatientDocument_ | null> {
    return this.model.findOne({ org_id: orgId, phone }).lean().exec() as Promise<PatientDocument_ | null>;
  }

  // ─── Add allergy ──────────────────────────────────────────────────────────
  async addAllergy(
    orgId: string,
    patientId: string,
    allergy: Omit<Allergy, 'recorded_at'>,
  ): Promise<PatientDocument_ | null> {
    if (!Types.ObjectId.isValid(patientId)) return null;

    return this.model
      .findOneAndUpdate(
        { _id: patientId, org_id: orgId },
        {
          $push: {
            allergies: {
              ...allergy,
              substance_normalized: allergy.substance.toLowerCase(),
              recorded_at: new Date(),
            },
          },
        },
        { new: true },
      )
      .lean()
      .exec() as Promise<PatientDocument_ | null>;
  }
}

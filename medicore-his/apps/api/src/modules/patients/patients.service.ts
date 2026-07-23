import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PatientsRepository } from './patients.repository';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { AddAllergyDto } from './dto/add-allergy.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(
    private readonly repo: PatientsRepository,
    private readonly events: RedisPublisherService,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────
  async register(orgId: string, dto: CreatePatientDto): Promise<unknown> {
    // Warn on duplicate phone — same family often shares a phone in Morocco.
    // This is a soft warning, not a blocker (per spec).
    const duplicate = await this.repo.findByPhone(orgId, dto.phone);
    const warnings: string[] = duplicate ? ['DUPLICATE_PHONE'] : [];

    const patient = await this.repo.create(orgId, dto);

    this.events
      .publish('patient.created', { patientId: String(patient._id), mrn: patient.mrn, orgId })
      .catch((err: Error) =>
        this.logger.error('Failed to publish patient.created', err.message),
      );

    this.logger.log(`Registered patient MRN=${patient.mrn} org=${orgId}`);

    return { patient, warnings };
  }

  // ─── Search ────────────────────────────────────────────────────────────────
  async search(orgId: string, dto: SearchPatientsDto): Promise<unknown> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const { data, total } = await this.repo.search(orgId, dto.q, page, limit);

    return {
      data,
      total,
      page,
      total_pages: Math.ceil(total / limit),
    };
  }

  // ─── Get by ID ─────────────────────────────────────────────────────────────
  // Returns 404 for cross-org access — never reveals patient exists in another org.
  async getById(orgId: string, id: string): Promise<unknown> {
    const patient = await this.repo.findById(orgId, id);
    if (!patient) throw new NotFoundException('Patient not found');
    return patient;
  }

  // ─── Add Allergy ───────────────────────────────────────────────────────────
  async addAllergy(orgId: string, patientId: string, dto: AddAllergyDto): Promise<unknown> {
    const updated = await this.repo.addAllergy(orgId, patientId, {
      substance: dto.substance,
      substance_normalized: dto.substance.toLowerCase(),
      type: dto.type,
      reaction: dto.reaction,
      severity: dto.severity,
    });

    if (!updated) throw new NotFoundException('Patient not found');

    return updated;
  }
}

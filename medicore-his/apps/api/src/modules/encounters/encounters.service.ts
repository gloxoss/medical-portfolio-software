import {
  Injectable, NotFoundException, ConflictException,
  BadRequestException, UnprocessableEntityException, Logger,
} from '@nestjs/common';
import { EncountersRepository } from './encounters.repository';
import { PatientsRepository } from '../patients/patients.repository';
import {
  CreateEncounterDto, UpdateVitalsDto, UpdateSoapDto,
  AddDiagnosisDto, AddPrescriptionDto, AddLabOrderDto
} from './encounters.dto';
import { EncounterDocument } from './encounter.schema';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';

// Common drug families that cross-react with known allergies.
// This is a simplified lookup — a real system would use RxNorm or similar.
const DRUG_ALLERGY_MAP: Record<string, string[]> = {
  penicillin: ['amoxicillin', 'ampicillin', 'penicillin', 'augmentin', 'piperacillin'],
  amoxicillin: ['penicillin', 'amoxicillin', 'ampicillin', 'augmentin'],
  cephalosporin: ['ceftriaxone', 'cefuroxime', 'cephalexin', 'cefixime'],
  sulfonamide: ['sulfamethoxazole', 'trimethoprim-sulfamethoxazole', 'bactrim'],
  nsaid: ['ibuprofen', 'aspirin', 'naproxen', 'diclofenac', 'ketoprofen'],
  aspirin: ['aspirin', 'ibuprofen', 'naproxen', 'diclofenac'],
};

@Injectable()
export class EncountersService {
  private readonly logger = new Logger(EncountersService.name);

  constructor(
    private readonly repository: EncountersRepository,
    private readonly patientsRepo: PatientsRepository,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  // ── Create ──────────────────────────────────────────────────────────────────

  async create(orgId: string, facilityId: string, doctorId: string, dto: CreateEncounterDto) {
    // Enforce: one encounter per appointment
    if (dto.appointment_id) {
      const existing = await this.repository.findByAppointmentId(orgId, dto.appointment_id);
      if (existing) {
        throw new ConflictException('An encounter already exists for this appointment');
      }
    }

    return this.repository.create({
      org_id: orgId,
      facility_id: facilityId,
      doctor_id: doctorId,
      patient_id: dto.patient_id,
      appointment_id: dto.appointment_id,
      visit_date: new Date(dto.visit_date),
      status: 'in_progress',
    });
  }

  // ── Get By ID ───────────────────────────────────────────────────────────────

  async getById(orgId: string, id: string) {
    const encounter = await this.repository.findById(orgId, id);
    if (!encounter) throw new NotFoundException('Encounter not found');
    return encounter;
  }

  // Guard: signed-off encounters are immutable — all write operations call this first
  // B3-FIX: was `doc: any` — now EncounterDocument (what findById always returns)
  private ensureModifiable(doc: EncounterDocument) {
    if (doc.status === 'signed_off') {
      throw new UnprocessableEntityException('Cannot modify signed-off encounter');
    }
  }

  // ── Vitals (partial update) ─────────────────────────────────────────────────

  async updateVitals(orgId: string, id: string, vitals: UpdateVitalsDto) {
    const doc = await this.getById(orgId, id);
    this.ensureModifiable(doc);
    const existing = doc.vitals ? JSON.parse(JSON.stringify(doc.vitals)) : {};
    return this.repository.update(id, orgId, {
      vitals: { ...existing, ...vitals },
    });
  }

  // ── SOAP (partial update — autosaved on blur) ───────────────────────────────

  async updateSoap(orgId: string, id: string, soap: UpdateSoapDto) {
    const doc = await this.getById(orgId, id);
    this.ensureModifiable(doc);
    const existing = doc.soap ? JSON.parse(JSON.stringify(doc.soap)) : {};
    return this.repository.update(id, orgId, {
      soap: { ...existing, ...soap },
      last_autosaved_at: new Date(),
    });
  }

  // ── Add Diagnosis ───────────────────────────────────────────────────────────

  async addDiagnosis(orgId: string, id: string, dto: AddDiagnosisDto) {
    const doc = await this.getById(orgId, id);
    this.ensureModifiable(doc);
    return this.repository.pushDiagnosis(id, orgId, {
      code: dto.code,
      description: dto.description,
      type: dto.type,
    });
  }

  async removeDiagnosis(orgId: string, id: string, code: string) {
    const doc = await this.getById(orgId, id);
    this.ensureModifiable(doc);

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      throw new BadRequestException('Diagnosis code is required');
    }

    const matchedDiagnosis = doc.diagnoses.find(
      (diagnosis) => diagnosis.code.toUpperCase() === normalizedCode,
    );

    if (!matchedDiagnosis) {
      throw new NotFoundException('Diagnosis not found in encounter');
    }

    const updated = await this.repository.pullDiagnosisByCode(
      id,
      orgId,
      matchedDiagnosis.code,
    );

    if (!updated) {
      throw new NotFoundException('Encounter not found');
    }

    return updated;
  }

  // ── Add Prescription (with allergy cross-check) ─────────────────────────────

  async addPrescription(orgId: string, id: string, dto: AddPrescriptionDto) {
    const doc = await this.getById(orgId, id);
    this.ensureModifiable(doc);

    // Look up patient's allergies
    const patient = await this.patientsRepo.findById(orgId, doc.patient_id);
    if (patient && patient.allergies?.length > 0) {
      const drugNorm = dto.drug_name.toLowerCase();

      for (const allergy of patient.allergies) {
        const allergyNorm = allergy.substance_normalized ?? allergy.substance.toLowerCase();

        // Direct match
        if (drugNorm.includes(allergyNorm) || allergyNorm.includes(drugNorm)) {
          if (!dto.allergy_override) {
            throw new UnprocessableEntityException({
              message: `Allergy warning: ${dto.drug_name} may cross-react with known allergy to ${allergy.substance}`,
              allergy: {
                substance: allergy.substance,
                type: allergy.type,
                severity: allergy.severity,
                reaction: allergy.reaction,
              },
              action: 'Set allergy_override: true to prescribe anyway',
            });
          }
          this.logger.warn(
            `Allergy override: ${dto.drug_name} prescribed despite allergy to ${allergy.substance} (encounter ${id})`,
          );
        }

        // Cross-reactivity check via drug family map
        const familyDrugs = DRUG_ALLERGY_MAP[allergyNorm] ?? [];
        if (familyDrugs.some((d) => drugNorm.includes(d))) {
          if (!dto.allergy_override) {
            throw new UnprocessableEntityException({
              message: `Allergy warning: ${dto.drug_name} belongs to the same drug family as ${allergy.substance}`,
              allergy: {
                substance: allergy.substance,
                type: allergy.type,
                severity: allergy.severity,
                reaction: allergy.reaction,
              },
              action: 'Set allergy_override: true to prescribe anyway',
            });
          }
        }
      }
    }

    return this.repository.pushPrescription(id, orgId, {
      drug_name: dto.drug_name,
      form: dto.form,
      strength: dto.strength,
      dosage: dto.dosage,
      frequency: dto.frequency,
      duration: dto.duration,
      notes: dto.notes,
      allergy_override: dto.allergy_override ?? false,
      prescribed_at: new Date(),
    });
  }

  // ── Add Lab Order ───────────────────────────────────────────────────────────

  async addLabOrder(orgId: string, id: string, dto: AddLabOrderDto) {
    const doc = await this.getById(orgId, id);
    this.ensureModifiable(doc);

    const updated = await this.repository.pushLabOrder(id, orgId, {
      test_code: dto.test_code,
      test_name: dto.test_name,
      notes: dto.notes,
      status: 'ordered',
      ordered_at: new Date(),
    });

    await this.redisPublisher.publish('encounter.lab_ordered', {
      encounter_id: id,
      org_id: orgId,
      facility_id: doc.facility_id,
      patient_id: doc.patient_id,
      test_code: dto.test_code,
    });

    this.logger.log(`Lab order ${dto.test_code} added to encounter ${id}`);
    return updated;
  }

  // ── Sign-Off ────────────────────────────────────────────────────────────────

  async signOff(orgId: string, doctorId: string, id: string) {
    const doc = await this.getById(orgId, id);

    if (doc.status === 'signed_off') {
      throw new ConflictException('Already signed off');
    }

    // Prevent non-assigned doctor from signing off
    if (doc.doctor_id !== doctorId) {
      throw new BadRequestException('Only the assigned doctor can sign off');
    }

    // Validate: Assessment must be non-empty
    if (!doc.soap?.assessment || doc.soap.assessment.trim().length === 0) {
      throw new UnprocessableEntityException(
        'Cannot sign off: Assessment field is required',
      );
    }

    const updated = await this.repository.update(id, orgId, {
      status: 'signed_off',
      signed_off_at: new Date(),
      signed_off_by: doctorId,
    });

    await this.redisPublisher.publish('encounter.signed_off', {
      encounter_id: id,
      org_id: orgId,
      facility_id: doc.facility_id,
      patient_id: doc.patient_id,
      doctor_id: doctorId,
    });

    if (doc.prescriptions && doc.prescriptions.length > 0) {
      await this.redisPublisher.publish('pharmacy.rx.received', {
        org_id: orgId,
        facility_id: doc.facility_id,
        patient_id: doc.patient_id,
        encounter_id: id,
        doctor_id: doctorId,
        prescription_id: id,
        drugs: doc.prescriptions.map((prescription) => ({
          drug_name: prescription.drug_name,
          form: prescription.form,
          strength: prescription.strength,
          dosage: prescription.dosage,
          frequency: prescription.frequency,
          duration: prescription.duration,
        })),
      });
    }

    this.logger.log(`Encounter ${id} signed off by ${doctorId}`);
    return updated;
  }

  // ── Encounter History (paginated) ───────────────────────────────────────────

  async getPatientEncounters(orgId: string, patientId: string, page = 1, limit = 20) {
    return this.repository.findByPatient(orgId, patientId, page, limit);
  }
}

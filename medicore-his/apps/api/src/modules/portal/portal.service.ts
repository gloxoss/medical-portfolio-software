import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bullmq';
import {
  PatientConsentType,
  PortalPrivacyRequestStatus,
  PortalPrivacyRequestType,
} from '@prisma/client';
import { Queue } from 'bullmq';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { EncountersService } from '../encounters/encounters.service';
import { Appointment, AppointmentDocument } from '../scheduling/schemas/appointment.schema';
import { SchedulingService } from '../scheduling/scheduling.service';
import { BillingService } from '../billing/billing.service';
import type {
  PatientPortalUser,
  PortalAppointment,
  PortalAvailabilitySlot,
  PortalDoctorOption,
  PortalFacilityOption,
  PortalInvoice,
  PortalEncounter,
  LabResult,
} from '@medicore/shared-types';
import { Patient, PatientDocument_ } from '../patients/schemas/patient.schema';
import { LabService } from '../lab/lab.service';

const PORTAL_TERMS_CONSENT: PatientConsentType = 'PORTAL_TERMS';
const AI_AMBIENT_AUDIO_CONSENT: PatientConsentType = 'AI_AMBIENT_AUDIO';

const ACTIVE_PRIVACY_REQUEST_STATUSES: PortalPrivacyRequestStatus[] = [
  'QUEUED',
  'PROCESSING',
];

const PRIVACY_REQUEST_MESSAGES: Record<PortalPrivacyRequestType, string> = {
  DATA_EXPORT: 'Export queued — download link sent via email within 24h',
  ACCOUNT_DELETION: 'Deletion request queued — requires admin confirmation',
};

type PortalConsentStatus = {
  required: true;
  accepted: boolean;
  consentType: 'portal_terms';
  grantedAt: string | null;
};

type PortalConsentAccepted = {
  accepted: true;
  consentType: 'portal_terms';
  grantedAt: string;
};

type InternalConsentStatus = {
  patient_id: string;
  org_id: string;
  consent_type: 'ai_ambient_audio';
  granted: boolean;
  granted_at: string | null;
  revoked_at: string | null;
};

type PortalStripeCheckoutSession = {
  sessionId: string;
  checkoutUrl: string;
};

type PortalStripeCheckoutConfirmation = {
  status: 'paid' | 'already_paid';
  invoice: PortalInvoice | null;
};

type PortalInvoiceReceipt = {
  fileName: string;
  pdf: Buffer;
};

type PortalAppointmentCancellation = {
  appointment: PortalAppointment;
};

type PortalAppointmentBooking = {
  appointment: PortalAppointment;
};

type PortalAppointmentReschedule = {
  appointment: PortalAppointment;
};

type PortalSettings = {
  sms_notifications: boolean;
  email_notifications: boolean;
  ai_consent: boolean;
};

type PortalSettingsUpdateInput = {
  sms_notifications?: boolean;
  email_notifications?: boolean;
  ai_consent?: boolean;
};

type PortalSettingsAuditMetadata = {
  ipAddress?: string;
  userAgent?: string;
};

type PortalPrivacyRequestAccepted = {
  status: 'queued';
  request_id: string;
  request_type: 'data_export' | 'delete_account';
  message: string;
};

type PortalBookAppointmentInput = {
  doctorId: string;
  facilityId: string;
  startTime: string;
  type?: 'consultation' | 'followup' | 'emergency' | 'telemedicine';
  notes?: string;
};

const RESCHEDULE_LOCK_WINDOW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PortalService {
  private readonly logger = new Logger(PortalService.name);

  constructor(
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument_>,
    @InjectModel(Appointment.name) private readonly appointmentModel: Model<AppointmentDocument>,
    private readonly prisma: PrismaService,
    private readonly encountersService: EncountersService,
    private readonly labService: LabService,
    private readonly billingService: BillingService,
    private readonly schedulingService: SchedulingService,
    @InjectQueue('portal_privacy_requests') private readonly portalPrivacyQueue: Queue,
  ) {}

  private toPortalAppointment(appt: {
    _id: Types.ObjectId | string;
    facility_id: string;
    doctor_id: string;
    start_time: Date | string;
    end_time: Date | string;
    type?: string;
    status: string;
    notes?: string;
  },
  names?: {
    facilityName?: string;
    doctorName?: string;
  }): PortalAppointment {
    return {
      id: appt._id instanceof Types.ObjectId ? appt._id.toString() : String(appt._id),
      facilityId: appt.facility_id,
      facilityName: names?.facilityName ?? appt.facility_id,
      doctorId: appt.doctor_id,
      doctorName: names?.doctorName ?? appt.doctor_id,
      startsAt: appt.start_time instanceof Date
        ? appt.start_time.toISOString()
        : String(appt.start_time),
      endsAt: appt.end_time instanceof Date
        ? appt.end_time.toISOString()
        : String(appt.end_time),
      type: appt.type,
      status: appt.status,
      notes: appt.notes,
    };
  }

  private toDoctorDisplayName(nameFirst: string, nameLast: string): string {
    const fullName = `${nameFirst} ${nameLast}`.trim();
    return fullName.length > 0 ? fullName : 'Unknown doctor';
  }

  private async loadFacilityNameMap(orgId: string, facilityIds: string[]): Promise<Map<string, string>> {
    const uniqueFacilityIds = Array.from(
      new Set(
        facilityIds
          .map((facilityId) => facilityId.trim())
          .filter((facilityId) => facilityId.length > 0),
      ),
    );

    if (uniqueFacilityIds.length === 0) {
      return new Map();
    }

    const facilities = await this.prisma.facility.findMany({
      where: {
        orgId,
        id: {
          in: uniqueFacilityIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    return new Map(facilities.map((facility) => [facility.id, facility.name]));
  }

  private async loadDoctorNameMap(orgId: string, doctorIds: string[]): Promise<Map<string, string>> {
    const uniqueDoctorIds = Array.from(
      new Set(
        doctorIds
          .map((doctorId) => doctorId.trim())
          .filter((doctorId) => doctorId.length > 0),
      ),
    );

    if (uniqueDoctorIds.length === 0) {
      return new Map();
    }

    const doctors = await this.prisma.user.findMany({
      where: {
        orgId,
        id: {
          in: uniqueDoctorIds,
        },
      },
      select: {
        id: true,
        nameFirst: true,
        nameLast: true,
      },
    });

    return new Map(
      doctors.map((doctor) => [doctor.id, this.toDoctorDisplayName(doctor.nameFirst, doctor.nameLast)]),
    );
  }

  private toPortalInvoice(inv: {
    id: string;
    invoiceNo: string;
    status: string;
    total: number | bigint | { toString(): string };
    subtotal: number | bigint | { toString(): string };
    taxAmount: number | bigint | { toString(): string };
    currency: string;
    createdAt: Date;
    paidAt: Date | null;
    items: Array<{
      id: string;
      description: string;
      quantity: number;
      unitPrice: number | bigint | { toString(): string };
      total: number | bigint | { toString(): string };
    }>;
  }): PortalInvoice {
    return {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      status: inv.status,
      total: Number(inv.total),
      subtotal: Number(inv.subtotal),
      taxAmount: Number(inv.taxAmount),
      currency: inv.currency,
      createdAt: inv.createdAt.toISOString(),
      paidAt: inv.paidAt?.toISOString(),
      items: inv.items.map((item) => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
    };
  }

  private normalizeReason(reason?: string): string | undefined {
    const trimmed = reason?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : undefined;
  }

  private toPortalPrivacyRequestTypeLabel(type: PortalPrivacyRequestType): 'data_export' | 'delete_account' {
    return type === 'DATA_EXPORT' ? 'data_export' : 'delete_account';
  }

  private toPortalPrivacyRequestAccepted(
    requestId: string,
    requestType: PortalPrivacyRequestType,
  ): PortalPrivacyRequestAccepted {
    return {
      status: 'queued',
      request_id: requestId,
      request_type: this.toPortalPrivacyRequestTypeLabel(requestType),
      message: PRIVACY_REQUEST_MESSAGES[requestType],
    };
  }

  private async updateAiConsent(
    patientId: string,
    orgId: string,
    granted: boolean,
    metadata: PortalSettingsAuditMetadata,
  ): Promise<void> {
    const existing = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_orgId_consentType: {
          patientId,
          orgId,
          consentType: AI_AMBIENT_AUDIO_CONSENT,
        },
      },
    });

    if (!existing && !granted) {
      return;
    }

    const now = new Date();

    if (existing) {
      await this.prisma.patientConsent.update({
        where: { id: existing.id },
        data: {
          granted,
          grantedAt: granted ? (existing.grantedAt ?? now) : existing.grantedAt,
          revokedAt: granted ? null : now,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });
      return;
    }

    await this.prisma.patientConsent.create({
      data: {
        patientId,
        orgId,
        consentType: AI_AMBIENT_AUDIO_CONSENT,
        granted,
        grantedAt: granted ? now : null,
        revokedAt: granted ? null : now,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
      },
    });
  }

  private async enqueuePortalPrivacyRequest(
    requestId: string,
    patientId: string,
    orgId: string,
    requestType: PortalPrivacyRequestType,
  ): Promise<void> {
    const jobName = requestType === 'DATA_EXPORT'
      ? 'portal.data_export.requested'
      : 'portal.account_deletion.requested';

    try {
      await this.portalPrivacyQueue.add(
        jobName,
        {
          requestId,
          patientId,
          orgId,
          requestType,
          requestedAt: new Date().toISOString(),
        },
        {
          attempts: 3,
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue portal privacy request ${requestId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async createPortalPrivacyRequest(
    patientId: string,
    orgId: string,
    requestType: PortalPrivacyRequestType,
    reason?: string,
  ): Promise<PortalPrivacyRequestAccepted> {
    const existing = await this.prisma.portalPrivacyRequest.findFirst({
      where: {
        patientId,
        orgId,
        requestType,
        status: {
          in: ACTIVE_PRIVACY_REQUEST_STATUSES,
        },
      },
      orderBy: { requestedAt: 'desc' },
    });

    if (existing) {
      return this.toPortalPrivacyRequestAccepted(existing.id, requestType);
    }

    const request = await this.prisma.portalPrivacyRequest.create({
      data: {
        patientId,
        orgId,
        requestType,
        status: 'QUEUED',
        reason: this.normalizeReason(reason),
      },
    });

    await this.enqueuePortalPrivacyRequest(request.id, patientId, orgId, requestType);

    return this.toPortalPrivacyRequestAccepted(request.id, requestType);
  }

  // ── Patient profile ───────────────────────────────────────────────────────

  async getMe(patientId: string, orgId: string): Promise<PatientPortalUser> {
    const patient = await this.patientModel
      .findOne({ _id: new Types.ObjectId(patientId), org_id: orgId })
      .lean()
      .exec();

    if (!patient) throw new NotFoundException('Patient not found');

    return {
      id: (patient._id as Types.ObjectId).toString(),
      mrn: patient.mrn,
      name: {
        first: patient.name.first,
        last: patient.name.last,
        display: patient.name.display,
      },
      phone: patient.phone,
      orgId: patient.org_id,
      email: patient.email,
      gender: patient.gender,
      dob: patient.dob?.toISOString(),
      bloodType: patient.blood_type,
      allergies: (patient.allergies ?? []).map((a) => ({
        substance: a.substance,
        type: a.type,
        severity: a.severity,
        reaction: a.reaction,
      })),
      problemList: (patient.problem_list ?? []).map((problem) => ({
        condition: problem.condition,
        icdCode: problem.icd_code,
        status: problem.status,
        onsetAt: (problem.onset_at ?? new Date()).toISOString(),
      })),
    };
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  private async ensurePortalPatientAccess(patientId: string, orgId: string): Promise<void> {
    if (!Types.ObjectId.isValid(patientId)) {
      throw new NotFoundException('Patient not found');
    }

    const patient = await this.patientModel
      .exists({ _id: new Types.ObjectId(patientId), org_id: orgId })
      .exec();

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }
  }

  async getBookableFacilities(
    patientId: string,
    orgId: string,
  ): Promise<PortalFacilityOption[]> {
    await this.ensurePortalPatientAccess(patientId, orgId);

    const facilities = await this.prisma.facility.findMany({
      where: {
        orgId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return facilities.map((facility) => ({
      id: facility.id,
      name: facility.name,
    }));
  }

  async getBookableDoctors(
    patientId: string,
    orgId: string,
    facilityId: string,
  ): Promise<PortalDoctorOption[]> {
    await this.ensurePortalPatientAccess(patientId, orgId);

    const facility = await this.prisma.facility.findFirst({
      where: {
        id: facilityId,
        orgId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    const roles = await this.prisma.userFacilityRole.findMany({
      where: {
        facilityId,
        role: 'DOCTOR',
        isActive: true,
      },
      include: {
        user: {
          select: {
            id: true,
            orgId: true,
            nameFirst: true,
            nameLast: true,
            doctorSpecialties: true,
          },
        },
      },
    });

    return roles
      .filter((role) => role.user.orgId === orgId)
      .map((role) => ({
        id: role.user.id,
        name: this.toDoctorDisplayName(role.user.nameFirst, role.user.nameLast),
        specialties: role.user.doctorSpecialties ?? [],
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }

  async getDoctorAvailabilityForPortal(
    patientId: string,
    orgId: string,
    facilityId: string,
    doctorId: string,
    date: string,
  ): Promise<PortalAvailabilitySlot[]> {
    await this.ensurePortalPatientAccess(patientId, orgId);

    const facility = await this.prisma.facility.findFirst({
      where: {
        id: facilityId,
        orgId,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    const doctorAssignment = await this.prisma.userFacilityRole.findFirst({
      where: {
        facilityId,
        userId: doctorId,
        role: 'DOCTOR',
        isActive: true,
      },
      include: {
        user: {
          select: {
            orgId: true,
          },
        },
      },
    });

    if (!doctorAssignment || doctorAssignment.user.orgId !== orgId) {
      throw new NotFoundException('Doctor not found for facility');
    }

    return this.schedulingService.getAvailability(orgId, doctorId, facilityId, date);
  }

  async getAppointments(patientId: string, orgId: string): Promise<PortalAppointment[]> {
    const appointments = await this.appointmentModel
      .find({ patient_id: patientId, org_id: orgId })
      .limit(50)
      .lean()
      .exec();

    const [facilityNameMap, doctorNameMap] = await Promise.all([
      this.loadFacilityNameMap(
        orgId,
        appointments.map((appointment) => appointment.facility_id),
      ),
      this.loadDoctorNameMap(
        orgId,
        appointments.map((appointment) => appointment.doctor_id),
      ),
    ]);

    const now = Date.now();

    return appointments
      .map((appt) => this.toPortalAppointment(appt, {
        facilityName: facilityNameMap.get(appt.facility_id),
        doctorName: doctorNameMap.get(appt.doctor_id),
      }))
      .sort((a, b) => {
        const aTs = Date.parse(a.startsAt);
        const bTs = Date.parse(b.startsAt);
        const aFuture = aTs >= now;
        const bFuture = bTs >= now;

        if (aFuture !== bFuture) {
          return aFuture ? -1 : 1;
        }

        return aFuture ? aTs - bTs : bTs - aTs;
      });
  }

  async bookAppointment(
    patientId: string,
    orgId: string,
    input: PortalBookAppointmentInput,
  ): Promise<PortalAppointmentBooking> {
    const startTime = new Date(input.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new BadRequestException('Invalid appointment start time');
    }

    if (startTime.getTime() <= Date.now()) {
      throw new BadRequestException('Appointments must be booked for a future time');
    }

    const created = await this.schedulingService.bookAppointment(orgId, {
      patient_id: patientId,
      doctor_id: input.doctorId,
      facility_id: input.facilityId,
      start_time: startTime.toISOString(),
      type: input.type,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
    });

    return {
      appointment: this.toPortalAppointment(created),
    };
  }

  async cancelAppointment(
    patientId: string,
    orgId: string,
    appointmentId: string,
    reason?: string,
  ): Promise<PortalAppointmentCancellation> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel
      .findOne({ _id: appointmentId, org_id: orgId, patient_id: patientId })
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.start_time.getTime() <= Date.now()) {
      throw new BadRequestException('Past appointments cannot be cancelled');
    }

    const status = appointment.status.toLowerCase();
    if (!['booked', 'confirmed'].includes(status)) {
      throw new BadRequestException(`Appointment cannot be cancelled from status '${appointment.status}'`);
    }

    const trimmedReason = reason?.trim();

    const updated = await this.schedulingService.updateStatus(
      orgId,
      appointmentId,
      'cancelled',
      `portal:patient:${patientId}`,
      trimmedReason ? { cancel_reason: trimmedReason } : undefined,
    );

    return {
      appointment: this.toPortalAppointment(updated),
    };
  }

  async rescheduleAppointment(
    patientId: string,
    orgId: string,
    appointmentId: string,
    newStartTimeISO: string,
    reason?: string,
  ): Promise<PortalAppointmentReschedule> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel
      .findOne({ _id: appointmentId, org_id: orgId, patient_id: patientId })
      .exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const now = Date.now();
    if (appointment.start_time.getTime() <= now) {
      throw new BadRequestException('Past appointments cannot be rescheduled');
    }

    if (appointment.start_time.getTime() - now <= RESCHEDULE_LOCK_WINDOW_MS) {
      throw new BadRequestException('Appointments within 24 hours cannot be rescheduled');
    }

    const status = appointment.status.toLowerCase();
    if (!['booked', 'confirmed'].includes(status)) {
      throw new BadRequestException(`Appointment cannot be rescheduled from status '${appointment.status}'`);
    }

    const newStartTime = new Date(newStartTimeISO);
    if (Number.isNaN(newStartTime.getTime())) {
      throw new BadRequestException('Invalid new appointment time');
    }

    if (newStartTime.getTime() <= now) {
      throw new BadRequestException('Cannot reschedule to a past date');
    }

    if (newStartTime.toISOString() === appointment.start_time.toISOString()) {
      throw new BadRequestException('New appointment time must be different from the current time');
    }

    const availabilityDate = newStartTime.toISOString().slice(0, 10);
    const availability = await this.schedulingService.getAvailability(
      orgId,
      appointment.doctor_id,
      appointment.facility_id,
      availabilityDate,
    );

    const matchedSlot = availability.find((slot) => slot.start_time === newStartTime.toISOString());
    if (!matchedSlot) {
      throw new BadRequestException('Requested time is outside available schedule slots');
    }

    if (!matchedSlot.available) {
      throw new ConflictException('Doctor is not available at the requested time');
    }

    const trimmedReason = reason?.trim();

    const updated = await this.schedulingService.rescheduleAppointment({
      orgId,
      appointmentId,
      doctorId: appointment.doctor_id,
      facilityId: appointment.facility_id,
      newStartTime,
      newEndTime: new Date(matchedSlot.end_time),
      changedBy: `portal:patient:${patientId}`,
      reason: trimmedReason,
      allowedFromStatuses: ['booked', 'confirmed'],
    });

    return {
      appointment: this.toPortalAppointment(updated),
    };
  }

  // ── Invoices ──────────────────────────────────────────────────────────────

  async getInvoices(patientId: string, orgId: string): Promise<PortalInvoice[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { patientId, orgId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return invoices.map((inv) => this.toPortalInvoice(inv));
  }

  async getInvoiceReceiptPdf(
    patientId: string,
    orgId: string,
    invoiceId: string,
  ): Promise<PortalInvoiceReceipt> {
    const receipt = await this.billingService.generatePortalInvoicePdf({
      orgId,
      patientId,
      invoiceId,
    });

    return {
      fileName: `invoice-${receipt.invoiceNo}.pdf`,
      pdf: receipt.pdf,
    };
  }

  async startStripeCheckout(
    patientId: string,
    orgId: string,
    invoiceId: string,
    options: { successUrl?: string; cancelUrl?: string },
  ): Promise<PortalStripeCheckoutSession> {
    return this.billingService.createPortalStripeCheckoutSession({
      orgId,
      patientId,
      invoiceId,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
    });
  }

  async confirmStripeCheckout(
    patientId: string,
    orgId: string,
    invoiceId: string,
    sessionId: string,
  ): Promise<PortalStripeCheckoutConfirmation> {
    const confirmation = await this.billingService.confirmPortalStripeCheckoutSession({
      orgId,
      patientId,
      invoiceId,
      sessionId,
    });

    const persistedInvoice = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        patientId,
        orgId,
      },
      include: { items: true },
    });

    const invoice = persistedInvoice ? this.toPortalInvoice(persistedInvoice) : null;

    return {
      status: confirmation.status,
      invoice,
    };
  }

  // ── Encounters (read-only) ────────────────────────────────────────────────

  async getEncounters(patientId: string, orgId: string): Promise<PortalEncounter[]> {
    const result = await this.encountersService.getPatientEncounters(
      orgId,
      patientId,
      1,
      20,
    );

    const encounters = Array.isArray(result) ? result : (result as { data?: unknown[] }).data ?? [];
    const encounterRecords = encounters as Array<Record<string, unknown>>;

    const [facilityNameMap, doctorNameMap] = await Promise.all([
      this.loadFacilityNameMap(
        orgId,
        encounterRecords.map((encounter) => String(encounter['facility_id'] ?? '')),
      ),
      this.loadDoctorNameMap(
        orgId,
        encounterRecords.map((encounter) => String(encounter['doctor_id'] ?? '')),
      ),
    ]);

    return encounterRecords.map((enc) => {
      const facilityId = String(enc['facility_id'] ?? '');
      const doctorId = String(enc['doctor_id'] ?? '');
      const startedAtSource = enc['started_at'] ?? enc['visit_date'];

      return {
        id: String(enc['_id'] ?? enc['id']),
        facilityId,
        facilityName: facilityNameMap.get(facilityId) ?? (facilityId.length > 0 ? facilityId : undefined),
        doctorId,
        doctorName: doctorNameMap.get(doctorId) ?? (doctorId.length > 0 ? doctorId : undefined),
        startedAt: startedAtSource instanceof Date
          ? startedAtSource.toISOString()
          : String(startedAtSource ?? ''),
        status: String(enc['status'] ?? ''),
        chiefComplaint: enc['chief_complaint'] ? String(enc['chief_complaint']) : undefined,
        diagnoses: ((enc['diagnoses'] as Array<{ icd_code: string; description: string }>) ?? []).map(
        (d) => ({ code: d.icd_code, description: d.description }),
      ),
      };
    });
  }

  // ── Lab results (completed only) ─────────────────────────────────────────

  async getLabResults(patientId: string, orgId: string): Promise<LabResult[]> {
    return this.labService.getResultsForPatient(orgId, undefined, patientId);
  }

  // ── Portal settings + GDPR intake ───────────────────────────────────────

  async getPortalSettings(patientId: string, orgId: string): Promise<PortalSettings> {
    const [settings, aiConsent] = await Promise.all([
      this.prisma.portalPatientSetting.findUnique({
        where: {
          patientId_orgId: {
            patientId,
            orgId,
          },
        },
      }),
      this.prisma.patientConsent.findUnique({
        where: {
          patientId_orgId_consentType: {
            patientId,
            orgId,
            consentType: AI_AMBIENT_AUDIO_CONSENT,
          },
        },
      }),
    ]);

    return {
      sms_notifications: settings?.smsNotifications ?? true,
      email_notifications: settings?.emailNotifications ?? true,
      ai_consent: aiConsent?.granted === true,
    };
  }

  async updatePortalSettings(
    patientId: string,
    orgId: string,
    input: PortalSettingsUpdateInput,
    metadata: PortalSettingsAuditMetadata,
  ): Promise<PortalSettings> {
    const hasSmsUpdate = input.sms_notifications !== undefined;
    const hasEmailUpdate = input.email_notifications !== undefined;
    const hasAiUpdate = input.ai_consent !== undefined;

    if (!hasSmsUpdate && !hasEmailUpdate && !hasAiUpdate) {
      throw new BadRequestException('At least one setting field must be provided');
    }

    if (hasSmsUpdate || hasEmailUpdate) {
      const updateData: { smsNotifications?: boolean; emailNotifications?: boolean } = {};

      if (hasSmsUpdate) {
        updateData.smsNotifications = input.sms_notifications;
      }

      if (hasEmailUpdate) {
        updateData.emailNotifications = input.email_notifications;
      }

      await this.prisma.portalPatientSetting.upsert({
        where: {
          patientId_orgId: {
            patientId,
            orgId,
          },
        },
        create: {
          patientId,
          orgId,
          smsNotifications: input.sms_notifications ?? true,
          emailNotifications: input.email_notifications ?? true,
        },
        update: updateData,
      });
    }

    if (hasAiUpdate) {
      await this.updateAiConsent(patientId, orgId, input.ai_consent === true, metadata);
    }

    return this.getPortalSettings(patientId, orgId);
  }

  async requestDataExport(patientId: string, orgId: string): Promise<PortalPrivacyRequestAccepted> {
    return this.createPortalPrivacyRequest(patientId, orgId, 'DATA_EXPORT');
  }

  async requestAccountDeletion(
    patientId: string,
    orgId: string,
    reason?: string,
  ): Promise<PortalPrivacyRequestAccepted> {
    return this.createPortalPrivacyRequest(patientId, orgId, 'ACCOUNT_DELETION', reason);
  }

  // ── Portal Terms Consent ──────────────────────────────────────────────────

  async getPortalConsentStatus(patientId: string, orgId: string): Promise<PortalConsentStatus> {
    const consent = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_orgId_consentType: {
          patientId,
          orgId,
          consentType: PORTAL_TERMS_CONSENT,
        },
      },
    });

    const accepted = consent?.granted === true;

    return {
      required: true,
      accepted,
      consentType: 'portal_terms',
      grantedAt: accepted && consent?.grantedAt ? consent.grantedAt.toISOString() : null,
    };
  }

  async getInternalConsentStatus(
    patientId: string,
    orgId: string,
    consentType: string,
  ): Promise<InternalConsentStatus> {
    if (consentType !== 'ai_ambient_audio') {
      throw new BadRequestException(`Unsupported consent type '${consentType}'`);
    }

    const consent = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_orgId_consentType: {
          patientId,
          orgId,
          consentType: AI_AMBIENT_AUDIO_CONSENT,
        },
      },
    });

    return {
      patient_id: patientId,
      org_id: orgId,
      consent_type: 'ai_ambient_audio',
      granted: consent?.granted === true,
      granted_at: consent?.grantedAt?.toISOString() ?? null,
      revoked_at: consent?.revokedAt?.toISOString() ?? null,
    };
  }

  async acceptPortalConsent(
    patientId: string,
    orgId: string,
    metadata: { ipAddress?: string; userAgent?: string },
  ): Promise<PortalConsentAccepted> {
    const existing = await this.prisma.patientConsent.findUnique({
      where: {
        patientId_orgId_consentType: {
          patientId,
          orgId,
          consentType: PORTAL_TERMS_CONSENT,
        },
      },
    });

    if (existing?.granted && existing.grantedAt) {
      return {
        accepted: true,
        consentType: 'portal_terms',
        grantedAt: existing.grantedAt.toISOString(),
      };
    }

    const now = new Date();

    const consent = existing
      ? await this.prisma.patientConsent.update({
        where: { id: existing.id },
        data: {
          granted: true,
          grantedAt: now,
          revokedAt: null,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      })
      : await this.prisma.patientConsent.create({
        data: {
          patientId,
          orgId,
          consentType: PORTAL_TERMS_CONSENT,
          granted: true,
          grantedAt: now,
          revokedAt: null,
          ipAddress: metadata.ipAddress,
          userAgent: metadata.userAgent,
        },
      });

    return {
      accepted: true,
      consentType: 'portal_terms',
      grantedAt: (consent.grantedAt ?? now).toISOString(),
    };
  }
}

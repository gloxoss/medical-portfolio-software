import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import type { AppointmentDocument } from '../scheduling/schemas/appointment.schema';
import { Appointment } from '../scheduling/schemas/appointment.schema';
import type { EncounterDocument } from '../encounters/encounter.schema';
import { Encounter } from '../encounters/encounter.schema';
import { EncountersService } from '../encounters/encounters.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { IVideoProvider, VIDEO_PROVIDER } from '../../infrastructure/providers/video/video.interface';
import type { PatientRequestUser, RequestUser } from '../auth/types/request-user.type';
import { CreateVideoSessionDto, EndVideoSessionDto } from './telemedicine.dto';
import type { VideoSessionDocument, VideoSessionStatus } from './video-session.schema';
import { VideoSessionRecord } from './video-session.schema';

type SessionSummary = {
  session_id: string;
  appointment_id: string;
  encounter_id: string | null;
  room_url: string;
  status: VideoSessionStatus;
  recording_enabled: boolean;
  scheduled_start_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  doctor_joined: boolean;
  patient_joined: boolean;
  doctor_joined_at: string | null;
  patient_joined_at: string | null;
};

export type DoctorJoinResponse = SessionSummary & {
  doctor_token: string;
};

export type PatientJoinResponse = SessionSummary & {
  patient_token: string;
};

@Injectable()
export class TelemedicineService {
  private readonly logger = new Logger(TelemedicineService.name);

  constructor(
    @InjectModel(VideoSessionRecord.name)
    private readonly videoSessionModel: Model<VideoSessionDocument>,
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
    @InjectModel(Encounter.name)
    private readonly encounterModel: Model<EncounterDocument>,
    @Inject(VIDEO_PROVIDER)
    private readonly videoProvider: IVideoProvider,
    private readonly encountersService: EncountersService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async warmUpcomingTelemedicineSessions(): Promise<void> {
    const now = new Date();
    const lookBack = new Date(now.getTime() - 5 * 60_000);
    const lookAhead = new Date(now.getTime() + 15 * 60_000);

    const upcoming = await this.appointmentModel.find({
      type: 'telemedicine',
      status: { $in: ['booked', 'confirmed', 'checked_in', 'in_progress'] },
      start_time: { $gte: lookBack, $lte: lookAhead },
    }).limit(100).exec();

    for (const appointment of upcoming) {
      const appointmentId = this.asId(appointment._id);
      try {
        await this.ensureSessionForAppointmentInternal({
          orgId: appointment.org_id,
          appointmentId,
          createdBy: 'system:auto',
          requestedFacilityId: appointment.facility_id,
          recordingEnabled: false,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Unable to warm telemedicine session for appointment ${appointmentId}: ${message}`);
      }
    }
  }

  async createSessionForAppointment(
    user: RequestUser,
    facilityId: string,
    dto: CreateVideoSessionDto,
  ): Promise<DoctorJoinResponse> {
    const session = await this.ensureSessionForAppointmentInternal({
      orgId: user.orgId,
      appointmentId: dto.appointment_id,
      createdBy: user.id,
      requestedFacilityId: facilityId,
      recordingEnabled: dto.recording_enabled,
    });

    const doctorToken = await this.videoProvider.createMeetingToken({
      roomName: session.room_name,
      userName: `doctor-${session.doctor_id}`,
      isOwner: true,
    });

    return {
      ...this.toSummary(session),
      doctor_token: doctorToken,
    };
  }

  async createSessionFromEvent(
    orgId: string,
    appointmentId: string,
    facilityId?: string,
    recordingEnabled?: boolean,
  ): Promise<void> {
    await this.ensureSessionForAppointmentInternal({
      orgId,
      appointmentId,
      createdBy: 'system:event',
      requestedFacilityId: facilityId,
      recordingEnabled,
    });
  }

  async getSessionForStaff(
    user: RequestUser,
    facilityId: string,
    sessionId: string,
  ): Promise<SessionSummary> {
    const session = await this.findSessionForFacility(user.orgId, facilityId, sessionId);
    return this.toSummary(session);
  }

  async joinDoctorSession(
    user: RequestUser,
    facilityId: string,
    sessionId: string,
  ): Promise<DoctorJoinResponse> {
    const session = await this.findSessionForFacility(user.orgId, facilityId, sessionId);

    if (session.doctor_id !== user.id && !user.isSuperAdmin) {
      throw new ForbiddenException('Only the assigned doctor can join this session');
    }

    if (session.status === 'completed' || session.ended_at) {
      throw new BadRequestException('Session is already completed');
    }

    const now = new Date();
    const justStarted = !session.started_at;
    const updateData: Partial<VideoSessionRecord> = {
      status: session.patient_joined_at ? 'in_progress' : 'waiting',
      doctor_joined_at: session.doctor_joined_at ?? now,
      started_at: session.started_at ?? now,
    };

    if (!session.encounter_id) {
      const encounterId = await this.ensureEncounterForSession(session);
      if (encounterId) {
        updateData.encounter_id = encounterId;
      }
    }

    const updated = await this.videoSessionModel
      .findByIdAndUpdate(session._id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    if (justStarted) {
      await this.redisPublisher.publish('telemedicine.session.started', {
        session_id: this.asId(updated._id),
        appointment_id: updated.appointment_id,
        encounter_id: updated.encounter_id,
        org_id: updated.org_id,
        facility_id: updated.facility_id,
        patient_id: updated.patient_id,
        doctor_id: updated.doctor_id,
        room_url: updated.room_url,
        started_at: (updated.started_at ?? now).toISOString(),
      });
    }

    const doctorToken = await this.videoProvider.createMeetingToken({
      roomName: updated.room_name,
      userName: `doctor-${updated.doctor_id}`,
      isOwner: true,
    });

    return {
      ...this.toSummary(updated),
      doctor_token: doctorToken,
    };
  }

  async joinPatientSession(
    patient: PatientRequestUser,
    sessionId: string,
  ): Promise<PatientJoinResponse> {
    const session = await this.findSessionById(patient.orgId, sessionId);

    if (session.patient_id !== patient.patientId) {
      throw new ForbiddenException('You are not allowed to join this session');
    }

    if (session.status === 'completed' || session.ended_at) {
      throw new BadRequestException('Session has already ended');
    }

    const now = new Date();
    const updateData: Partial<VideoSessionRecord> = {
      status: session.doctor_joined_at ? 'in_progress' : 'waiting',
      patient_joined_at: session.patient_joined_at ?? now,
    };

    if (!session.started_at && session.doctor_joined_at) {
      updateData.started_at = session.doctor_joined_at;
    }

    const updated = await this.videoSessionModel
      .findByIdAndUpdate(session._id, { $set: updateData }, { new: true })
      .exec();

    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    const patientToken = await this.videoProvider.createMeetingToken({
      roomName: updated.room_name,
      userName: `patient-${updated.patient_id}`,
      isOwner: false,
    });

    return {
      ...this.toSummary(updated),
      patient_token: patientToken,
    };
  }

  async endSession(
    user: RequestUser,
    facilityId: string,
    sessionId: string,
    dto?: EndVideoSessionDto,
  ): Promise<SessionSummary> {
    const session = await this.findSessionForFacility(user.orgId, facilityId, sessionId);

    if (session.doctor_id !== user.id && !user.isSuperAdmin) {
      throw new ForbiddenException('Only the assigned doctor can end this session');
    }

    if (session.status === 'completed' && session.ended_at) {
      return this.toSummary(session);
    }

    const now = new Date();
    const startedAt = session.started_at
      ?? session.doctor_joined_at
      ?? session.patient_joined_at
      ?? session.scheduled_start_at
      ?? now;

    const elapsedMs = Math.max(0, now.getTime() - startedAt.getTime());
    const durationMinutes = Math.max(1, Math.ceil(elapsedMs / 60_000));

    const updated = await this.videoSessionModel.findByIdAndUpdate(
      session._id,
      {
        $set: {
          status: 'completed',
          ended_at: now,
          duration_minutes: durationMinutes,
          end_reason: dto?.reason?.trim() || undefined,
        },
      },
      { new: true },
    ).exec();

    if (!updated) {
      throw new NotFoundException('Session not found');
    }

    await this.redisPublisher.publish('telemedicine.session.ended', {
      session_id: this.asId(updated._id),
      org_id: updated.org_id,
      facility_id: updated.facility_id,
      appointment_id: updated.appointment_id,
      encounter_id: updated.encounter_id,
      patient_id: updated.patient_id,
      doctor_id: updated.doctor_id,
      room_url: updated.room_url,
      started_at: startedAt.toISOString(),
      ended_at: now.toISOString(),
      duration_minutes: durationMinutes,
      recording_enabled: updated.recording_enabled,
    });

    return this.toSummary(updated);
  }

  private async ensureSessionForAppointmentInternal(params: {
    orgId: string;
    appointmentId: string;
    createdBy: string;
    requestedFacilityId?: string;
    recordingEnabled?: boolean;
  }): Promise<VideoSessionDocument> {
    const appointment = await this.getTelemedicineAppointment(params.orgId, params.appointmentId);

    if (params.requestedFacilityId && appointment.facility_id !== params.requestedFacilityId) {
      throw new NotFoundException('Appointment not found in selected facility');
    }

    const appointmentId = this.asId(appointment._id);
    let existing = await this.videoSessionModel.findOne({
      org_id: params.orgId,
      appointment_id: appointmentId,
    }).exec();

    if (existing) {
      if (!existing.encounter_id) {
        const encounterId = await this.ensureEncounterForAppointment(appointment);
        if (encounterId) {
          existing = await this.videoSessionModel.findByIdAndUpdate(
            existing._id,
            { $set: { encounter_id: encounterId } },
            { new: true },
          ).exec() ?? existing;
        }
      }

      return existing;
    }

    const encounterId = await this.ensureEncounterForAppointment(appointment);
    const room = await this.videoProvider.createRoom({
      orgId: params.orgId,
      appointmentId,
      scheduledStartAt: appointment.start_time,
    });

    try {
      const created = await this.videoSessionModel.create({
        org_id: params.orgId,
        facility_id: appointment.facility_id,
        appointment_id: appointmentId,
        encounter_id: encounterId,
        patient_id: appointment.patient_id,
        doctor_id: appointment.doctor_id,
        provider: 'daily',
        room_name: room.roomName,
        room_url: room.roomUrl,
        recording_enabled: params.recordingEnabled ?? false,
        status: 'created',
        scheduled_start_at: appointment.start_time,
        created_by: params.createdBy,
      });

      this.logger.log(`Telemedicine session created for appointment ${appointmentId}`);
      return created;
    } catch (error: unknown) {
      const duplicateKey =
        typeof error === 'object'
        && error !== null
        && 'code' in error
        && (error as { code?: number }).code === 11000;

      if (duplicateKey) {
        const raceWinner = await this.videoSessionModel.findOne({
          org_id: params.orgId,
          appointment_id: appointmentId,
        }).exec();

        if (raceWinner) {
          return raceWinner;
        }
      }

      throw error;
    }
  }

  private async getTelemedicineAppointment(
    orgId: string,
    appointmentId: string,
  ): Promise<AppointmentDocument> {
    if (!Types.ObjectId.isValid(appointmentId)) {
      throw new NotFoundException('Appointment not found');
    }

    const appointment = await this.appointmentModel.findOne({
      _id: new Types.ObjectId(appointmentId),
      org_id: orgId,
    }).exec();

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    if (appointment.type !== 'telemedicine') {
      throw new BadRequestException('Appointment is not telemedicine type');
    }

    if (['cancelled', 'no_show'].includes(appointment.status)) {
      throw new BadRequestException('Cannot create a session for an inactive appointment');
    }

    return appointment;
  }

  private async ensureEncounterForSession(session: VideoSessionDocument): Promise<string | undefined> {
    if (session.encounter_id) {
      return session.encounter_id;
    }

    const appointment = await this.appointmentModel.findOne({
      _id: new Types.ObjectId(session.appointment_id),
      org_id: session.org_id,
    }).exec();

    if (!appointment) {
      return undefined;
    }

    return this.ensureEncounterForAppointment(appointment);
  }

  private async ensureEncounterForAppointment(
    appointment: AppointmentDocument,
  ): Promise<string | undefined> {
    const appointmentId = this.asId(appointment._id);

    const existing = await this.encounterModel.findOne({
      org_id: appointment.org_id,
      appointment_id: appointmentId,
    }, { _id: 1 }).lean().exec();

    if (existing?._id) {
      return this.asId(existing._id);
    }

    try {
      const created = await this.encountersService.create(
        appointment.org_id,
        appointment.facility_id,
        appointment.doctor_id,
        {
          patient_id: appointment.patient_id,
          appointment_id: appointmentId,
          visit_date: appointment.start_time.toISOString(),
        },
      );

      const createdId = (created as { _id?: unknown; id?: unknown })._id
        ?? (created as { _id?: unknown; id?: unknown }).id;

      if (createdId) {
        return this.asId(createdId);
      }
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        throw error;
      }
    }

    const raceWinner = await this.encounterModel.findOne({
      org_id: appointment.org_id,
      appointment_id: appointmentId,
    }, { _id: 1 }).lean().exec();

    return raceWinner?._id ? this.asId(raceWinner._id) : undefined;
  }

  private async findSessionById(orgId: string, sessionId: string): Promise<VideoSessionDocument> {
    if (!Types.ObjectId.isValid(sessionId)) {
      throw new NotFoundException('Session not found');
    }

    const session = await this.videoSessionModel.findOne({
      _id: new Types.ObjectId(sessionId),
      org_id: orgId,
    }).exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  private async findSessionForFacility(
    orgId: string,
    facilityId: string,
    sessionId: string,
  ): Promise<VideoSessionDocument> {
    const session = await this.findSessionById(orgId, sessionId);

    if (session.facility_id !== facilityId) {
      throw new NotFoundException('Session not found in selected facility');
    }

    return session;
  }

  private toSummary(session: VideoSessionDocument): SessionSummary {
    return {
      session_id: this.asId(session._id),
      appointment_id: session.appointment_id,
      encounter_id: session.encounter_id ?? null,
      room_url: session.room_url,
      status: session.status,
      recording_enabled: session.recording_enabled,
      scheduled_start_at: session.scheduled_start_at.toISOString(),
      started_at: session.started_at?.toISOString() ?? null,
      ended_at: session.ended_at?.toISOString() ?? null,
      duration_minutes: session.duration_minutes ?? null,
      doctor_joined: Boolean(session.doctor_joined_at),
      patient_joined: Boolean(session.patient_joined_at),
      doctor_joined_at: session.doctor_joined_at?.toISOString() ?? null,
      patient_joined_at: session.patient_joined_at?.toISOString() ?? null,
    };
  }

  private asId(value: unknown): string {
    if (value instanceof Types.ObjectId) {
      return value.toHexString();
    }

    return String(value);
  }
}

import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SchedPgRepository } from './sched-pg.repository';
import { SchedMongoRepository } from './sched-mongo.repository';
import { RedisQueueService } from './redis-queue.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { AppointmentDocument } from './schemas/appointment.schema';

// Slot computation outputs
export interface TimeSlot {
  start_time: string; // ISO 8601
  end_time: string;
  available: boolean;
}

// Shape returned to the SSE / queue-display endpoint
export interface QueueEntry {
  appointment_id: string;
  queue_token: string;
  patient_id: string;
  status: string;
  start_time: Date;
}

export interface RescheduleAppointmentInput {
  orgId: string;
  appointmentId: string;
  doctorId: string;
  facilityId: string;
  newStartTime: Date;
  newEndTime: Date;
  changedBy: string;
  reason?: string;
  allowedFromStatuses?: string[];
}

@Injectable()
export class SchedulingService {
  private readonly logger = new Logger(SchedulingService.name);

  constructor(
    private readonly pgRepo: SchedPgRepository,
    private readonly mongoRepo: SchedMongoRepository,
    private readonly redisQueue: RedisQueueService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  // ── Doctor Schedule (Template) ───────────────────────────────────────────────

  async createSchedule(
    doctorId: string,
    orgId: string,
    dto: CreateScheduleDto,
  ) {
    return this.pgRepo.createSchedule(doctorId, orgId, dto);
  }

  async getDoctorSchedules(doctorId: string, orgId: string) {
    return this.pgRepo.getDoctorSchedules(doctorId, orgId);
  }

  // ── Availability (Slot Computation) ─────────────────────────────────────────

  // Computes free slots for a doctor on a given date by:
  //   1. Loading the doctor's weekly schedule template (from PG)
  //      ↳ pgRepo.getSchedule also checks doctor belongs to orgId — no cross-org leaks
  //   2. Loading booked appointments for that day (from Mongo)
  //   3. Subtracting booked + break intervals from the working window
  async getAvailability(
    orgId: string,
    doctorId: string,
    facilityId: string,
    dateStr: string,
  ): Promise<TimeSlot[]> {
    const date = new Date(dateStr);
    const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat

    // FIX-2: Pass orgId so pgRepo verifies doctor belongs to caller's org.
    // If the doctor is from a different org, getSchedule returns null → empty slots.
    const schedule = await this.pgRepo.getSchedule(doctorId, facilityId, dayOfWeek, orgId);
    if (!schedule) return []; // Doctor doesn't work this day OR doesn't belong to this org

    const booked = await this.mongoRepo.getBookedSlots(doctorId, facilityId, date);
    const bookedISOs = new Set(booked.map((a) => a.start_time.toISOString()));

    const slots = this._computeSlots(
      dateStr,
      schedule.startTime,    // "09:00"
      schedule.endTime,      // "17:00"
      schedule.slotMinutes,
      (schedule.breaks as Array<{ start: string; end: string }>) ?? [],
    );

    return slots.map((slot) => ({
      ...slot,
      available: !bookedISOs.has(slot.start_time),
    }));
  }

  private _computeSlots(
    dateStr: string,
    startTime: string,
    endTime: string,
    slotMinutes: number,
    breaks: Array<{ start: string; end: string }>,
  ): TimeSlot[] {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);

    const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
    const workStart = startH * 60 + startM;
    const workEnd = endH * 60 + endM;

    // Convert break strings to minute-offsets for quick containment check
    const breakRanges = breaks.map((b) => {
      const [bh, bm] = b.start.split(':').map(Number);
      const [eh, em] = b.end.split(':').map(Number);
      return { start: bh * 60 + bm, end: eh * 60 + em };
    });

    const slots: TimeSlot[] = [];
    for (let offset = workStart; offset + slotMinutes <= workEnd; offset += slotMinutes) {
      const slotEnd = offset + slotMinutes;

      // Skip if slot overlaps any break
      const inBreak = breakRanges.some(
        (br) => offset < br.end && slotEnd > br.start,
      );
      if (inBreak) continue;

      const slotStartDate = new Date(dayStart.getTime() + offset * 60_000);
      const slotEndDate = new Date(dayStart.getTime() + slotEnd * 60_000);

      slots.push({
        start_time: slotStartDate.toISOString(),
        end_time: slotEndDate.toISOString(),
        available: true, // will be overwritten by caller
      });
    }

    return slots;
  }

  // ── Book Appointment ─────────────────────────────────────────────────────────

  async bookAppointment(
    orgId: string,
    dto: BookAppointmentDto,
  ): Promise<AppointmentDocument> {
    const startTime = new Date(dto.start_time);
    const dateStr = startTime.toISOString().slice(0, 10);

    // 1. Ensure the slot exists in the doctor's schedule template
    const schedule = await this.pgRepo.getSchedule(
      dto.doctor_id,
      dto.facility_id,
      startTime.getDay(),
    );
    if (!schedule) {
      throw new BadRequestException('Doctor has no schedule for this day');
    }

    // 2. Compute slot end time
    const endTime = new Date(startTime.getTime() + schedule.slotMinutes * 60_000);

    // 3. Acquire Redis booking lock — prevents race conditions
    const tempId = `${dto.doctor_id}:${startTime.toISOString()}`;
    const locked = await this.redisQueue.acquireBookingLock(
      dto.doctor_id,
      startTime.toISOString(),
      tempId,
    );
    if (!locked) {
      throw new ConflictException('This slot is currently being booked by another user');
    }

    try {
      // 4. Double-check: verify slot is still free in Mongo
      const existingSlots = await this.mongoRepo.getBookedSlots(
        dto.doctor_id,
        dto.facility_id,
        startTime,
      );
      const alreadyBooked = existingSlots.some(
        (a) => a.start_time.toISOString() === startTime.toISOString(),
      );
      if (alreadyBooked) {
        throw new ConflictException('This slot is already booked');
      }

      // 5. Create the appointment
      const appointment = await this.mongoRepo.create({
        org_id: orgId,
        facility_id: dto.facility_id,
        patient_id: dto.patient_id,
        doctor_id: dto.doctor_id,
        start_time: startTime,
        end_time: endTime,
        type: dto.type ?? 'consultation',
        notes: dto.notes,
      });

      if (appointment.type === 'telemedicine') {
        await this.redisPublisher.publish('appointment.telemedicine.booked', {
          org_id: orgId,
          facility_id: dto.facility_id,
          appointment_id: String(appointment._id),
          patient_id: dto.patient_id,
          doctor_id: dto.doctor_id,
          start_time: startTime.toISOString(),
        });
      }

      return appointment;
    } finally {
      // Always release the lock — even on error
      await this.redisQueue.releaseBookingLock(dto.doctor_id, startTime.toISOString());
    }
  }

  // ── Check-In ────────────────────────────────────────────────────────────────

  async checkIn(
    orgId: string,
    appointmentId: string,
    changedBy: string,
  ): Promise<AppointmentDocument> {
    const appointment = await this.mongoRepo.findById(orgId, appointmentId);
    if (!appointment) throw new NotFoundException('Appointment not found');

    if (!['booked', 'confirmed'].includes(appointment.status)) {
      throw new BadRequestException(
        `Cannot check in from status '${appointment.status}'`,
      );
    }

    const facilityId = appointment.facility_id;
    const dateStr = appointment.start_time.toISOString().slice(0, 10);

    // FIX-3: Make token generation atomic.
    // nextToken uses a single Redis INCR which IS atomic — the race was that
    // we could generate a token and then fail to write it to Mongo, leaving
    // the sequence permanently incremented but the token unassigned.
    //
    // The fix: pass the token into updateStatus as a conditional write
    // (MongoDB findOneAndUpdate with { status: { $in: ['booked','confirmed'] } }).
    // If two concurrent requests pass the status check above, only ONE will
    // succeed the findOneAndUpdate (the other gets null → NotFoundException).
    // We generate the token AFTER the conditional update — so tokens are only
    // consumed when a real check-in succeeds.
    const updated = await this.mongoRepo.updateStatusConditional(
      appointmentId,
      // Only write if the document is still in a check-in-able state
      ['booked', 'confirmed'],
      'checked_in',
      changedBy,
    );
    if (!updated) {
      // Another concurrent request already checked in this appointment
      throw new BadRequestException(
        'Appointment was already checked in by a concurrent request',
      );
    }

    // Token generation happens AFTER the write succeeds — no wasted tokens
    const token = await this.redisQueue.nextToken(facilityId, dateStr);

    // Attach token to the appointment doc
    const withToken = await this.mongoRepo.setQueueToken(appointmentId, token);
    if (!withToken) throw new NotFoundException('Appointment not found after token assignment');

    // Add to Redis sorted set (arrival order)
    await this.redisQueue.enqueue(facilityId, dateStr, appointmentId);

    // Notify all SSE subscribers for this facility
    await this.redisQueue.notifyQueueUpdate(facilityId, {
      event: 'checked_in',
      appointment_id: appointmentId,
      queue_token: token,
      patient_id: appointment.patient_id,
    });

    return withToken;
  }

  // ── Queue ────────────────────────────────────────────────────────────────────

  // Returns today's checked-in / in-progress queue for a facility, ordered by token
  async getTodayQueue(facilityId: string): Promise<AppointmentDocument[]> {
    return this.mongoRepo.getTodayCheckedIn(facilityId);
  }

  async getUpcomingAppointmentsForTomorrow(
    orgId: string,
    facilityId: string,
  ): Promise<AppointmentDocument[]> {
    return this.mongoRepo.findUpcomingTomorrow(orgId, facilityId);
  }

  // ── Status Transitions ───────────────────────────────────────────────────────

  async updateStatus(
    orgId: string,
    appointmentId: string,
    status: string,
    changedBy: string,
    extra?: { cancel_reason?: string },
  ): Promise<AppointmentDocument> {
    const appointment = await this.mongoRepo.findById(orgId, appointmentId);
    if (!appointment) throw new NotFoundException('Appointment not found');

    const updated = await this.mongoRepo.updateStatus(
      appointmentId,
      status,
      extra,
      changedBy,
    );
    if (!updated) throw new NotFoundException('Update failed');

    // If completing/cancelling, remove from Redis queue
    if (['completed', 'cancelled', 'no_show'].includes(status)) {
      const dateStr = appointment.start_time.toISOString().slice(0, 10);
      await this.redisQueue.removeFromQueue(
        appointment.facility_id,
        dateStr,
        appointmentId,
      );
      await this.redisQueue.notifyQueueUpdate(appointment.facility_id, {
        event: status,
        appointment_id: appointmentId,
      });
    }

    if (status === 'cancelled') {
      await this.redisPublisher.publish('appointment.cancelled', {
        orgId,
        facilityId: appointment.facility_id,
        appointmentId,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        startTime: appointment.start_time.toISOString(),
      });
    }

    return updated;
  }

  async rescheduleAppointment(input: RescheduleAppointmentInput): Promise<AppointmentDocument> {
    const lockSlotIso = input.newStartTime.toISOString();
    const lockOwner = `reschedule:${input.appointmentId}`;

    const locked = await this.redisQueue.acquireBookingLock(
      input.doctorId,
      lockSlotIso,
      lockOwner,
    );

    if (!locked) {
      throw new ConflictException('This slot is currently being reserved by another request');
    }

    try {
      const existingSlots = await this.mongoRepo.getBookedSlots(
        input.doctorId,
        input.facilityId,
        input.newStartTime,
      );

      const slotTaken = existingSlots.some(
        (appt) =>
          String(appt._id) !== input.appointmentId
          && appt.start_time.toISOString() === lockSlotIso,
      );

      if (slotTaken) {
        throw new ConflictException('Doctor is not available at the requested time');
      }

      const updated = await this.mongoRepo.rescheduleAppointment(
        input.orgId,
        input.appointmentId,
        input.newStartTime,
        input.newEndTime,
        input.allowedFromStatuses ?? ['booked', 'confirmed'],
        input.changedBy,
      );

      if (!updated) {
        throw new BadRequestException('Appointment can no longer be rescheduled');
      }

      await this.redisPublisher.publish('appointment.rescheduled', {
        orgId: input.orgId,
        facilityId: updated.facility_id,
        appointmentId: input.appointmentId,
        patientId: updated.patient_id,
        doctorId: updated.doctor_id,
        newStartTime: updated.start_time.toISOString(),
      });

      return updated;
    } finally {
      await this.redisQueue.releaseBookingLock(input.doctorId, lockSlotIso);
    }
  }

  // ── No-Show Cron ─────────────────────────────────────────────────────────────

  // Runs every 5 minutes. Finds appointments still 'booked'/'confirmed'
  // more than 30 minutes past their start_time and marks them no_show.
  // FIX-6: Added retry logic — a single MongoDB failure no longer silently
  // drops the batch. Up to 3 attempts with exponential backoff (2s, 4s, 8s).
  @Cron(CronExpression.EVERY_5_MINUTES)
  async markNoShows(): Promise<void> {
    const cutoff = new Date(Date.now() - 30 * 60_000);
    const stale = await this.mongoRepo.findStaleActive(cutoff);

    if (stale.length === 0) return;

    const ids = stale.map((a) => String(a._id));

    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 2_000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await this.mongoRepo.bulkMarkNoShow(ids);
        this.logger.log(`No-show cron: marked ${ids.length} appointments (attempt ${attempt})`);
        return; // Success — exit
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);

        if (attempt < MAX_RETRIES) {
          const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.warn(
            `No-show cron: attempt ${attempt} failed (${message}), retrying in ${delayMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          // All attempts exhausted — log as error so it appears in monitoring
          this.logger.error(
            `No-show cron: all ${MAX_RETRIES} attempts failed. ${ids.length} appointments NOT marked. Last error: ${message}`,
          );
        }
      }
    }
  }
}

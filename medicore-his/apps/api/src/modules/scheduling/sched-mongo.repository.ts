import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Appointment, AppointmentDocument } from './schemas/appointment.schema';

@Injectable()
export class SchedMongoRepository {
  constructor(
    @InjectModel(Appointment.name)
    private readonly model: Model<AppointmentDocument>,
  ) {}

  async create(data: {
    org_id: string; facility_id: string; patient_id: string;
    doctor_id: string; start_time: Date; end_time: Date;
    type: string; notes?: string;
  }): Promise<AppointmentDocument> {
    return this.model.create({
      ...data,
      status: 'booked',
      status_history: [{ status: 'booked', changed_at: new Date() }],
    });
  }

  // Returns all booked/confirmed appointments for a doctor on a given date
  async getBookedSlots(
    doctorId: string,
    facilityId: string,
    date: Date,
  ): Promise<AppointmentDocument[]> {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return this.model.find({
      doctor_id: doctorId,
      facility_id: facilityId,
      start_time: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['booked', 'confirmed', 'checked_in', 'in_progress'] },
    }).lean().exec() as Promise<AppointmentDocument[]>;
  }

  async findById(orgId: string, id: string): Promise<AppointmentDocument | null> {
    return this.model.findOne({ _id: id, org_id: orgId }).exec();
  }

  // Transition status + append to history
  async updateStatus(
    id: string,
    status: string,
    extra?: Partial<{ queue_token: string; cancel_reason: string }>,
    changedBy?: string,
  ): Promise<AppointmentDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      {
        $set: { status, ...extra },
        $push: { status_history: { status, changed_at: new Date(), changed_by: changedBy } },
      },
      { new: true },
    ).exec();
  }

  // FIX-3: Atomic conditional status transition for check-in.
  // Uses MongoDB's findOneAndUpdate with a status filter — only ONE concurrent
  // caller can win this write. Returns null if the appointment is no longer in
  // an eligible status (already checked in by a concurrent request).
  async updateStatusConditional(
    id: string,
    fromStatuses: string[],
    toStatus: string,
    changedBy: string,
  ): Promise<AppointmentDocument | null> {
    return this.model.findOneAndUpdate(
      {
        _id: id,
        status: { $in: fromStatuses }, // ← Only match if still in eligible state
      },
      {
        $set: { status: toStatus },
        $push: { status_history: { status: toStatus, changed_at: new Date(), changed_by: changedBy } },
      },
      { new: true },
    ).exec();
  }

  // FIX-3: Separate token assignment — runs after the above race is won.
  async setQueueToken(
    id: string,
    token: string,
  ): Promise<AppointmentDocument | null> {
    return this.model.findByIdAndUpdate(
      id,
      { $set: { queue_token: token } },
      { new: true },
    ).exec();
  }

  // Atomic slot update with status guard — used by portal/self-service reschedule.
  async rescheduleAppointment(
    orgId: string,
    id: string,
    newStartTime: Date,
    newEndTime: Date,
    allowedFromStatuses: string[],
    changedBy: string,
  ): Promise<AppointmentDocument | null> {
    return this.model.findOneAndUpdate(
      {
        _id: id,
        org_id: orgId,
        status: { $in: allowedFromStatuses },
        start_time: { $gt: new Date() },
      },
      {
        $set: {
          start_time: newStartTime,
          end_time: newEndTime,
        },
        $push: {
          status_history: {
            status: 'rescheduled',
            changed_at: new Date(),
            changed_by: changedBy,
          },
        },
      },
      { new: true },
    ).exec();
  }

  // Used by the no-show cron — find appointments still 'booked'/'confirmed' >30min past start
  async findStaleActive(cutoffTime: Date): Promise<AppointmentDocument[]> {
    return this.model.find({
      status: { $in: ['booked', 'confirmed'] },
      start_time: { $lt: cutoffTime },
    }).lean().exec() as Promise<AppointmentDocument[]>;
  }

  async bulkMarkNoShow(ids: string[]): Promise<void> {
    await this.model.updateMany(
      { _id: { $in: ids } },
      {
        $set: { status: 'no_show' },
        $push: { status_history: { status: 'no_show', changed_at: new Date() } },
      },
    );
  }

  // Queue for a facility today
  async getTodayCheckedIn(facilityId: string): Promise<AppointmentDocument[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.model.find({
      facility_id: facilityId,
      status: { $in: ['checked_in', 'in_progress'] },
      start_time: { $gte: today, $lt: tomorrow },
    }).sort({ queue_token: 1 }).lean().exec() as Promise<AppointmentDocument[]>;
  }

  async findUpcomingTomorrow(
    orgId: string,
    facilityId: string,
  ): Promise<AppointmentDocument[]> {
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 1);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);

    return this.model.find({
      org_id: orgId,
      facility_id: facilityId,
      status: { $in: ['booked', 'confirmed'] },
      start_time: { $gte: start, $lt: end },
    }).lean().exec() as Promise<AppointmentDocument[]>;
  }
}

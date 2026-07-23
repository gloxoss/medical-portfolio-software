import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type AppointmentDocument = HydratedDocument<Appointment>;

@Schema({ _id: false })
export class StatusHistoryEntry {
  @Prop({ required: true }) status!: string;
  @Prop({ required: true, default: Date.now }) changed_at!: Date;
  @Prop() changed_by?: string; // PG User.id
}

@Schema({
  collection: 'appointments',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Appointment {
  @Prop({ required: true, index: true }) org_id!: string;
  @Prop({ required: true, index: true }) facility_id!: string;
  @Prop({ required: true, index: true }) patient_id!: string; // MongoDB ObjectId string
  @Prop({ required: true }) doctor_id!: string;               // PG User.id

  @Prop({ required: true, index: true }) start_time!: Date;
  @Prop({ required: true }) end_time!: Date;

  @Prop({
    enum: ['consultation', 'followup', 'emergency', 'telemedicine'],
    default: 'consultation',
  })
  type!: string;

  @Prop({
    enum: ['booked', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'booked',
    index: true,
  })
  status!: string;

  @Prop() queue_token?: string;  // T-042
  @Prop() cancel_reason?: string;
  @Prop() notes?: string;

  @Prop({ type: [StatusHistoryEntry], default: [] })
  status_history!: StatusHistoryEntry[];
}

export const AppointmentSchema = SchemaFactory.createForClass(Appointment);

// Compound indexes
AppointmentSchema.index({ org_id: 1, facility_id: 1, start_time: 1 });
AppointmentSchema.index({ org_id: 1, doctor_id: 1, start_time: 1 });
// Fast no-show cron query: active appointments older than 30min
AppointmentSchema.index({ status: 1, start_time: 1 });

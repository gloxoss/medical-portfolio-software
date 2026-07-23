import { HydratedDocument } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const VIDEO_SESSION_STATUSES = [
  'created',
  'waiting',
  'in_progress',
  'completed',
  'cancelled',
] as const;

export type VideoSessionStatus = (typeof VIDEO_SESSION_STATUSES)[number];
export type VideoSessionDocument = HydratedDocument<VideoSessionRecord>;

@Schema({
  collection: 'video_sessions',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class VideoSessionRecord {
  @Prop({ required: true, index: true })
  org_id!: string;

  @Prop({ required: true, index: true })
  facility_id!: string;

  @Prop({ required: true, index: true })
  appointment_id!: string;

  @Prop({ required: false, index: true })
  encounter_id?: string;

  @Prop({ required: true, index: true })
  patient_id!: string;

  @Prop({ required: true, index: true })
  doctor_id!: string;

  @Prop({ required: true, enum: ['daily'], default: 'daily' })
  provider!: 'daily';

  @Prop({ required: true })
  room_name!: string;

  @Prop({ required: true })
  room_url!: string;

  @Prop({ required: true, default: false })
  recording_enabled!: boolean;

  @Prop({ required: true, enum: VIDEO_SESSION_STATUSES, default: 'created', index: true })
  status!: VideoSessionStatus;

  @Prop({ required: true, index: true })
  scheduled_start_at!: Date;

  @Prop({ required: true })
  created_by!: string;

  @Prop()
  doctor_joined_at?: Date;

  @Prop()
  patient_joined_at?: Date;

  @Prop()
  started_at?: Date;

  @Prop()
  ended_at?: Date;

  @Prop()
  duration_minutes?: number;

  @Prop()
  end_reason?: string;
}

export const VideoSessionSchema = SchemaFactory.createForClass(VideoSessionRecord);

VideoSessionSchema.index({ org_id: 1, appointment_id: 1 }, { unique: true });
VideoSessionSchema.index({ org_id: 1, facility_id: 1, status: 1, scheduled_start_at: 1 });

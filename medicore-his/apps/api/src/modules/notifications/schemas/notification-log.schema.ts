import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type NotificationLogDocument = NotificationLog & Document;

@Schema({ timestamps: true })
export class NotificationLog {
  @Prop({ type: MongooseSchema.Types.ObjectId, required: true }) org_id!: string;
  @Prop({ type: String, required: true }) entity_id!: string;
  @Prop({ required: true, enum: ['sms', 'email'] }) channel!: string;
  @Prop({ required: true }) to!: string;
  @Prop({ required: false }) subject?: string;
  @Prop({ required: true }) body!: string;
  @Prop({ required: true, enum: ['sent', 'failed', 'delivered', 'skipped'] }) status!: string;
  @Prop({ required: false }) error_reason?: string;
  @Prop({ default: Date.now }) sent_at!: Date;
}

export const NotificationLogSchema = SchemaFactory.createForClass(NotificationLog);

NotificationLogSchema.index({ org_id: 1, entity_id: 1, sent_at: -1 });

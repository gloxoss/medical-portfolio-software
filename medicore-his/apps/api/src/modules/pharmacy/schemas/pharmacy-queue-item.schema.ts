import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PharmacyQueueItemDocument = PharmacyQueueItem & Document;

@Schema({ _id: false })
export class PharmacyQueueDrug {
  @Prop({ required: false }) drug_id?: string;
  @Prop({ required: true }) drug_name!: string;
  @Prop({ required: false }) form?: string;
  @Prop({ required: false }) strength?: string;
  @Prop({ required: false }) dosage?: string;
  @Prop({ required: false }) frequency?: string;
  @Prop({ required: false }) duration?: string;
  @Prop({ required: false }) quantity?: number;
}

@Schema({ timestamps: true, collection: 'pharmacy_queue_items' })
export class PharmacyQueueItem {
  @Prop({ required: true }) org_id!: string;
  @Prop({ required: true }) facility_id!: string;
  @Prop({ required: true }) patient_id!: string;
  @Prop({ required: true }) encounter_id!: string;
  @Prop({ required: true }) prescription_id!: string;
  @Prop({ required: false }) doctor_id?: string;
  @Prop({ type: [SchemaFactory.createForClass(PharmacyQueueDrug)], default: [] })
  drugs!: PharmacyQueueDrug[];
  @Prop({
    required: true,
    enum: ['pending', 'dispensing', 'completed', 'rejected'],
    default: 'pending',
  })
  status!: string;
  @Prop({ type: [String], default: [] }) allergy_warnings!: string[];
  @Prop({ required: false }) source_event?: string;
}

export const PharmacyQueueItemSchema = SchemaFactory.createForClass(PharmacyQueueItem);

PharmacyQueueItemSchema.index({ org_id: 1, facility_id: 1, status: 1, createdAt: -1 });
PharmacyQueueItemSchema.index({ org_id: 1, prescription_id: 1 }, { unique: true });

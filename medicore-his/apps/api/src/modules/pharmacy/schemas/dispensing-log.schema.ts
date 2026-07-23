import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DispensingLogDocument = DispensingLog & Document;

@Schema({ _id: false })
export class DispensedItem {
  @Prop({ required: true }) drug_id!: string;
  @Prop({ required: true }) drug_name!: string;
  @Prop({ required: true }) batch_number!: string;
  @Prop({ required: true }) quantity!: number;
  @Prop({ required: true }) unit_price!: number;
  @Prop({ required: true }) line_total!: number;
}

@Schema({ timestamps: true, collection: 'dispensing_logs' })
export class DispensingLog {
  @Prop({ required: true }) org_id!: string;
  @Prop({ required: true }) facility_id!: string;
  @Prop({ required: true }) patient_id!: string;
  @Prop({ required: true }) encounter_id!: string;
  @Prop({ required: true }) prescription_id!: string;
  @Prop({ required: true }) dispensed_by!: string;
  @Prop({ type: [SchemaFactory.createForClass(DispensedItem)], default: [] })
  items!: DispensedItem[];
  @Prop({ type: [String], default: [] }) allergy_warnings!: string[];
  @Prop({ required: true, enum: ['completed', 'rejected'], default: 'completed' })
  status!: string;
  @Prop({ required: false }) reason?: string;
}

export const DispensingLogSchema = SchemaFactory.createForClass(DispensingLog);

DispensingLogSchema.index({ org_id: 1, facility_id: 1, createdAt: -1 });
DispensingLogSchema.index({ org_id: 1, prescription_id: 1 });

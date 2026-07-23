import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';
import type { LabFlag } from '@medicore/shared-types';

export type LabResultDocument = LabResultRecord & Document;

@Schema({ _id: false })
export class LabResultComponent {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  value!: number | string;

  @Prop({ required: true })
  unit!: string;

  @Prop({ required: false })
  ref_range_low?: number;

  @Prop({ required: false })
  ref_range_high?: number;

  @Prop({ required: true, enum: ['normal', 'low', 'high', 'critical'] })
  flag!: LabFlag;
}

@Schema({
  collection: 'lab_results',
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
})
export class LabResultRecord {
  @Prop({ required: true })
  order_id!: string;

  @Prop({ required: true })
  patient_id!: string;

  @Prop({ required: false })
  encounter_id?: string;

  @Prop({ required: true })
  panel_code!: string;

  @Prop({ required: true })
  org_id!: string;

  @Prop({ required: true })
  facility_id!: string;

  @Prop({ type: [SchemaFactory.createForClass(LabResultComponent)], default: [] })
  components!: LabResultComponent[];

  @Prop({ required: false })
  freetext_note?: string;

  @Prop({ required: true })
  resulted_by!: string;

  @Prop({ required: true })
  resulted_at!: Date;

  @Prop({ required: false })
  created_at?: Date;

  @Prop({ required: false })
  updated_at?: Date;
}

export const LabResultSchema = SchemaFactory.createForClass(LabResultRecord);

LabResultSchema.index({ org_id: 1, order_id: 1 }, { unique: true });
LabResultSchema.index({ org_id: 1, patient_id: 1, resulted_at: -1 });

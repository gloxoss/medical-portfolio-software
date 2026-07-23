import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EncounterDocument = Encounter & Document;

@Schema({ _id: false })
export class Vitals {
  @Prop({ required: false }) bp?: string;
  @Prop({ required: false }) hr?: number;
  @Prop({ required: false }) temp?: number;
  @Prop({ required: false }) weight?: number;
  @Prop({ required: false }) height?: number;
  @Prop({ required: false }) bmi?: number;
  @Prop({ required: false }) spo2?: number;
}

@Schema({ _id: false })
export class SoapNote {
  @Prop({ required: false }) subjective?: string;
  @Prop({ required: false }) objective?: string;
  @Prop({ required: false }) assessment?: string;
  @Prop({ required: false }) plan?: string;
}

@Schema({ _id: false })
export class Diagnosis {
  @Prop({ required: true }) code!: string;       // ICD-10
  @Prop({ required: true }) description!: string;
  @Prop({ required: true, enum: ['primary', 'secondary'] }) type!: string;
}

@Schema({ _id: false })
export class Prescription {
  @Prop({ required: true }) drug_name!: string;
  @Prop({ required: false }) form?: string;            // tablet, syrup, injection
  @Prop({ required: false }) strength?: string;        // 500mg
  @Prop({ required: true }) dosage!: string;           // 1 tablet
  @Prop({ required: true }) frequency!: string;        // 3x/day
  @Prop({ required: true }) duration!: string;         // 7 days
  @Prop({ required: false }) notes?: string;
  @Prop({ default: false }) allergy_override!: boolean; // doctor overrode allergy warning
  @Prop({ default: Date.now }) prescribed_at!: Date;
}

// B2-FIX: Replaced `any[]` — LabOrder is now a fully typed Mongoose sub-doc.
// Represents a physician's order for a lab test (CBC, lipid panel, urinalysis, etc.)
@Schema({ _id: false })
export class LabOrder {
  @Prop({ required: true }) test_code!: string;        // LOINC or local code
  @Prop({ required: true }) test_name!: string;        // "Complete Blood Count"
  @Prop({ required: false }) notes?: string;
  @Prop({
    required: true,
    enum: ['ordered', 'sample_collected', 'in_lab', 'resulted', 'cancelled'],
    default: 'ordered',
  })
  status!: string;
  @Prop({ required: true }) ordered_at!: Date;
  @Prop({ required: false }) resulted_at?: Date;
  @Prop({ required: false }) result_value?: string;   // free-text or structured result
  @Prop({ required: false }) result_unit?: string;    // "mg/dL"
  @Prop({ required: false }) reference_range?: string; // "70-100"
  @Prop({ required: false }) is_abnormal?: boolean;
}

@Schema({ timestamps: true })
export class Encounter {
  @Prop({ type: String, required: true }) org_id!: string;
  @Prop({ type: String, required: true }) facility_id!: string;
  @Prop({ type: String, required: true }) patient_id!: string;
  @Prop({ required: true }) doctor_id!: string;
  @Prop({ type: String, required: false }) appointment_id?: string;
  @Prop({ required: true }) visit_date!: Date;
  @Prop({
    required: true,
    enum: ['draft', 'in_progress', 'signed_off', 'archived'],
    default: 'in_progress',
  })
  status!: string;
  @Prop({ type: SchemaFactory.createForClass(Vitals), required: false }) vitals?: Vitals;
  @Prop({ type: SchemaFactory.createForClass(SoapNote), required: false }) soap?: SoapNote;
  @Prop({ type: [SchemaFactory.createForClass(Diagnosis)], default: [] }) diagnoses!: Diagnosis[];
  @Prop({ type: [SchemaFactory.createForClass(Prescription)], default: [] }) prescriptions!: Prescription[];
  // B2-FIX: was `any[]` — now LabOrder[] with full Mongoose sub-document schema
  @Prop({ type: [SchemaFactory.createForClass(LabOrder)], default: [] }) lab_orders!: LabOrder[];
  @Prop({ required: false }) signed_off_at?: Date;
  @Prop({ required: false }) signed_off_by?: string;
  @Prop({ required: false }) last_autosaved_at?: Date;
}

export const EncounterSchema = SchemaFactory.createForClass(Encounter);

// Enforce: one encounter per appointment (unique index)
EncounterSchema.index(
  { appointment_id: 1 },
  { unique: true, sparse: true, partialFilterExpression: { appointment_id: { $exists: true } } },
);

// Tenant-scoped lookup
EncounterSchema.index({ org_id: 1, patient_id: 1, visit_date: -1 });

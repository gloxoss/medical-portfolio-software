import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

// ─── Sub-documents ────────────────────────────────────────────────────────────

@Schema({ _id: false })
export class PatientName {
  @Prop({ required: true, trim: true }) first!: string;
  @Prop({ required: true, trim: true }) last!: string;
  @Prop({ required: true }) display!: string; // "first last" — indexed for search
}

@Schema({ _id: true })
export class Allergy {
  @Prop({ required: true }) substance!: string;
  // Normalized form used for drug-interaction matching (lowercase)
  @Prop({ required: true }) substance_normalized!: string;
  @Prop({ enum: ['drug', 'food', 'environmental', 'other'], required: true }) type!: string;
  @Prop() reaction?: string;
  @Prop({ enum: ['mild', 'moderate', 'severe', 'life-threatening'], required: true }) severity!: string;
  @Prop({ default: Date.now }) recorded_at!: Date;
}

@Schema({ _id: false })
export class Problem {
  @Prop({ required: true }) condition!: string;
  @Prop() icd_code?: string;
  @Prop({ enum: ['active', 'resolved', 'chronic'], default: 'active' }) status!: string;
  @Prop({ default: Date.now }) onset_at!: Date;
}

@Schema({ _id: false })
export class PatientDocument {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) type!: string; // 'lab_report', 'id_scan', 'consent', etc.
  @Prop({ required: true }) url!: string;  // Cloudflare R2 URL
  @Prop({ default: Date.now }) uploaded_at!: Date;
}

@Schema({ _id: false })
export class EmergencyContact {
  @Prop({ required: true }) name!: string;
  @Prop({ required: true }) relationship!: string;
  @Prop({ required: true }) phone!: string;
}

// ─── Patient Document ─────────────────────────────────────────────────────────

export type PatientDocument_ = HydratedDocument<Patient>;

@Schema({
  collection: 'patients',
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
})
export class Patient {
  // Tenant scope — ALWAYS filter by this. Never expose cross-org data.
  @Prop({ required: true, index: true }) org_id!: string;

  // MRN — unique per org, format: {PREFIX}-{YYYY}-{SEQ:05}
  // Uniqueness enforced by compound index: { org_id, mrn }
  @Prop({ required: true }) mrn!: string;

  @Prop({ type: PatientName, required: true }) name!: PatientName;

  @Prop() dob?: Date;

  @Prop({ enum: ['male', 'female', 'other', 'unknown'], default: 'unknown' }) gender!: string;

  @Prop({ enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] }) blood_type?: string;

  @Prop({ required: true, index: true }) phone!: string;

  @Prop() email?: string;

  @Prop({ index: true }) national_id?: string;

  @Prop({ type: Object }) address?: Record<string, unknown>;

  @Prop({ type: EmergencyContact }) emergency_contact?: EmergencyContact;

  @Prop({ type: [Allergy], default: [] }) allergies!: Allergy[];

  @Prop({ type: [Problem], default: [] }) problem_list!: Problem[];

  @Prop({ type: [PatientDocument], default: [] }) documents!: PatientDocument[];

  @Prop({ enum: ['active', 'deceased', 'transferred'], default: 'active', index: true })
  status!: string;
}

export const PatientSchema = SchemaFactory.createForClass(Patient);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Unique MRN within an org
PatientSchema.index({ org_id: 1, mrn: 1 }, { unique: true });

// Text search across display name, phone, mrn, national_id
PatientSchema.index(
  { 'name.display': 'text', phone: 'text', mrn: 'text', national_id: 'text' },
  { name: 'patient_search_idx', weights: { mrn: 10, 'name.display': 5, phone: 3 } },
);

// Quick lookup by phone within org
PatientSchema.index({ org_id: 1, phone: 1 });

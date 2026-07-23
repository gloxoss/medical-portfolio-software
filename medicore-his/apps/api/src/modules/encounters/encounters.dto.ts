import {
  IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum,
  IsNumber, IsBoolean, IsArray, ValidateNested, Min, Max,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── Create Encounter ────────────────────────────────────────────────────────

export class CreateEncounterDto {
  @IsString() @IsNotEmpty() patient_id!: string;
  @IsString() @IsOptional() appointment_id?: string;
  @IsDateString() @IsNotEmpty() visit_date!: string;
}

// ─── Vitals (partial update — all fields optional) ───────────────────────────

export class UpdateVitalsDto {
  @IsString() @IsOptional() bp?: string;
  @IsNumber() @IsOptional() hr?: number;
  @IsNumber() @IsOptional() temp?: number;
  @IsNumber() @IsOptional() weight?: number;
  @IsNumber() @IsOptional() height?: number;
  @IsNumber() @IsOptional() bmi?: number;
  @IsNumber() @IsOptional() @Min(0) @Max(100) spo2?: number;
}

// ─── SOAP (partial update — autosaved on blur) ───────────────────────────────

export class UpdateSoapDto {
  @IsString() @IsOptional() subjective?: string;
  @IsString() @IsOptional() objective?: string;
  @IsString() @IsOptional() assessment?: string;
  @IsString() @IsOptional() plan?: string;
}

// ─── Add Diagnosis ───────────────────────────────────────────────────────────

export class AddDiagnosisDto {
  @IsString() @IsNotEmpty() code!: string;             // ICD-10 code
  @IsString() @IsNotEmpty() description!: string;
  @IsEnum(['primary', 'secondary']) type!: string;
}

// ─── Add Prescription ────────────────────────────────────────────────────────

export class AddPrescriptionDto {
  @IsString() @IsNotEmpty() drug_name!: string;
  @IsString() @IsOptional() form?: string;
  @IsString() @IsOptional() strength?: string;
  @IsString() @IsNotEmpty() dosage!: string;
  @IsString() @IsNotEmpty() frequency!: string;
  @IsString() @IsNotEmpty() duration!: string;
  @IsString() @IsOptional() notes?: string;
  @IsBoolean() @IsOptional() allergy_override?: boolean; // explicit override for allergy warnings
}

// ─── Add Lab Order ──────────────────────────────────────────────────────────

export class AddLabOrderDto {
  @IsString() @IsNotEmpty() test_code!: string;
  @IsString() @IsNotEmpty() test_name!: string;
  @IsString() @IsOptional() notes?: string;
}

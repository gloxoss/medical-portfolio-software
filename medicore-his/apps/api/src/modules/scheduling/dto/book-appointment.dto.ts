import { IsString, IsDateString, IsOptional, IsEnum } from 'class-validator';

export class BookAppointmentDto {
  @IsString() patient_id!: string;
  @IsString() doctor_id!: string;
  @IsString() facility_id!: string;
  @IsDateString() start_time!: string; // ISO 8601
  @IsOptional() @IsEnum(['consultation', 'followup', 'emergency', 'telemedicine']) type?: string;
  @IsOptional() @IsString() notes?: string;
}

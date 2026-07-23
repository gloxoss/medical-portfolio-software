import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVideoSessionDto {
  @IsString()
  @IsNotEmpty()
  appointment_id!: string;

  @IsOptional()
  @IsBoolean()
  recording_enabled?: boolean;
}

export class EndVideoSessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  reason?: string;
}

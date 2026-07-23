import { IsString, IsDateString } from 'class-validator';

export class AvailabilityQueryDto {
  @IsDateString() date!: string;       // "2026-04-10"
  @IsString() facility_id!: string;
}

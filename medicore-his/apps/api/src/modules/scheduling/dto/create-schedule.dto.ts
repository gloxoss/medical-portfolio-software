import { IsString, IsInt, Min, Max, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BreakSlot {
  @IsString() start!: string; // "12:00"
  @IsString() end!: string;   // "13:00"
}

export class CreateScheduleDto {
  @IsString() facility_id!: string;
  @IsInt() @Min(0) @Max(6) day_of_week!: number; // 0=Sun, 6=Sat
  @IsString() start_time!: string; // "09:00"
  @IsString() end_time!: string;   // "17:00"
  @IsOptional() @IsInt() @Min(5) @Max(120) slot_minutes?: number;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => BreakSlot) breaks?: BreakSlot[];
}

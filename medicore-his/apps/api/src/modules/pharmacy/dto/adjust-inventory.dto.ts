import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum InventoryAdjustmentType {
  RECEIVE = 'RECEIVE',
  WRITE_OFF = 'WRITE_OFF',
  RETURN = 'RETURN',
  ADJUST = 'ADJUST',
}

export class AdjustInventoryDto {
  @IsString() drug_id!: string;
  @IsString() facility_id!: string;
  @IsEnum(InventoryAdjustmentType) type!: InventoryAdjustmentType;
  @IsInt() @Min(1) quantity!: number;
  @IsString() @IsOptional() batch_number?: string;
  @IsDateString() @IsOptional() expiry_date?: string;
  @IsString() @IsOptional() reference?: string;
  @IsNumber() @Min(0) @IsOptional() unit_cost?: number;
  @IsNumber() @Min(0) @IsOptional() unit_price?: number;
  @IsInt() @Min(0) @IsOptional() reorder_level?: number;
}

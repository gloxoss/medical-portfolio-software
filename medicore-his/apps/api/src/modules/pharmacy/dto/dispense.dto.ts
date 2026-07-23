import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class DispenseItemDto {
  @IsString() drug_id!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsString() @IsOptional() batch_number?: string;
  @IsString() @IsOptional() drug_name?: string;
}

export class DispenseDto {
  @IsString() patient_id!: string;
  @IsString() encounter_id!: string;
  @IsString() facility_id!: string;
  @IsString() @IsOptional() prescription_id?: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => DispenseItemDto)
  items!: DispenseItemDto[];
}

import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class CreatePurchaseOrderItemDto {
  @IsString() drug_id!: string;
  @IsInt() @Min(1) quantity!: number;
  @IsNumber() @Min(0) unit_cost!: number;
  @IsString() @IsOptional() batch_number?: string;
  @IsDateString() @IsOptional() expiry_date?: string;
  @IsNumber() @Min(0) @IsOptional() unit_price?: number;
  @IsInt() @Min(0) @IsOptional() reorder_level?: number;
}

export class CreatePurchaseOrderDto {
  @IsString() facility_id!: string;
  @IsString() supplier_id!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePurchaseOrderItemDto)
  items!: CreatePurchaseOrderItemDto[];
  @IsString() @IsOptional() notes?: string;
  @IsBoolean() @IsOptional() submit_now?: boolean;
}

export class ReceivePurchaseOrderDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => CreatePurchaseOrderItemDto)
  @IsOptional()
  items?: CreatePurchaseOrderItemDto[];
}

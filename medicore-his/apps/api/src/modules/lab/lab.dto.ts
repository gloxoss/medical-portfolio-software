import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Validate,
  ValidateNested,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { LabFlag, LabStatus } from '@medicore/shared-types';

const LAB_STATUS_VALUES: LabStatus[] = [
  'pending',
  'collected',
  'in_progress',
  'completed',
  'cancelled',
];

const LAB_FLAG_VALUES: LabFlag[] = ['normal', 'low', 'high', 'critical'];

@ValidatorConstraint({ name: 'isLabComponentValue', async: false })
class IsLabComponentValueConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' || typeof value === 'number';
  }

  defaultMessage(): string {
    return 'value must be a string or number';
  }
}

export class PlaceLabOrderDto {
  @IsString()
  @IsNotEmpty()
  patientId!: string;

  @IsString()
  @IsNotEmpty()
  encounterId!: string;

  @IsString()
  @IsNotEmpty()
  panelCode!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class ListLabOrdersQueryDto {
  @IsString()
  @IsOptional()
  patientId?: string;

  @IsString()
  @IsOptional()
  encounterId?: string;

  @IsEnum(LAB_STATUS_VALUES)
  @IsOptional()
  status?: LabStatus;
}

export class UpdateLabOrderStatusDto {
  @IsEnum(LAB_STATUS_VALUES)
  status!: LabStatus;
}

export class LabComponentDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Validate(IsLabComponentValueConstraint)
  value!: number | string;

  @IsString()
  @IsNotEmpty()
  unit!: string;

  @IsNumber()
  @IsOptional()
  refRangeLow?: number;

  @IsNumber()
  @IsOptional()
  refRangeHigh?: number;

  @IsEnum(LAB_FLAG_VALUES)
  flag!: LabFlag;
}

export class RecordLabResultDto {
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => LabComponentDto)
  components!: LabComponentDto[];

  @IsString()
  @IsOptional()
  freetextNote?: string;
}

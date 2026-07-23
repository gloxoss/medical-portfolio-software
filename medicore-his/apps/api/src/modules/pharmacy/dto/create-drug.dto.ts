import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDrugDto {
  @IsString() @IsNotEmpty() name!: string;
  @IsString() @IsOptional() generic_name?: string;
  @IsString() @IsNotEmpty() form!: string;
  @IsString() @IsNotEmpty() strength!: string;
  @IsString() @IsOptional() manufacturer?: string;
  @IsString() @IsOptional() category?: string;
  @IsString() @IsOptional() unit?: string;
  @IsNumber() @Min(0) price!: number;
}

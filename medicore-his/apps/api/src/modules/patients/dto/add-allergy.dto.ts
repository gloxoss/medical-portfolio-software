import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export class AddAllergyDto {
  @IsString() @MinLength(1) substance!: string;

  @IsEnum(['drug', 'food', 'environmental', 'other']) type!: string;

  @IsOptional() @IsString() reaction?: string;

  @IsEnum(['mild', 'moderate', 'severe', 'life-threatening']) severity!: string;
}

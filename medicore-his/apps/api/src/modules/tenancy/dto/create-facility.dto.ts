import { IsString, MinLength, MaxLength, IsOptional, IsObject, IsEmail } from 'class-validator';

export class CreateFacilityDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsObject()
  address?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;
}

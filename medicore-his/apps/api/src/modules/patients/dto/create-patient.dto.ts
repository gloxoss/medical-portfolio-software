import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  MinLength,
  MaxLength,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  line1!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  city!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  country!: string;
}

class EmergencyContactDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  relationship!: string;

  @IsString()
  @MinLength(6)
  @MaxLength(20)
  phone!: string;
}

export class CreatePatientDto {
  @IsString() @MinLength(1) @MaxLength(60) name_first!: string;
  @IsString() @MinLength(1) @MaxLength(60) name_last!: string;

  @IsString() @MinLength(6) @MaxLength(20) phone!: string;

  @IsOptional() @IsDateString() dob?: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

  @IsOptional() @IsString() national_id?: string;
  @IsOptional() @IsEmail() email?: string;

  @IsOptional()
  @IsEnum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
  blood_type?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => EmergencyContactDto)
  emergency_contact?: EmergencyContactDto;
}

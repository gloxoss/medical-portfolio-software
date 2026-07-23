import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsObject,
  Matches,
} from 'class-validator';

export class OnboardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  org_name!: string;

  // slug: lowercase letters, digits, hyphens only (e.g. "cabinet-el-amrani")
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase letters, digits, and hyphens only' })
  @MinLength(2)
  @MaxLength(60)
  org_slug!: string;

  // MRN prefix, e.g. "CEA" — used in patient IDs
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  @Matches(/^[A-Z0-9]+$/, { message: 'mrn_prefix must be uppercase letters and digits only' })
  mrn_prefix!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  facility_name!: string;

  @IsOptional()
  @IsObject()
  facility_address?: Record<string, unknown>;

  @IsEmail()
  admin_email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  admin_password!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  admin_first_name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  admin_last_name!: string;
}

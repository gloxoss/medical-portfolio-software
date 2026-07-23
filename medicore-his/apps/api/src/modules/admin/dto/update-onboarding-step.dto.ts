import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateOnboardingStepDto {
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}

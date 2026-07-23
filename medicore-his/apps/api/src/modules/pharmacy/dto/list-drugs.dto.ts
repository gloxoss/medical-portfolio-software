import { IsOptional, IsString } from 'class-validator';

export class ListDrugsDto {
  @IsString() @IsOptional() search?: string;
  @IsString() @IsOptional() category?: string;
}

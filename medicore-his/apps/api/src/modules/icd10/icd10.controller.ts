import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Icd10Service } from './icd10.service';

class Icd10SearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

@ApiTags('Clinical Codes')
@ApiBearerAuth('staff-jwt')
@ApiHeader({ name: 'x-facility-id', description: 'Active facility UUID', required: true })
@Controller('icd10')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class Icd10Controller {
  constructor(private readonly icd10Service: Icd10Service) {}

  private getFacilityId(headerValue?: string): string {
    if (!headerValue) {
      throw new BadRequestException('x-facility-id header is required');
    }

    return headerValue;
  }

  @Get('search')
  @Permissions('encounter.read')
  @ApiOperation({ summary: 'Search ICD-10 catalog by code or description' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'limit', required: false, description: 'Result size limit (max 50)' })
  @ApiResponse({ status: 200, description: 'ICD-10 search results' })
  search(
    @Headers('x-facility-id') facilityIdHeader: string,
    @Query() query: Icd10SearchQueryDto,
  ) {
    this.getFacilityId(facilityIdHeader);
    return this.icd10Service.search(query.q ?? '', query.limit);
  }
}

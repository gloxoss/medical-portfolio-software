import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TenancyService } from './tenancy.service';
import { OnboardDto } from './dto/onboard.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';

@ApiTags('Tenancy')
@Controller()
export class TenancyController {
  constructor(private readonly tenancyService: TenancyService) {}

  // POST /api/v1/orgs/onboard — public (no auth required for first-time setup)
  @Post('orgs/onboard')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Onboard a new organisation (public — no auth required)' })
  @ApiResponse({ status: 201, description: 'Organisation, facility, and admin user created' })
  @ApiResponse({ status: 400, description: 'Slug already taken or validation error' })
  async onboard(@Body() dto: OnboardDto): Promise<unknown> {
    return this.tenancyService.onboard(dto);
  }

  // GET /api/v1/orgs/:orgId — get org details
  @Get('orgs/:orgId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('staff-jwt')
  @ApiOperation({ summary: 'Get organisation details (must belong to org)' })
  @ApiResponse({ status: 200, description: 'Organisation record' })
  @ApiResponse({ status: 403, description: 'Org ID mismatch' })
  async getOrg(
    @Param('orgId') orgId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.tenancyService.getOrg(orgId, user.orgId);
  }

  // GET /api/v1/orgs/:orgId/facilities
  @Get('orgs/:orgId/facilities')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('staff-jwt')
  @ApiOperation({ summary: 'List all facilities for an organisation' })
  @ApiResponse({ status: 200, description: 'Array of facilities' })
  async getFacilities(
    @Param('orgId') orgId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.tenancyService.getFacilities(orgId, user.orgId);
  }

  // GET /api/v1/facilities/:facilityId/doctors
  // Returns active doctors assigned to a facility — used by appointment booking UI.
  @Get('facilities/:facilityId/doctors')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('staff-jwt')
  @ApiOperation({ summary: 'List active doctors assigned to a facility (used by booking UI)' })
  @ApiResponse({ status: 200, description: 'Array of doctor users' })
  async getDoctorsByFacility(
    @Param('facilityId') facilityId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.tenancyService.getDoctorsByFacility(facilityId, user.orgId);
  }

  // POST /api/v1/orgs/:orgId/facilities — requires settings.write
  @Post('orgs/:orgId/facilities')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.write')
  @ApiBearerAuth('staff-jwt')
  @ApiOperation({ summary: 'Create a new facility under an organisation (settings.write)' })
  @ApiResponse({ status: 201, description: 'Facility created' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async createFacility(
    @Param('orgId') orgId: string,
    @Body() dto: CreateFacilityDto,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.tenancyService.createFacility(orgId, user.orgId, dto);
  }
}

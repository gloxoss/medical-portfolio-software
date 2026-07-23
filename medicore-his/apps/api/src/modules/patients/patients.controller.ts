import {
  Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { AddAllergyDto } from './dto/add-allergy.dto';
import { SearchPatientsDto } from './dto/search-patients.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';

@ApiTags('Patients')
@ApiBearerAuth('staff-jwt')
@Controller('patients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // POST /api/v1/patients
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('patient.write')
  @ApiOperation({ summary: 'Register a new patient with auto-generated MRN' })
  @ApiResponse({ status: 201, description: 'Patient created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions (requires patient.write)' })
  register(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.patientsService.register(user.orgId, dto);
  }

  // GET /api/v1/patients/search?q=...&page=1&limit=20
  @Get('search')
  @Permissions('patient.read')
  @ApiOperation({ summary: 'Full-text patient search (name, MRN, phone)' })
  @ApiResponse({ status: 200, description: 'Paginated patient list' })
  search(
    @Query() dto: SearchPatientsDto,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.patientsService.search(user.orgId, dto);
  }

  // GET /api/v1/patients/:id
  @Get(':id')
  @Permissions('patient.read')
  @ApiOperation({ summary: 'Get patient by MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Patient document' })
  @ApiResponse({ status: 404, description: 'Patient not found in this org' })
  getById(
    @Param('id') id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.patientsService.getById(user.orgId, id);
  }

  // POST /api/v1/patients/:id/allergies
  @Post(':id/allergies')
  @HttpCode(HttpStatus.OK)
  @Permissions('patient.write')
  @ApiOperation({ summary: 'Add an allergy entry to a patient record' })
  @ApiResponse({ status: 200, description: 'Allergy added' })
  addAllergy(
    @Param('id') id: string,
    @Body() dto: AddAllergyDto,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.patientsService.addAllergy(user.orgId, id, dto);
  }
}

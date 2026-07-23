import {
  Controller, Get, Post, Put, Delete, Param, Body, Query, Headers,
  UseGuards, HttpCode, HttpStatus, BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EncountersService } from './encounters.service';
import {
  CreateEncounterDto, UpdateVitalsDto, UpdateSoapDto,
  AddDiagnosisDto, AddPrescriptionDto, AddLabOrderDto
} from './encounters.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';

@ApiTags('Encounters')
@ApiBearerAuth('staff-jwt')
@ApiHeader({ name: 'x-facility-id', description: 'Active facility UUID', required: true })
@Controller('encounters')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class EncountersController {
  constructor(private readonly service: EncountersService) {}

  private getFacilityId(facilityIdHeader?: string): string {
    if (!facilityIdHeader) {
      throw new BadRequestException('x-facility-id header is required');
    }
    return facilityIdHeader;
  }

  // POST /api/v1/encounters
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Permissions('encounter.write')
  @ApiOperation({ summary: 'Open a new clinical encounter for a patient' })
  @ApiResponse({ status: 201, description: 'Encounter created (MongoDB document)' })
  create(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityId: string,
    @Body() dto: CreateEncounterDto,
  ) {
    return this.service.create(
      user.orgId,
      this.getFacilityId(facilityId),
      user.id,
      dto,
    );
  }

  // GET /api/v1/encounters/:id
  @Get(':id')
  @Permissions('encounter.read')
  @ApiOperation({ summary: 'Get full encounter document by ID' })
  @ApiResponse({ status: 200, description: 'Encounter document' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  get(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.getById(user.orgId, id);
  }

  // PUT /api/v1/encounters/:id/vitals
  @Put(':id/vitals')
  @Permissions('encounter.write')
  @ApiOperation({ summary: 'Update vitals (BP, HR, O2, temp, weight, height)' })
  updateVitals(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateVitalsDto,
  ) {
    return this.service.updateVitals(user.orgId, id, dto);
  }

  // PUT /api/v1/encounters/:id/soap
  @Put(':id/soap')
  @Permissions('encounter.write')
  @ApiOperation({ summary: 'Autosave SOAP note fields (S/O/A/P)' })
  updateSoap(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: UpdateSoapDto,
  ) {
    return this.service.updateSoap(user.orgId, id, dto);
  }

  // POST /api/v1/encounters/:id/diagnoses
  @Post(':id/diagnoses')
  @HttpCode(HttpStatus.OK)
  @Permissions('encounter.write')
  @ApiOperation({ summary: 'Add an ICD-10 diagnosis to an encounter' })
  addDiagnosis(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddDiagnosisDto,
  ) {
    return this.service.addDiagnosis(user.orgId, id, dto);
  }

  // DELETE /api/v1/encounters/:id/diagnoses/:code
  @Delete(':id/diagnoses/:code')
  @HttpCode(HttpStatus.OK)
  @Permissions('encounter.write')
  @ApiOperation({ summary: 'Remove an ICD-10 diagnosis from an encounter' })
  @ApiResponse({ status: 200, description: 'Diagnosis removed from encounter' })
  @ApiResponse({ status: 404, description: 'Encounter or diagnosis not found' })
  @ApiResponse({ status: 422, description: 'Encounter is signed off and cannot be modified' })
  removeDiagnosis(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Param('code') code: string,
  ) {
    return this.service.removeDiagnosis(user.orgId, id, code);
  }

  // POST /api/v1/encounters/:id/prescriptions
  @Post(':id/prescriptions')
  @HttpCode(HttpStatus.OK)
  @Permissions('prescription.write')
  @ApiOperation({ summary: 'Add a medication prescription to an encounter' })
  addPrescription(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddPrescriptionDto,
  ) {
    return this.service.addPrescription(user.orgId, id, dto);
  }

  // POST /api/v1/encounters/:id/lab-orders
  @Post(':id/lab-orders')
  @HttpCode(HttpStatus.OK)
  @Permissions('lab.write')
  @ApiOperation({ summary: 'Place a lab order from within an encounter' })
  addLabOrder(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddLabOrderDto,
  ) {
    return this.service.addLabOrder(user.orgId, id, dto);
  }

  // POST /api/v1/encounters/:id/sign-off
  @Post(':id/sign-off')
  @HttpCode(HttpStatus.OK)
  @Permissions('encounter.sign')
  @ApiOperation({ summary: 'Sign off and lock encounter (encounter.sign — DOCTOR only)' })
  @ApiResponse({ status: 200, description: 'Encounter locked, status set to SIGNED' })
  signOff(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    return this.service.signOff(user.orgId, user.id, id);
  }

  // GET /api/v1/patients/:patientId/encounters?page=1&limit=20
  // Note: This route is registered here to keep encounter logic together.
  // In production, it might live in patients controller — either works.
  @Get('/patients/:patientId/encounters')
  @Permissions('encounter.read')
  @ApiOperation({ summary: 'List encounters for a patient (paginated)' })
  getPatientEncounters(
    @CurrentUser() user: RequestUser,
    @Param('patientId') patientId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getPatientEncounters(
      user.orgId,
      patientId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }
}

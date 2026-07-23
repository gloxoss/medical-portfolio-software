import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import type { RequestUser } from '../auth/types/request-user.type';
import { CreateVideoSessionDto, EndVideoSessionDto } from './telemedicine.dto';
import { TelemedicineService } from './telemedicine.service';

@ApiTags('Telemedicine')
@ApiBearerAuth('staff-jwt')
@ApiHeader({ name: 'x-facility-id', description: 'Active facility UUID', required: true })
@Controller('telemedicine')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  private getFacilityId(headerValue?: string): string {
    if (!headerValue) {
      throw new BadRequestException('x-facility-id header is required');
    }

    return headerValue;
  }

  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('appointment.write')
  @ApiOperation({ summary: 'Create (or retrieve) a telemedicine video session for appointment' })
  @ApiResponse({ status: 201, description: 'Session ready with doctor meeting token' })
  async createSession(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Body() dto: CreateVideoSessionDto,
  ) {
    return this.telemedicineService.createSessionForAppointment(
      user,
      this.getFacilityId(facilityIdHeader),
      dto,
    );
  }

  @Get('sessions/:id')
  @Permissions('appointment.read')
  @ApiOperation({ summary: 'Get telemedicine session details' })
  async getSession(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') sessionId: string,
  ) {
    return this.telemedicineService.getSessionForStaff(
      user,
      this.getFacilityId(facilityIdHeader),
      sessionId,
    );
  }

  @Patch('sessions/:id/join')
  @Permissions('appointment.write')
  @ApiOperation({ summary: 'Doctor joins telemedicine session' })
  async joinSession(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') sessionId: string,
  ) {
    return this.telemedicineService.joinDoctorSession(
      user,
      this.getFacilityId(facilityIdHeader),
      sessionId,
    );
  }

  @Post('sessions/:id/end')
  @Permissions('appointment.write')
  @ApiOperation({ summary: 'End telemedicine session and publish billing event' })
  async endSession(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') sessionId: string,
    @Body() dto: EndVideoSessionDto,
  ) {
    return this.telemedicineService.endSession(
      user,
      this.getFacilityId(facilityIdHeader),
      sessionId,
      dto,
    );
  }
}

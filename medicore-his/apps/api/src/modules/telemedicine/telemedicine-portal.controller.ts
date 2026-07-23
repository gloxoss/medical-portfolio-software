import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PortalJwtGuard } from '../portal/portal-jwt.guard';
import type { PatientRequestUser } from '../auth/types/request-user.type';
import { TelemedicineService } from './telemedicine.service';

@ApiTags('Portal')
@ApiCookieAuth('portal-cookie')
@Controller('portal/telemedicine')
@UseGuards(PortalJwtGuard)
export class TelemedicinePortalController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  @Get(':sessionId/join')
  @ApiOperation({ summary: '[PORTAL] Patient joins telemedicine session' })
  async joinSession(
    @Req() req: Request & { user: PatientRequestUser },
    @Param('sessionId') sessionId: string,
  ) {
    return this.telemedicineService.joinPatientSession(req.user, sessionId);
  }
}

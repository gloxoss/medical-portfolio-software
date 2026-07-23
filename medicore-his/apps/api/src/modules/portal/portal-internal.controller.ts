import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Param,
  Query,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiExcludeController } from '@nestjs/swagger';
import { PortalService } from './portal.service';

@ApiExcludeController()
@Controller('internal/patients')
export class PortalInternalController {
  constructor(
    private readonly portalService: PortalService,
    private readonly config: ConfigService,
  ) {}

  @Get(':id/consent')
  async getPatientConsent(
    @Param('id') patientId: string,
    @Query('type') consentType: string,
    @Query('org_id') orgId: string,
    @Headers('x-internal-service-token') internalToken?: string,
  ) {
    const expectedToken = this.config.get<string>('INTERNAL_SERVICE_TOKEN');

    if (!expectedToken) {
      throw new ServiceUnavailableException('INTERNAL_SERVICE_TOKEN is not configured');
    }

    if (!internalToken || internalToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal service token');
    }

    if (!orgId) {
      throw new BadRequestException('org_id query parameter is required');
    }

    return this.portalService.getInternalConsentStatus(patientId, orgId, consentType);
  }
}

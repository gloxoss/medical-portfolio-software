import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';
import { UpdateOnboardingStepDto } from './dto/update-onboarding-step.dto';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth('staff-jwt')
@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('onboarding')
  @ApiOperation({ summary: 'Get onboarding state for the authenticated organization' })
  @ApiResponse({ status: 200, description: 'Current onboarding state' })
  async getOnboardingState(@CurrentUser() user: RequestUser): Promise<unknown> {
    return this.adminService.getOnboardingState(user.orgId, user.id);
  }

  @Patch('onboarding/step/:step')
  @ApiOperation({ summary: 'Mark an onboarding step as completed or skipped' })
  @ApiResponse({ status: 200, description: 'Updated onboarding state' })
  async updateOnboardingStep(
    @Param('step') step: string,
    @Body() dto: UpdateOnboardingStepDto,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.adminService.updateOnboardingStep(user.orgId, user.id, step, dto.skipped ?? false);
  }

  @Patch('orgs/:id/activate')
  @ApiOperation({ summary: 'Activate organization after onboarding requirements are met' })
  @ApiResponse({ status: 200, description: 'Organization activated' })
  async activateOrganization(
    @Param('id') orgId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<unknown> {
    return this.adminService.activateOrganization(orgId, user.orgId, user.id);
  }
}

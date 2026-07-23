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
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';
import {
  ListLabOrdersQueryDto,
  PlaceLabOrderDto,
  RecordLabResultDto,
  UpdateLabOrderStatusDto,
} from './lab.dto';
import { LabService } from './lab.service';

@ApiTags('Lab')
@ApiBearerAuth('staff-jwt')
@ApiHeader({ name: 'x-facility-id', description: 'Active facility UUID', required: true })
@Controller('lab')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabController {
  constructor(private readonly labService: LabService) {}

  private getFacilityId(facilityIdHeader?: string): string {
    if (!facilityIdHeader) {
      throw new BadRequestException('x-facility-id header is required');
    }

    return facilityIdHeader;
  }

  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @Permissions('lab.write')
  @ApiOperation({ summary: 'Place a new lab order' })
  @ApiResponse({ status: 201, description: 'Lab order created in MongoDB' })
  async placeOrder(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Body() dto: PlaceLabOrderDto,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.placeOrder(user.orgId, facilityId, user.id, dto);
  }

  @Get('orders')
  @Permissions('lab.read')
  @ApiOperation({ summary: 'List lab orders for the facility (optional filters: status/patient/encounter)' })
  async listOrders(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Query() query: ListLabOrdersQueryDto,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.listOrders(user.orgId, facilityId, query);
  }

  @Get('orders/:id')
  @Permissions('lab.read')
  @ApiOperation({ summary: 'Get lab order by ID' })
  async getOrderById(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') orderId: string,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.getOrderById(user.orgId, facilityId, orderId);
  }

  @Patch('orders/:id/status')
  @Permissions('lab.result')
  @ApiOperation({ summary: 'Update lab order status (COLLECTED → IN_PROGRESS → COMPLETED)' })
  async updateStatus(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') orderId: string,
    @Body() dto: UpdateLabOrderStatusDto,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.updateStatus(user.orgId, facilityId, orderId, dto.status);
  }

  @Post('orders/:id/result')
  @HttpCode(HttpStatus.OK)
  @Permissions('lab.result')
  @ApiOperation({ summary: 'Record lab result values for a completed order' })
  async recordResult(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') orderId: string,
    @Body() dto: RecordLabResultDto,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.recordResult(user.orgId, facilityId, orderId, user.id, dto);
  }

  @Get('orders/:id/result')
  @Permissions('lab.read')
  @ApiOperation({ summary: 'Get result document for a completed lab order' })
  async getResult(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('id') orderId: string,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.getResult(user.orgId, facilityId, orderId);
  }

  @Get('patients/:patientId/results')
  @Permissions('lab.read')
  @ApiOperation({ summary: 'Get all completed lab results for a patient' })
  async getPatientResults(
    @CurrentUser() user: RequestUser,
    @Headers('x-facility-id') facilityIdHeader: string,
    @Param('patientId') patientId: string,
  ) {
    const facilityId = this.getFacilityId(facilityIdHeader);
    return this.labService.getResultsForPatient(user.orgId, facilityId, patientId);
  }
}

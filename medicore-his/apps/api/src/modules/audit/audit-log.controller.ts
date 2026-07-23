import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuditLogService } from './audit-log.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';

@ApiTags('Audit Log')
@ApiBearerAuth('staff-jwt')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  @Permissions('audit.read')
  @ApiOperation({ summary: 'Query immutable audit trail (ORG_ADMIN only)' })
  @ApiResponse({ status: 200, description: 'Paginated audit log entries (MongoDB)' })
  @ApiResponse({ status: 403, description: 'Requires audit.read (ORG_ADMIN)' })
  getAuditLogs(
    @Query() dto: GetAuditLogsDto,
    @CurrentUser() user: RequestUser,
  ) {
    return this.auditLogService.getAuditLogs(user.orgId, dto);
  }
}

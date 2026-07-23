import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

interface CreateAuditLogParams {
  orgId: string;
  facilityId?: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any>;
  ipAddress: string;
  userAgent?: string;
}

@Injectable()
export class AuditLogService {
  constructor(
    @InjectModel(AuditLog.name)
    private auditLogModel: Model<AuditLogDocument>,
  ) {}

  async log(params: CreateAuditLogParams): Promise<void> {
    await this.auditLogModel.create({
      org_id: params.orgId,
      facility_id: params.facilityId,
      user_id: params.userId,
      user_name: params.userName,
      user_role: params.userRole,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      metadata: params.metadata || {},
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
    });
  }

  async getAuditLogs(
    orgId: string,
    queryDto: GetAuditLogsDto,
  ): Promise<{ data: AuditLogDocument[]; total: number }> {
    const { q, entity_type, action, page, limit } = queryDto;
    
    const filter: Record<string, any> = { org_id: orgId };
    
    if (entity_type) {
      filter.entity_type = entity_type;
    }
    
    if (action) {
      filter.action = action;
    }

    if (q) {
      filter.$text = { $search: q };
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.auditLogModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.auditLogModel.countDocuments(filter),
    ]);

    return { data, total };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { NotificationLog, NotificationLogDocument } from './schemas/notification-log.schema';

@Injectable()
export class NotificationRepository {
  constructor(
    private readonly prisma: PrismaService,
    @InjectModel(NotificationLog.name)
    private readonly model: Model<NotificationLogDocument>,
  ) {}

  async getTemplate(orgId: string, event: string, language: string = 'fr') {
    return this.prisma.notificationTemplate.findFirst({
      where: { orgId, event, language, isActive: true },
    });
  }

  async logNotification(data: {
    org_id: string;
    entity_id: string;
    channel: 'sms' | 'email';
    to: string;
    subject?: string;
    body: string;
    status: 'sent' | 'failed' | 'delivered' | 'skipped';
    error_reason?: string;
  }) {
    return this.model.create(data);
  }
}

import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventPattern, Payload } from '@nestjs/microservices';
import Redis from 'ioredis';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { NotificationChannel } from '../interfaces/notification-provider.interface';
import { NotificationService } from '../notification.service';

type FailedDeliveryPayload = {
  channel: NotificationChannel;
  recipient: string;
  template: string;
  vars: Record<string, string>;
  attempt?: number;
  originalEvent?: string;
  orgId?: string;
  patientId?: string;
};

@Injectable()
export class RetrySubscriber implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RetrySubscriber.name);
  private readonly retryDelaysSeconds = [5 * 60, 30 * 60, 2 * 60 * 60];
  private readonly pendingTimers = new Map<string, NodeJS.Timeout>();
  private redis: Redis | null = null;

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit(): void {
    this.redis = new Redis(this.config.get<string>('REDIS_URL') ?? 'redis://:medicore@localhost:6379');
  }

  async onModuleDestroy(): Promise<void> {
    for (const timer of this.pendingTimers.values()) {
      clearTimeout(timer);
    }
    this.pendingTimers.clear();

    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
    }
  }

  @EventPattern('notifications.failed')
  async handleFailedDelivery(@Payload() payload: FailedDeliveryPayload): Promise<void> {
    const currentAttempt = payload.attempt ?? 1;

    if (currentAttempt >= 3) {
      await this.recordPermanentFailure(payload);
      return;
    }

    const delaySeconds = this.retryDelaysSeconds[currentAttempt - 1] ?? this.retryDelaysSeconds[2];
    const nextPayload: FailedDeliveryPayload = {
      ...payload,
      attempt: currentAttempt + 1,
    };

    const retryKey = `retry:${payload.channel}:${payload.recipient}:${currentAttempt}:${Date.now()}`;

    if (this.redis) {
      await this.redis.setex(retryKey, delaySeconds, JSON.stringify(nextPayload));
    }

    const timeout = setTimeout(() => {
      void this.executeRetry(retryKey, nextPayload);
    }, delaySeconds * 1000);

    this.pendingTimers.set(retryKey, timeout);
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async clearSettledRetryTimers(): Promise<void> {
    if (!this.redis || this.pendingTimers.size === 0) return;

    for (const [retryKey, timer] of this.pendingTimers.entries()) {
      const ttl = await this.redis.ttl(retryKey);
      if (ttl === -2) {
        clearTimeout(timer);
        this.pendingTimers.delete(retryKey);
      }
    }
  }

  private async executeRetry(retryKey: string, payload: FailedDeliveryPayload): Promise<void> {
    const orgId = payload.orgId ?? 'unknown-org';
    const patientId = payload.patientId ?? 'unknown-patient';

    const result = await this.notificationService.notify(
      payload.channel,
      payload.recipient,
      payload.template,
      payload.vars,
      {
        orgId,
        patientId,
        attempt: payload.attempt,
        originalEvent: payload.originalEvent,
      },
    );

    if (result.ok) {
      await this.redis?.del(retryKey);
      const timer = this.pendingTimers.get(retryKey);
      if (timer) {
        clearTimeout(timer);
        this.pendingTimers.delete(retryKey);
      }
      return;
    }

    if ((payload.attempt ?? 1) >= 3) {
      await this.recordPermanentFailure(payload);
      return;
    }

    await this.handleFailedDelivery(payload);
  }

  private async recordPermanentFailure(payload: FailedDeliveryPayload): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `
          INSERT INTO notification_failures (
            channel,
            recipient,
            template,
            vars,
            attempted_at,
            org_id
          ) VALUES ($1, $2, $3, $4::jsonb, NOW(), $5)
        `,
        payload.channel,
        payload.recipient,
        payload.template,
        JSON.stringify(payload.vars ?? {}),
        payload.orgId ?? null,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to persist notification failure audit record: ${message}`);
    }
  }
}

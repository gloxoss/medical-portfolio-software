import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Thin pub/sub wrapper. Publish domain events to Redis channels so other
// modules (and future microservices) can react without tight coupling.
//
// Usage:
//   await this.events.publish('tenancy.facility.created', { facilityId, orgId });
@Injectable()
export class RedisPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisPublisherService.name);
  private client!: Redis;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const url = this.config.get<string>('REDIS_URL', 'redis://:medicore@localhost:6379');
    this.client = new Redis(url);

    this.client.on('connect', () =>
      this.logger.log('Redis publisher connected'),
    );
    this.client.on('error', (err: Error) =>
      this.logger.error('Redis publisher error', err.message),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  async publish(channel: string, payload: unknown): Promise<void> {
    const message = JSON.stringify({ channel, data: payload, ts: new Date().toISOString() });
    await this.client.publish(channel, message);
    this.logger.debug(`Published → ${channel}`);
  }
}

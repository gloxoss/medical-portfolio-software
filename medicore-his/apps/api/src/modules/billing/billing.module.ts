import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingRepository } from './billing.repository';
import { BillingEventHandler } from './billing.event-handler';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationModule } from '../notifications/notification.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { PaymentModule } from '../../infrastructure/providers/payment/payment.module';

import { BillingWebhookController } from './billing.webhook.controller';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    EventsModule,
    PaymentModule,
    NotificationModule,
    ClientsModule.registerAsync([
      {
        name: 'REDIS_BILLING',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => {
          const redisUrl = configService.get<string>('REDIS_URL');
          let host = configService.get<string>('REDIS_HOST', 'localhost');
          let port = Number(configService.get<number>('REDIS_PORT', 6379));
          let username = configService.get<string>('REDIS_USERNAME');
          let password = configService.get<string>('REDIS_PASSWORD');

          if (redisUrl) {
            try {
              const parsed = new URL(redisUrl);
              host = parsed.hostname || host;
              port = Number(parsed.port || port);
              username = username ?? (parsed.username ? decodeURIComponent(parsed.username) : undefined);
              password = password ?? (parsed.password ? decodeURIComponent(parsed.password) : undefined);
            } catch {
              // Keep host/port fallback when REDIS_URL is malformed.
            }
          }

          return {
            transport: Transport.REDIS,
            options: {
              host,
              port,
              username,
              password,
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [BillingController, BillingWebhookController],
  providers: [BillingService, BillingRepository, BillingEventHandler],
  exports: [BillingService],
})
export class BillingModule {}
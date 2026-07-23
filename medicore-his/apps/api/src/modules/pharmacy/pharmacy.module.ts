import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../infrastructure/events/events.module';
import { PatientsModule } from '../patients/patients.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyEventHandler } from './pharmacy.event-handler';
import { PharmacyQueueRepository } from './pharmacy-queue.repository';
import { PharmacyRepository } from './pharmacy.repository';
import { PharmacyService } from './pharmacy.service';
import {
  PharmacyQueueItem,
  PharmacyQueueItemSchema,
} from './schemas/pharmacy-queue-item.schema';
import { DispensingLog, DispensingLogSchema } from './schemas/dispensing-log.schema';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    PatientsModule,
    ConfigModule,
    MongooseModule.forFeature([
      { name: PharmacyQueueItem.name, schema: PharmacyQueueItemSchema },
      { name: DispensingLog.name, schema: DispensingLogSchema },
    ]),
    ClientsModule.registerAsync([
      {
        name: 'REDIS_PHARMACY',
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
  controllers: [PharmacyController, PharmacyEventHandler],
  providers: [PharmacyService, PharmacyRepository, PharmacyQueueRepository],
  exports: [PharmacyService],
})
export class PharmacyModule {}

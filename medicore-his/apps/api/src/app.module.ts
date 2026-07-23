import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infrastructure/database/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './infrastructure/events/events.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';
import { PatientsModule } from './modules/patients/patients.module';
import { SchedulingModule } from './modules/scheduling/scheduling.module';
import { EncountersModule } from './modules/encounters/encounters.module';
import { BillingModule } from './modules/billing/billing.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditLogModule } from './modules/audit/audit-log.module';
import { PortalModule } from './modules/portal/portal.module';
import { LabModule } from './modules/lab/lab.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { TelemedicineModule } from './modules/telemedicine/telemedicine.module';
import { Icd10Module } from './modules/icd10/icd10.module';
import { NotificationModule } from './modules/notifications/notification.module';
import { AdminModule } from './modules/admin/admin.module';

const isProduction = process.env.NODE_ENV === 'production';

function resolvePinoTransport(): { target: string; options: { colorize: boolean; singleLine: boolean } } | undefined {
  if (isProduction) {
    return undefined;
  }

  try {
    require.resolve('pino-pretty');
    return { target: 'pino-pretty', options: { colorize: true, singleLine: true } };
  } catch {
    // Fallback to plain JSON logs when pretty transport is unavailable.
    return undefined;
  }
}

@Module({
  imports: [
    // Global config — reads from .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),

    // Structured JSON logging (pino) — pretty-print in dev, JSON in prod
    LoggerModule.forRoot({
      pinoHttp: {
        level: isProduction ? 'info' : 'debug',
        transport: resolvePinoTransport(),
        // Redact sensitive fields from request logs
        redact: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
        // Add correlation ID to every log line
        customProps: (req) => {
          const requestIdHeader = req.headers['x-request-id'];
          const requestId = Array.isArray(requestIdHeader)
            ? requestIdHeader[0]
            : requestIdHeader;

          return {
            requestId: requestId ?? crypto.randomUUID(),
          };
        },
        autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
      },
    }),

    // Global rate limiting — 100 req / 60s per IP (overridden per route)
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),

    // Cron job scheduler
    ScheduleModule.forRoot(),

    // Database
    PrismaModule,
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI ?? 'mongodb://medicore:medicore@localhost:27017/medicore_dev?authSource=admin',
      }),
    }),

    // Infrastructure
    EventsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          url: configService.get<string>('REDIS_URL') ?? 'redis://:medicore@localhost:6379',
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    AuthModule,
    TenancyModule,
    PatientsModule,
    SchedulingModule,
    EncountersModule,
    BillingModule,
    AuditLogModule,
    LabModule,
    PharmacyModule,
    TelemedicineModule,
    Icd10Module,
    PortalModule,
    NotificationModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

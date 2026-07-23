import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './core/filters/all-exceptions.filter';
import { PinoLogger } from 'nestjs-pino';

// ─── CMI Mock Guard ───────────────────────────────────────────────────────────
// Prevents deploying with the hardcoded test store key.
// Throws at startup (not runtime) so misconfiguration is caught before traffic.
function assertNotMockCmiKey(): void {
  const key = process.env.CMI_STORE_KEY;
  const isMock = !key || key === 'mockStoreKey123';
  if (isMock && process.env.NODE_ENV === 'production') {
    throw new Error(
      '[FATAL] CMI_STORE_KEY is set to the mock test value in production. ' +
        'Set a real CMI store key before deploying.',
    );
  }
}

export function assertDevOtpCodeNotInProduction(): void {
  if (process.env.NODE_ENV === 'production' && process.env.DEV_OTP_CODE) {
    throw new Error(
      'FATAL: DEV_OTP_CODE must not be set in production. ' +
        'Remove it from your environment before deploying.',
    );
  }
}

async function bootstrap(): Promise<void> {
  assertNotMockCmiKey();
  assertDevOtpCodeNotInProduction();

  const app = await NestFactory.create(AppModule, {
    // Disable built-in logger — nestjs-pino takes over via LoggerModule
    bufferLogs: true,
  });

  // Swap NestJS default logger for pino
  app.useLogger(app.get(Logger));

  const logger = app.get(Logger);

  // Cookie parser — required for HttpOnly refresh token
  app.use(cookieParser());

  // CORS — allow configured frontend origins only
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-facility-id', 'x-org-id', 'x-requested-with'],
  });

  // Global validation pipe — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — structured error responses with request IDs
  const pinoLogger = await app.resolve(PinoLogger);
  app.useGlobalFilters(new AllExceptionsFilter(pinoLogger));

  // All routes prefixed with /api/v1
  app.setGlobalPrefix('api/v1');

  // ─── Swagger ──────────────────────────────────────────────────────────────
  // Available at /api/v1/docs (not mounted in production unless explicitly enabled)
  if (process.env.NODE_ENV !== 'production' || process.env.SWAGGER_ENABLED === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('MediCore HIS API')
      .setDescription(
        'Hospital Information System REST API. ' +
          'All staff endpoints require a Bearer JWT (from POST /auth/login). ' +
          'Portal endpoints use the portal_session httpOnly cookie.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization', in: 'header' },
        'staff-jwt',
      )
      .addCookieAuth('portal_session', { type: 'apiKey', in: 'cookie', name: 'portal_session' }, 'portal-cookie')
      .addCookieAuth('refresh_token', { type: 'apiKey', in: 'cookie', name: 'refresh_token' }, 'refresh-cookie')
      .addServer(`http://localhost:${process.env.APP_PORT ?? 3001}`, 'Local dev')
      .addTag('Health', 'Service health checks')
      .addTag('Auth', 'Staff authentication (login, refresh, logout, me)')
      .addTag('Tenancy', 'Organisations & facilities management')
      .addTag('Patients', 'Patient registration and record management')
      .addTag('Scheduling', 'Doctor schedules, availability, and appointment booking')
      .addTag('Encounters', 'Clinical encounters — SOAP, vitals, diagnoses, Rx, lab orders')
      .addTag('Billing', 'Invoices, payments (Stripe/CMI), PDF generation')
      .addTag('Lab', 'Lab order placement, result entry, and status tracking')
      .addTag('Pharmacy', 'Drug catalog, inventory, queue dispensing, suppliers and purchase orders')
      .addTag('Telemedicine', 'Video session orchestration, doctor join, and session billing trigger')
      .addTag('Portal Auth', 'Patient portal authentication (OTP)')
      .addTag('Portal', 'Patient-facing portal — records, appointments, invoices, GDPR')
      .addTag('Audit Log', 'Immutable audit trail (ORG_ADMIN only)')
      .addTag('AI Context', 'Internal clinical AI context aggregation')
      .addTag('Webhooks', 'Payment gateway callback endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/v1/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
    });

    logger.log('Swagger docs: http://localhost:' + (process.env.APP_PORT ?? 3001) + '/api/v1/docs');
  }

  const port = process.env.APP_PORT ?? 3001;
  const enableRedisMicroservice = process.env.ENABLE_REDIS_MICROSERVICE !== 'false';
  const redisUrl = process.env.REDIS_URL;

  let redisHost = process.env.REDIS_HOST ?? 'localhost';
  let redisPort = Number(process.env.REDIS_PORT ?? 6379);
  let redisUsername = process.env.REDIS_USERNAME;
  let redisPassword = process.env.REDIS_PASSWORD;

  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      redisHost = parsed.hostname || redisHost;
      redisPort = Number(parsed.port || redisPort);
      redisUsername = redisUsername ?? (parsed.username ? decodeURIComponent(parsed.username) : undefined);
      redisPassword = redisPassword ?? (parsed.password ? decodeURIComponent(parsed.password) : undefined);
    } catch {
      logger.warn('Invalid REDIS_URL value; falling back to REDIS_HOST/REDIS_PORT');
    }
  }

  if (enableRedisMicroservice) {
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.REDIS,
      options: {
        host: redisHost,
        port: redisPort,
        username: redisUsername,
        password: redisPassword,
      },
    });

    await app.startAllMicroservices();
    logger.log('Redis event microservice transport started');
  } else {
    logger.warn('Redis microservice disabled (ENABLE_REDIS_MICROSERVICE=false)');
  }

  await app.listen(port);

  logger.log(`MediCore API running on http://localhost:${port}/api/v1`);
  logger.log(`Health: http://localhost:${port}/api/v1/health`);
  logger.log(`Login:  POST http://localhost:${port}/api/v1/auth/login`);
}

if (require.main === module) {
  void bootstrap();
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule } from '@nestjs/config';

import { OtpModule } from '../../infrastructure/providers/otp/otp.module';

// Portal auth
import { PortalAuthService } from './portal-auth.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalJwtStrategy } from './portal-jwt.strategy';
import { PortalJwtGuard } from './portal-jwt.guard';

// Portal data
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { PortalInternalController } from './portal-internal.controller';

// Schemas (re-registered here to avoid cross-module coupling)
import { Patient, PatientSchema } from '../patients/schemas/patient.schema';
import { Appointment, AppointmentSchema } from '../scheduling/schemas/appointment.schema';

// Cross-module service dependencies
import { EncountersModule } from '../encounters/encounters.module';
import { LabModule } from '../lab/lab.module';
import { BillingModule } from '../billing/billing.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    ConfigModule,
    OtpModule,
    PassportModule,
    // JwtModule without secret — PortalAuthService signs with PORTAL_JWT_SECRET per call
    JwtModule.register({}),
    MongooseModule.forFeature([
      { name: Patient.name, schema: PatientSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
    // Needed for getPatientEncounters
    EncountersModule,
    LabModule,
    BillingModule,
    SchedulingModule,
    BullModule.registerQueue({ name: 'portal_privacy_requests' }),
  ],
  providers: [
    PortalAuthService,
    PortalJwtStrategy,
    PortalJwtGuard,
    PortalService,
  ],
  controllers: [
    PortalAuthController,
    PortalController,
    PortalInternalController,
  ],
})
export class PortalModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { EventsModule } from '../../infrastructure/events/events.module';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { SmsModule } from '../../infrastructure/providers/sms/sms.module';
import { EmailModule } from '../../infrastructure/providers/email/email.module';
import { PatientsModule } from '../patients/patients.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { LabModule } from '../lab/lab.module';
import { NotificationService } from './notification.service';
import { NotificationRepository } from './notification.repository';
import { NotificationEventHandler } from './notification.event-handler';
import { NotificationLog, NotificationLogSchema } from './schemas/notification-log.schema';
import { AppointmentReminderSubscriber } from './subscribers/appointment-reminder.subscriber';
import { LabResultSubscriber } from './subscribers/lab-result.subscriber';
import { InvoicePaidSubscriber } from './subscribers/invoice-paid.subscriber';
import { RetrySubscriber } from './subscribers/retry.subscriber';

@Module({
  imports: [
    ConfigModule,
    EventsModule,
    PrismaModule,
    MongooseModule.forFeature([{ name: NotificationLog.name, schema: NotificationLogSchema }]),
    ScheduleModule,
    SmsModule,
    EmailModule,
    PatientsModule,
    SchedulingModule,
    LabModule,
    BullModule.registerQueue({ name: 'reminders' }),
  ],
  providers: [
    NotificationService,
    NotificationRepository,
    NotificationEventHandler,
    AppointmentReminderSubscriber,
    LabResultSubscriber,
    InvoicePaidSubscriber,
    RetrySubscriber,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}

import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PatientsService } from '../../patients/patients.service';
import { RedisPublisherService } from '../../../infrastructure/events/redis-publisher.service';
import { SchedulingService } from '../../scheduling/scheduling.service';
import { NotificationService } from '../notification.service';
import { NotificationTemplates } from '../notification.templates';

type ReminderEventPayload = {
  orgId?: string;
  org_id?: string;
  facilityId?: string;
  facility_id?: string;
  appointmentId?: string;
  appointment_id?: string;
  patientId?: string;
  patient_id?: string;
  doctorId?: string;
  doctor_id?: string;
  startTime?: string;
  start_time?: string;
  newStartTime?: string;
  new_start_time?: string;
};

type PatientContact = {
  _id?: string;
  phone?: string;
  email?: string;
  name?: { display?: string };
};

@Injectable()
export class AppointmentReminderSubscriber {
  private readonly logger = new Logger(AppointmentReminderSubscriber.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly schedulingService: SchedulingService,
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  @Cron('0 8 * * *')
  async publishTomorrowReminders(): Promise<void> {
    const orgs = await this.prisma.organization.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'TRIAL'],
        },
      },
      select: { id: true },
    });

    for (const org of orgs) {
      const facilities = await this.prisma.facility.findMany({
        where: {
          orgId: org.id,
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      for (const facility of facilities) {
        const appointments = await this.schedulingService.getUpcomingAppointmentsForTomorrow(
          org.id,
          facility.id,
        );

        for (const appointment of appointments) {
          await this.redisPublisher.publish('appointment.reminder', {
            orgId: org.id,
            facilityId: facility.id,
            appointmentId: String(appointment._id),
            patientId: appointment.patient_id,
            doctorId: appointment.doctor_id,
            startTime: appointment.start_time.toISOString(),
          });
        }
      }
    }
  }

  @EventPattern('appointment.reminder')
  async handleAppointmentReminder(@Payload() payload: ReminderEventPayload): Promise<void> {
    await this.sendAppointmentMessage(payload, NotificationTemplates.APPOINTMENT_REMINDER, 'appointment.reminder');
  }

  @EventPattern('appointment.cancelled')
  async handleAppointmentCancelled(@Payload() payload: ReminderEventPayload): Promise<void> {
    await this.sendAppointmentMessage(payload, NotificationTemplates.APPOINTMENT_CANCELLED, 'appointment.cancelled');
  }

  @EventPattern('appointment.rescheduled')
  async handleAppointmentRescheduled(@Payload() payload: ReminderEventPayload): Promise<void> {
    await this.sendAppointmentMessage(payload, NotificationTemplates.APPOINTMENT_RESCHEDULED, 'appointment.rescheduled');
  }

  private async sendAppointmentMessage(
    payload: ReminderEventPayload,
    template: string,
    originalEvent: string,
  ): Promise<void> {
    const orgId = payload.orgId ?? payload.org_id;
    const facilityId = payload.facilityId ?? payload.facility_id;
    const patientId = payload.patientId ?? payload.patient_id;
    const doctorId = payload.doctorId ?? payload.doctor_id;
    const startTime = payload.newStartTime
      ?? payload.new_start_time
      ?? payload.startTime
      ?? payload.start_time;

    if (!orgId || !patientId || !facilityId || !startTime) {
      this.logger.warn(`Skipping ${originalEvent}: required fields missing`);
      return;
    }

    const patient = await this.patientsService.getById(orgId, patientId) as PatientContact;
    if (!patient) return;

    const [doctor, facility, settings] = await Promise.all([
      doctorId
        ? this.prisma.user.findUnique({
            where: { id: doctorId },
            select: { nameFirst: true, nameLast: true },
          })
        : null,
      this.prisma.facility.findUnique({
        where: { id: facilityId },
        select: { name: true },
      }),
      this.prisma.portalPatientSetting.findUnique({
        where: {
          patientId_orgId: {
            patientId,
            orgId,
          },
        },
        select: {
          smsNotifications: true,
          emailNotifications: true,
        },
      }),
    ]);

    const when = new Date(startTime);
    const vars = {
      patient_name: patient?.name?.display ?? 'Patient',
      doctor_name: doctor ? `${doctor.nameFirst} ${doctor.nameLast}`.trim() : 'Doctor',
      date: when.toISOString().slice(0, 10),
      time: when.toISOString().slice(11, 16),
      location: facility?.name ?? 'Clinic',
    };

    const smsEnabled = settings?.smsNotifications ?? true;
    const emailEnabled = settings?.emailNotifications ?? true;

    if (patient.phone && smsEnabled) {
      await this.notificationService.notify('sms', patient.phone, template, vars, {
        orgId,
        patientId,
        originalEvent,
      });
    }

    if (patient.email && emailEnabled) {
      await this.notificationService.notify('email', patient.email, template, vars, {
        orgId,
        patientId,
        originalEvent,
      });
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { PatientsService } from '../patients/patients.service';
import { NotificationService } from './notification.service';
import type { PatientDocument_ as PatientDoc } from '../patients/schemas/patient.schema';

interface AppointmentBookedEvent {
  orgId: string;
  facilityId: string;
  patientId: string;
  doctorId: string;
  date: string;
}

interface InvoiceSentEvent {
  orgId: string;
  invoiceId: string;
  patientId: string;
}

@Injectable()
export class NotificationEventHandler {
  private readonly logger = new Logger(NotificationEventHandler.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly prisma: PrismaService,
    private readonly patientsService: PatientsService,
    @InjectQueue('reminders') private readonly remindersQueue: Queue,
  ) {}

  @EventPattern('clinics.appointment.booked')
  async handleAppointmentBooked(@Payload() data: AppointmentBookedEvent) {
    this.logger.log(`Received booking event for ${data.patientId} on ${data.date}`);

    const patient = await this.patientsService.getById(data.orgId, data.patientId) as PatientDoc;
    if (!patient || !patient.phone) return;

    try {
      const facility = await this.prisma.facility.findUnique({ where: { id: data.facilityId } });
      const clinicName = facility ? facility.name : 'MediCore Healthcare';

      await this.notificationService.sendSms(
        data.orgId,
        String(patient._id),
        patient.phone,
        'clinics.appointment.booked',
        {
          date: data.date,
          clinic_name: clinicName,
        },
      );

      const appointmentDate = new Date(data.date);
      const reminderTime = new Date(appointmentDate.getTime() - 24 * 60 * 60 * 1000);
      const delay = Math.max(0, reminderTime.getTime() - Date.now());

      if (delay > 0) {
        this.logger.log(
          `Scheduling delayed job for ${data.patientId} at 24h prior to ${data.date} (delay: ${delay}ms)`,
        );
        await this.remindersQueue.add('sendReminder', data, { delay });
      }
    } catch (error) {
      this.logger.error(`Failed to send appointment booked SMS: ${error}`);
    }
  }

  @EventPattern('clinics.invoice.created')
  async handleInvoiceCreated(@Payload() data: InvoiceSentEvent) {
    const org = await this.prisma.organization.findUnique({ where: { id: data.orgId } });
    if (!org) return;

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: data.invoiceId },
      include: { items: true },
    });

    const patient = await this.patientsService.getById(data.orgId, data.patientId) as PatientDoc;

    if (invoice && patient && patient.email) {
      const pdf = await this.notificationService.generateInvoicePdf({
        invoiceNo: invoice.invoiceNo,
        patientId: String(patient._id),
        total: String(invoice.total),
        currency: invoice.currency,
        createdAt: invoice.createdAt,
        items: invoice.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: String(item.unitPrice),
          total: String(item.total),
        })),
      });

      await this.notificationService.sendEmailWithPdf(
        data.orgId,
        String(patient._id),
        patient.email,
        'clinics.invoice.created',
        {
          invoice_no: invoice.invoiceNo,
          amount: String(invoice.total),
        },
        pdf,
      );
    }
  }
}

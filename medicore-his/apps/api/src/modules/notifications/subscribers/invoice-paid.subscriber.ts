import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { PatientsService } from '../../patients/patients.service';
import { NotificationService } from '../notification.service';
import { NotificationTemplates } from '../notification.templates';

type InvoicePaidEventPayload = {
  invoiceId?: string;
  invoice_id?: string;
  patientId?: string;
  patient_id?: string;
  amount?: string | number;
  currency?: string;
  orgId?: string;
  org_id?: string;
  paidAt?: string;
  paid_at?: string;
};

type PatientContact = {
  _id?: string;
  phone?: string;
  email?: string;
};

@Injectable()
export class InvoicePaidSubscriber {
  private readonly logger = new Logger(InvoicePaidSubscriber.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly patientsService: PatientsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @EventPattern('invoice.paid')
  async handleInvoicePaid(@Payload() payload: InvoicePaidEventPayload): Promise<void> {
    const orgId = payload.orgId ?? payload.org_id;
    const invoiceId = payload.invoiceId ?? payload.invoice_id;
    const patientId = payload.patientId ?? payload.patient_id;

    if (!orgId || !invoiceId || !patientId) {
      this.logger.warn('Skipping invoice.paid: required fields missing');
      return;
    }

    const [invoice, patient] = await Promise.all([
      this.prisma.invoice.findFirst({
        where: {
          id: invoiceId,
          orgId,
        },
        include: { items: true },
      }),
      this.patientsService.getById(orgId, patientId) as Promise<PatientContact>,
    ]);

    if (!invoice || !patient) return;

    const paidDate = payload.paidAt ?? payload.paid_at ?? invoice.paidAt?.toISOString() ?? new Date().toISOString();
    const amount = String(payload.amount ?? invoice.total);
    const currency = payload.currency ?? invoice.currency;

    const vars = {
      invoice_no: invoice.invoiceNo,
      amount,
      currency,
      date: new Date(paidDate).toISOString().slice(0, 10),
    };

    const pdf = await this.notificationService.generateInvoicePdf({
      invoiceNo: invoice.invoiceNo,
      patientId,
      total: amount,
      currency,
      createdAt: invoice.createdAt,
      items: invoice.items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
    });

    if (patient.email) {
      const emailResult = await this.notificationService.notify(
        'email',
        patient.email,
        NotificationTemplates.INVOICE_RECEIPT,
        vars,
        {
          orgId,
          patientId,
          originalEvent: 'invoice.paid',
          attachment: {
            filename: `receipt-${invoice.invoiceNo}.pdf`,
            content: pdf,
            mimeType: 'application/pdf',
          },
        },
      );

      if (emailResult.ok) return;
    }

    if (!patient.phone) return;

    const portalBase = (this.config.get<string>('PORTAL_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');

    await this.notificationService.notify(
      'sms',
      patient.phone,
      NotificationTemplates.INVOICE_RECEIPT_SMS_FALLBACK,
      {
        amount,
        currency,
        date: vars.date,
        portal_url: `${portalBase}/portal/invoices`,
      },
      {
        orgId,
        patientId,
        originalEvent: 'invoice.paid',
      },
    );
  }
}

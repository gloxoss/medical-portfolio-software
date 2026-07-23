import { Inject, Injectable, Logger } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { EMAIL_PROVIDER, IEmailProvider } from '../../infrastructure/providers/email/email.interface';
import { ISmsProvider, SMS_PROVIDER } from '../../infrastructure/providers/sms/sms.interface';
import { NotificationRepository } from './notification.repository';
import {
  NotificationChannel,
  NotificationDispatchOptions,
  NotificationResult,
} from './interfaces/notification-provider.interface';

export interface InvoiceForPdf {
  invoiceNo: string;
  patientId: string;
  total: number | string;
  currency: string;
  createdAt?: Date | string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number | string;
    total: number | string;
  }>;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly repository: NotificationRepository,
    @Inject(SMS_PROVIDER)
    private readonly smsProvider: ISmsProvider,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: IEmailProvider,
    private readonly redisPublisher: RedisPublisherService,
  ) {}

  private hydrateTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => vars[key] ?? '');
  }

  async sendSms(
    orgId: string,
    patientId: string,
    to: string,
    event: string,
    vars: Record<string, string>,
  ): Promise<void> {
    const template = await this.repository.getTemplate(orgId, event, 'fr');
    if (!template || template.channel !== 'sms') {
      this.logger.warn(`No active SMS template for event '${event}'`);
      return;
    }

    const message = this.hydrateTemplate(template.body, vars);

    if (!this.smsProvider.isConfigured()) {
      this.logger.warn(
        `Twilio not configured — skipping SMS to ${to} (event: ${event}). ` +
        'Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to enable.',
      );
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'sms',
        to,
        body: message,
        status: 'skipped',
        error_reason: 'TWILIO_NOT_CONFIGURED',
      });
      return;
    }

    try {
      const result = await this.smsProvider.send({ to, body: message });
      this.logger.log(`[Twilio] SMS sent sid=${result.messageId ?? 'n/a'} to=${to} event=${event}`);

      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'sms',
        to,
        body: message,
        status: 'sent',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Twilio] SMS failed to=${to}: ${reason}`);
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'sms',
        to,
        body: message,
        status: 'failed',
        error_reason: reason,
      });
      throw error;
    }
  }

  async sendEmailWithPdf(
    orgId: string,
    patientId: string,
    to: string,
    event: string,
    vars: Record<string, string>,
    pdfBuffer: Buffer,
  ): Promise<void> {
    const template = await this.repository.getTemplate(orgId, event, 'fr');
    if (!template || template.channel !== 'email') {
      this.logger.warn(`No active email template for event '${event}'`);
      return;
    }

    const subject = this.hydrateTemplate(template.subject ?? 'Invoice', vars);
    const body = this.hydrateTemplate(template.body, vars);

    if (!this.emailProvider.isConfigured()) {
      this.logger.warn(
        `SendGrid not configured — skipping email to ${to} (event: ${event}). ` +
        'Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to enable.',
      );
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'email',
        to,
        subject,
        body,
        status: 'skipped',
        error_reason: 'SENDGRID_NOT_CONFIGURED',
      });
      return;
    }

    try {
      await this.emailProvider.send({
        to,
        subject,
        html: body,
        attachments: [
          {
            contentBase64: pdfBuffer.toString('base64'),
            filename: `invoice-${vars['invoice_no'] ?? 'document'}.pdf`,
            mimeType: 'application/pdf',
            disposition: 'attachment',
          },
        ],
      });

      this.logger.log(`[SendGrid] Email sent to=${to} subject="${subject}" pdf=${pdfBuffer.length}b`);
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'email',
        to,
        subject,
        body,
        status: 'sent',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`[SendGrid] Email failed to=${to}: ${reason}`);
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'email',
        to,
        subject,
        body,
        status: 'failed',
        error_reason: reason,
      });
      throw error;
    }
  }

  async sendEmail(
    orgId: string,
    patientId: string,
    to: string,
    event: string,
    vars: Record<string, string>,
  ): Promise<void> {
    const template = await this.repository.getTemplate(orgId, event, 'fr');
    if (!template || template.channel !== 'email') {
      this.logger.warn(`No active email template for event '${event}'`);
      return;
    }

    const subject = this.hydrateTemplate(template.subject ?? 'Notification', vars);
    const body = this.hydrateTemplate(template.body, vars);

    if (!this.emailProvider.isConfigured()) {
      this.logger.warn(
        `SendGrid not configured — skipping email to ${to} (event: ${event}). ` +
        'Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL to enable.',
      );
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'email',
        to,
        subject,
        body,
        status: 'skipped',
        error_reason: 'SENDGRID_NOT_CONFIGURED',
      });
      return;
    }

    try {
      await this.emailProvider.send({ to, subject, html: body });

      this.logger.log(`[SendGrid] Email sent to=${to} subject="${subject}"`);
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'email',
        to,
        subject,
        body,
        status: 'sent',
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`[SendGrid] Email failed to=${to}: ${reason}`);
      await this.repository.logNotification({
        org_id: orgId,
        entity_id: patientId,
        channel: 'email',
        to,
        subject,
        body,
        status: 'failed',
        error_reason: reason,
      });
      throw error;
    }
  }

  async generateInvoicePdf(invoice: InvoiceForPdf): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc
        .fontSize(22).font('Helvetica-Bold')
        .text('MediCore Healthcare', 50, 50)
        .fontSize(10).font('Helvetica')
        .text('Medical Invoice', 50, 80)
        .moveDown();

      const date = invoice.createdAt
        ? new Date(invoice.createdAt).toLocaleDateString('fr-MA')
        : new Date().toLocaleDateString('fr-MA');

      doc
        .fontSize(12).font('Helvetica-Bold')
        .text(`Invoice No: ${invoice.invoiceNo}`, { align: 'right' })
        .fontSize(10).font('Helvetica')
        .text(`Date: ${date}`, { align: 'right' })
        .text(`Patient ID: ${invoice.patientId}`, { align: 'right' })
        .moveDown(2);

      doc.fontSize(11).font('Helvetica-Bold')
        .text('Description', 50, doc.y, { width: 250 })
        .text('Qty', 300, doc.y - 13, { width: 50, align: 'center' })
        .text('Unit Price', 350, doc.y - 13, { width: 90, align: 'right' })
        .text('Total', 440, doc.y - 13, { width: 90, align: 'right' });

      doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).stroke().moveDown(0.5);

      doc.fontSize(10).font('Helvetica');
      for (const item of invoice.items ?? []) {
        const y = doc.y;
        doc
          .text(item.description, 50, y, { width: 250 })
          .text(String(item.quantity), 300, y, { width: 50, align: 'center' })
          .text(`${Number(item.unitPrice).toFixed(2)} ${invoice.currency}`, 350, y, { width: 90, align: 'right' })
          .text(`${Number(item.total).toFixed(2)} ${invoice.currency}`, 440, y, { width: 90, align: 'right' })
          .moveDown(0.4);
      }

      doc.moveTo(350, doc.y + 4).lineTo(545, doc.y + 4).stroke().moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold')
        .text(`TOTAL: ${Number(invoice.total).toFixed(2)} ${invoice.currency}`, {
          align: 'right',
        });

      doc.end();
    });
  }

  async notify(
    channel: NotificationChannel,
    recipient: string,
    template: string,
    vars: Record<string, string>,
    options: NotificationDispatchOptions,
  ): Promise<NotificationResult<void>> {
    if (channel !== 'sms' && channel !== 'email') {
      return { ok: false, error: `Unsupported notification channel: ${channel}` };
    }

    try {
      if (channel === 'sms') {
        await this.sendSms(options.orgId, options.patientId, recipient, template, vars);
      } else if (options.attachment) {
        await this.sendEmailWithPdf(
          options.orgId,
          options.patientId,
          recipient,
          template,
          vars,
          options.attachment.content,
        );
      } else {
        await this.sendEmail(options.orgId, options.patientId, recipient, template, vars);
      }

      return { ok: true, value: undefined };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.redisPublisher.publish('notifications.failed', {
        channel,
        recipient,
        template,
        vars,
        attempt: options.attempt ?? 1,
        originalEvent: options.originalEvent,
        orgId: options.orgId,
        patientId: options.patientId,
        error: message,
      });

      return { ok: false, error: message };
    }
  }
}

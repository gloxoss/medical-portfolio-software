import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EmailSendInput, IEmailProvider } from './email.interface';

type SendGridMessage = {
  to: string;
  from: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition?: 'attachment' | 'inline';
  }>;
};

@Injectable()
export class SendGridEmailProvider implements IEmailProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('SENDGRID_API_KEY'));
  }

  async send(input: EmailSendInput): Promise<void> {
    const sendgridKey = this.config.get<string>('SENDGRID_API_KEY');
    if (!sendgridKey) {
      throw new Error('SENDGRID_NOT_CONFIGURED');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sgMail = require('@sendgrid/mail') as {
      setApiKey: (key: string) => void;
      send: (msg: SendGridMessage) => Promise<unknown>;
    };

    sgMail.setApiKey(sendgridKey);
    const fromEmail = this.config.get<string>('SENDGRID_FROM_EMAIL', 'noreply@medicore.health');

    await sgMail.send({
      to: input.to,
      from: fromEmail,
      subject: input.subject,
      html: input.html,
      attachments: input.attachments?.map((attachment) => ({
        content: attachment.contentBase64,
        filename: attachment.filename,
        type: attachment.mimeType,
        disposition: attachment.disposition,
      })),
    });
  }
}
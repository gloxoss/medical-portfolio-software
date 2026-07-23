import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ISmsProvider, SmsSendInput } from './sms.interface';

@Injectable()
export class TwilioSmsProvider implements ISmsProvider {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(
      this.config.get<string>('TWILIO_ACCOUNT_SID')
      && this.config.get<string>('TWILIO_AUTH_TOKEN')
      && this.config.get<string>('TWILIO_FROM_NUMBER'),
    );
  }

  async send(input: SmsSendInput): Promise<{ messageId?: string }> {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    const fromNumber = this.config.get<string>('TWILIO_FROM_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('TWILIO_NOT_CONFIGURED');
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const twilio = require('twilio') as (sid: string, token: string) => {
      messages: {
        create: (opts: { body: string; from: string; to: string }) => Promise<{ sid: string }>;
      };
    };

    const client = twilio(accountSid, authToken);
    const message = await client.messages.create({
      body: input.body,
      from: fromNumber,
      to: input.to,
    });

    return { messageId: message.sid };
  }
}
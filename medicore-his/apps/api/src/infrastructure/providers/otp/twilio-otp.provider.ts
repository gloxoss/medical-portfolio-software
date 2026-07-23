import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IOtpProvider } from './otp.interface';

@Injectable()
export class TwilioOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('OtpProvider:twilio');

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, code: string): Promise<void> {
    const accountSid = this.config.getOrThrow<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.config.getOrThrow<string>('TWILIO_AUTH_TOKEN');
    const from = this.config.getOrThrow<string>('TWILIO_FROM_NUMBER');

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const body = new URLSearchParams({
      From: from,
      To: phone,
      Body: `Your MediCore verification code is: ${code}. Valid for 5 minutes.`,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Twilio delivery failed: ${error}`);
      throw new ServiceUnavailableException('SMS delivery failed. Please try again.');
    }

    this.logger.log(`OTP dispatched via Twilio to ${phone}`);
  }
}

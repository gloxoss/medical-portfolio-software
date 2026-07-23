import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IOtpProvider } from './otp.interface';

@Injectable()
export class InfobipOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('OtpProvider:infobip');

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, code: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('INFOBIP_API_KEY');
    const baseUrl = this.config.getOrThrow<string>('INFOBIP_BASE_URL');

    const res = await fetch(`${baseUrl}/sms/2/text/advanced`, {
      method: 'POST',
      headers: {
        Authorization: `App ${apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            destinations: [{ to: phone }],
            from: 'MediCore',
            text: `Your MediCore verification code is: ${code}. Valid for 5 minutes.`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Infobip delivery failed: ${error}`);
      throw new ServiceUnavailableException('SMS delivery failed. Please try again.');
    }

    this.logger.log(`OTP dispatched via Infobip to ${phone}`);
  }
}

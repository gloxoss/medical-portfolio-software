import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IOtpProvider } from './otp.interface';

@Injectable()
export class VonageOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('OtpProvider:vonage');

  constructor(private readonly config: ConfigService) {}

  async send(phone: string, code: string): Promise<void> {
    const apiKey = this.config.getOrThrow<string>('VONAGE_API_KEY');
    const apiSecret = this.config.getOrThrow<string>('VONAGE_API_SECRET');

    const params = new URLSearchParams({
      api_key: apiKey,
      api_secret: apiSecret,
      to: phone,
      from: 'MediCore',
      text: `Your MediCore verification code is: ${code}. Valid for 5 minutes.`,
    });

    const res = await fetch(`https://rest.nexmo.com/sms/json?${params.toString()}`, {
      method: 'GET',
    });

    if (!res.ok) {
      const error = await res.text();
      this.logger.error(`Vonage delivery failed: ${error}`);
      throw new ServiceUnavailableException('SMS delivery failed. Please try again.');
    }

    const data = (await res.json()) as { messages: Array<{ status: string }> };
    if (data.messages?.[0]?.status !== '0') {
      this.logger.error(`Vonage rejected message: ${JSON.stringify(data)}`);
      throw new ServiceUnavailableException('SMS delivery failed. Please try again.');
    }

    this.logger.log(`OTP dispatched via Vonage to ${phone}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';
import type { IOtpProvider } from './otp.interface';

@Injectable()
export class DevOtpProvider implements IOtpProvider {
  private readonly logger = new Logger('OtpProvider:dev');

  async send(phone: string, code: string): Promise<void> {
    this.logger.warn(`━━━ DEV OTP ━━━ Phone: ${phone}  Code: ${code} ━━━`);
  }
}

import { ConfigService } from '@nestjs/config';
import type { IOtpProvider } from './otp.interface';
import { DevOtpProvider } from './dev-otp.provider';
import { TwilioOtpProvider } from './twilio-otp.provider';
import { InfobipOtpProvider } from './infobip-otp.provider';
import { VonageOtpProvider } from './vonage-otp.provider';
import { OTP_PROVIDER_TOKEN } from './otp.interface';

export const OtpProviderFactory = {
  provide: OTP_PROVIDER_TOKEN,
  useFactory: (config: ConfigService): IOtpProvider => {
    const provider = config.get<string>('OTP_PROVIDER', 'dev').toLowerCase();

    switch (provider) {
      case 'twilio':
        return new TwilioOtpProvider(config);
      case 'infobip':
        return new InfobipOtpProvider(config);
      case 'vonage':
        return new VonageOtpProvider(config);
      case 'dev':
      default:
        return new DevOtpProvider();
    }
  },
  inject: [ConfigService],
};

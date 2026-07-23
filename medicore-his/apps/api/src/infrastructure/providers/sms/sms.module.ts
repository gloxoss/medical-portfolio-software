import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SMS_PROVIDER } from './sms.interface';
import { TwilioSmsProvider } from './twilio-sms.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    TwilioSmsProvider,
    {
      provide: SMS_PROVIDER,
      useExisting: TwilioSmsProvider,
    },
  ],
  exports: [SMS_PROVIDER],
})
export class SmsModule {}
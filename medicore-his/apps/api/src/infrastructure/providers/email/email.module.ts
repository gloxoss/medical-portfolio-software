import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMAIL_PROVIDER } from './email.interface';
import { SendGridEmailProvider } from './sendgrid-email.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    SendGridEmailProvider,
    {
      provide: EMAIL_PROVIDER,
      useExisting: SendGridEmailProvider,
    },
  ],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OtpProviderFactory } from './otp.factory';
import { OTP_PROVIDER_TOKEN } from './otp.interface';

@Module({
  imports: [ConfigModule],
  providers: [OtpProviderFactory],
  exports: [OTP_PROVIDER_TOKEN],
})
export class OtpModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PAYMENT_PROVIDER } from './payment.interface';
import { StripePaymentProvider } from './stripe.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    StripePaymentProvider,
    {
      provide: PAYMENT_PROVIDER,
      useExisting: StripePaymentProvider,
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class PaymentModule {}

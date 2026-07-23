import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Stripe } from 'stripe';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const StripeSDK = require('stripe');
import {
  CheckoutSessionParams,
  IPaymentProvider,
  PaymentIntentParams,
  RetrievedCheckoutSession,
} from './payment.interface';

@Injectable()
export class StripePaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(StripePaymentProvider.name);
  private stripe: Stripe | null = null;

  constructor(private readonly config: ConfigService) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY')?.trim();
    if (key && !this.isPlaceholderKey(key)) {
      this.stripe = new StripeSDK(key, { apiVersion: '2025-03-31.basil' });
      this.logger.log('Stripe provider initialised');
    } else {
      this.logger.warn('STRIPE_SECRET_KEY not set or still placeholder value');
    }
  }

  isConfigured(): boolean {
    return this.stripe !== null;
  }

  async createPaymentIntent(
    params: PaymentIntentParams,
  ): Promise<{ id: string; clientSecret: string | null }> {
    const stripe = this.requireStripe();

    try {
      const intent = await stripe.paymentIntents.create({
        amount: params.amountInMinor,
        currency: params.currency.toLowerCase(),
        metadata: params.metadata,
        capture_method: 'automatic',
      });

      return {
        id: intent.id,
        clientSecret: intent.client_secret,
      };
    } catch (error) {
      this.logger.error(`Stripe payment intent creation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new ServiceUnavailableException('Stripe is unavailable. Verify STRIPE_SECRET_KEY configuration.');
    }
  }

  async createCheckoutSession(
    params: CheckoutSessionParams,
  ): Promise<{ id: string; url: string | null }> {
    const stripe = this.requireStripe();

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: params.currency.toLowerCase(),
            unit_amount: params.amountInMinor,
            product_data: {
              name: `Invoice ${params.invoiceNo}`,
              description: `MediCore portal payment for ${params.invoiceNo}`,
            },
          },
        },
      ],
      success_url: `${params.successUrl}${params.successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });

    return {
      id: session.id,
      url: session.url,
    };
  }

  async retrieveCheckoutSession(sessionId: string): Promise<RetrievedCheckoutSession> {
    const stripe = this.requireStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return {
      id: session.id,
      metadata: session.metadata ?? undefined,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
    };
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Payment processing is not configured on this server. Set STRIPE_SECRET_KEY to enable.',
      );
    }

    return this.stripe;
  }

  private isPlaceholderKey(key: string): boolean {
    if (key === 'sk_test_...' || key === 'sk_live_...') {
      return true;
    }

    return key.endsWith('...');
  }
}

export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export type PaymentIntentParams = {
  amountInMinor: number;
  currency: string;
  metadata: Record<string, string>;
};

export type CheckoutSessionParams = {
  amountInMinor: number;
  currency: string;
  invoiceNo: string;
  successUrl: string;
  cancelUrl: string;
  metadata: Record<string, string>;
};

export type RetrievedCheckoutSession = {
  id: string;
  metadata?: Record<string, string>;
  paymentStatus: string;
  amountTotal: number | null;
};

export interface IPaymentProvider {
  isConfigured(): boolean;
  createPaymentIntent(params: PaymentIntentParams): Promise<{ id: string; clientSecret: string | null }>;
  createCheckoutSession(params: CheckoutSessionParams): Promise<{ id: string; url: string | null }>;
  retrieveCheckoutSession(sessionId: string): Promise<RetrievedCheckoutSession>;
}

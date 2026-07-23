import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { BillingRepository } from './billing.repository';
import { AddInvoiceItemDto, RecordPaymentDto } from './dto/invoice.dto';
import type { RequestUser } from '../auth/types/request-user.type';
import { NotificationService } from '../notifications/notification.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { IPaymentProvider, PAYMENT_PROVIDER } from '../../infrastructure/providers/payment/payment.interface';

type InvoiceWithItems = {
  invoiceNo: string;
  patientId: string;
  total: number | bigint | string | { toString(): string };
  currency: string;
  createdAt: Date;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number | bigint | string | { toString(): string };
    total: number | bigint | string | { toString(): string };
  }>;
};

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  // CMI Client configs
  private cmiStoreKey: string;
  private cmiClientId: string;

  constructor(
    private readonly repository: BillingRepository,
    private readonly config: ConfigService,
    private readonly notificationService: NotificationService,
    private readonly redisPublisher: RedisPublisherService,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: IPaymentProvider,
  ) {
    this.cmiStoreKey = this.config.get<string>('CMI_STORE_KEY') || 'mockStoreKey123';
    this.cmiClientId = this.config.get<string>('CMI_CLIENT_ID') || '600000000';
  }

  async autoGenerateInvoice(
    orgId: string,
    facilityId: string,
    patientId: string,
    encounterId: string,
    createdBy: string,
  ) {
    return this.repository.createInvoice({
      orgId,
      facilityId,
      patientId,
      encounterId,
      createdBy,
      status: 'DRAFT',
      subtotal: 0,
      taxAmount: 0,
      discount: 0,
      total: 0,
      currency: 'MAD',
    });
  }

  async addPharmacyDispenseCharges(payload: {
    orgId: string;
    facilityId: string;
    patientId: string;
    encounterId: string;
    dispensedBy: string;
    items: Array<{
      drug_id: string;
      drug_name: string;
      quantity: number;
      unit_price: number;
      line_total: number;
    }>;
  }) {
    if (payload.items.length === 0) {
      return null;
    }

    let invoice = await this.repository.findDraftByEncounter(payload.orgId, payload.encounterId);
    if (!invoice) {
      invoice = await this.repository.createInvoice({
        orgId: payload.orgId,
        facilityId: payload.facilityId,
        patientId: payload.patientId,
        encounterId: payload.encounterId,
        createdBy: payload.dispensedBy,
        status: 'DRAFT',
        subtotal: 0,
        taxAmount: 0,
        discount: 0,
        total: 0,
        currency: 'MAD',
      });
    }

    const invoiceItems = payload.items.map((item) => ({
      invoiceId: invoice!.id,
      description: `Pharmacy Dispense - ${item.drug_name}`,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      total: item.line_total,
    }));

    return this.repository.addInvoiceItems(payload.orgId, invoice.id, invoiceItems);
  }

  async addTelemedicineSessionCharge(payload: {
    orgId: string;
    facilityId: string;
    patientId: string;
    encounterId?: string;
    appointmentId: string;
    doctorId: string;
    durationMinutes: number;
  }) {
    const baseCharge = Number(this.config.get<string>('TELEMEDICINE_BASE_CHARGE_MAD') ?? '300');
    const perMinuteCharge = Number(this.config.get<string>('TELEMEDICINE_PER_MINUTE_CHARGE_MAD') ?? '0');

    if (!Number.isFinite(baseCharge) || !Number.isFinite(perMinuteCharge)) {
      throw new BadRequestException('Invalid telemedicine pricing configuration.');
    }

    const normalizedDuration = Math.max(1, Math.floor(payload.durationMinutes || 1));
    const lineTotal = Number((baseCharge + perMinuteCharge * normalizedDuration).toFixed(2));

    let invoice = payload.encounterId
      ? await this.repository.findDraftByEncounter(payload.orgId, payload.encounterId)
      : null;

    if (!invoice) {
      invoice = await this.repository.createInvoice({
        orgId: payload.orgId,
        facilityId: payload.facilityId,
        patientId: payload.patientId,
        encounterId: payload.encounterId,
        createdBy: payload.doctorId,
        status: 'DRAFT',
        subtotal: 0,
        taxAmount: 0,
        discount: 0,
        total: 0,
        currency: 'MAD',
      });
    }

    return this.repository.addInvoiceItems(payload.orgId, invoice.id, [
      {
        description: `Telemedicine Consultation (${normalizedDuration} min)`,
        quantity: 1,
        unitPrice: lineTotal,
        total: lineTotal,
      },
    ]);
  }

  async getInvoices(user: RequestUser, facilityId?: string) {
    return this.repository.findInvoices(user.orgId, facilityId);
  }

  async getInvoiceById(user: RequestUser, id: string) {
    const invoice = await this.repository.findInvoiceById(user.orgId, id);
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async addItems(user: RequestUser, id: string, dto: AddInvoiceItemDto) {
    const invoice = await this.getInvoiceById(user, id);

    const items = dto.items.map((item) => ({
      ...item,
      total: item.unitPrice * item.quantity,
      invoiceId: invoice.id,
    }));

    return this.repository.addInvoiceItems(user.orgId, id, items);
  }

  async recordPayment(user: RequestUser, id: string, dto: RecordPaymentDto) {
    await this.getInvoiceById(user, id);
    const updated = await this.repository.recordPayment(user.orgId, id, dto.amount, dto.method);
    await this.publishInvoicePaidEvent(user.orgId, updated.id);
    return updated;
  }

  private async publishInvoicePaidEvent(orgId: string, invoiceId: string): Promise<void> {
    const invoice = await this.repository.findInvoiceById(orgId, invoiceId);
    if (!invoice || invoice.status !== 'PAID') return;

    await this.redisPublisher.publish('invoice.paid', {
      orgId,
      invoiceId: invoice.id,
      patientId: invoice.patientId,
      amount: Number(invoice.total),
      currency: invoice.currency,
      paidAt: invoice.paidAt?.toISOString() ?? new Date().toISOString(),
    });
  }

  private async buildInvoicePdf(invoice: InvoiceWithItems): Promise<Buffer> {
    return this.notificationService.generateInvoicePdf({
      invoiceNo: invoice.invoiceNo,
      patientId: invoice.patientId,
      total: Number(invoice.total),
      currency: invoice.currency,
      createdAt: invoice.createdAt,
      items: (invoice.items ?? []).map((item) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
    });
  }

  async generateInvoicePdf(user: RequestUser, id: string) {
    const invoice = await this.getInvoiceById(user, id);
    const pdf = await this.buildInvoicePdf(invoice as InvoiceWithItems);

    this.logger.log(
      `Invoice PDF generated for ${invoice.invoiceNo} (${pdf.byteLength} bytes)`,
    );

    return {
      success: true,
      message: `Invoice PDF generated for ${invoice.invoiceNo}`,
    };
  }

  async generatePortalInvoicePdf(params: {
    orgId: string;
    patientId: string;
    invoiceId: string;
  }): Promise<{ invoiceNo: string; pdf: Buffer }> {
    const invoice = await this.repository.findInvoiceById(params.orgId, params.invoiceId);

    if (!invoice || invoice.patientId !== params.patientId) {
      throw new NotFoundException('Invoice not found.');
    }

    const pdf = await this.buildInvoicePdf(invoice as InvoiceWithItems);

    this.logger.log(
      `Portal invoice PDF generated for ${invoice.invoiceNo} (${pdf.byteLength} bytes)`,
    );

    return {
      invoiceNo: invoice.invoiceNo,
      pdf,
    };
  }

  // B6-FIX: Real Stripe PaymentIntent.
  // Creates a PaymentIntent in Stripe and returns the client_secret for the
  // frontend's Stripe.js to use. Amount is in centimes (MAD × 100).
  async generateStripePaymentIntent(user: RequestUser, id: string) {
    if (!this.paymentProvider.isConfigured()) {
      this.logger.warn('STRIPE_SECRET_KEY not set. Running in MOCK DEV MODE for Ops Stripe Checkout.');
      return {
        client_secret: `mock_secret_pi_12345_secret_67890`,
        stripePaymentIntentId: `mock_intent_pi_12345`,
      };
    }

    const invoice = await this.getInvoiceById(user, id);
    // Stripe always works in the smallest currency unit
    const amountInCentimes = Math.round(Number(invoice.total) * 100);

    const intent = await this.paymentProvider.createPaymentIntent({
      amountInMinor: amountInCentimes,
      currency: invoice.currency,
      metadata: {
        invoice_id: invoice.id,
        invoice_no: invoice.invoiceNo,
        org_id: invoice.orgId,
        patient_id: invoice.patientId,
      },
    });

    this.logger.log(
      `Stripe PaymentIntent created: ${intent.id} (${amountInCentimes} centimes) for invoice ${invoice.invoiceNo}`,
    );

    return {
      client_secret: intent.clientSecret,
      stripePaymentIntentId: intent.id,
    };
  }

  private resolveFrontendUrl(candidate: string | undefined, fallback: string): string {
    if (!candidate) return fallback;

    const frontendBase = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000')
      .replace(/\/+$/, '');

    return candidate.startsWith(frontendBase) ? candidate : fallback;
  }

  async createPortalStripeCheckoutSession(params: {
    orgId: string;
    patientId: string;
    invoiceId: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{ sessionId: string; checkoutUrl: string }> {
    if (!this.paymentProvider.isConfigured()) {
      this.logger.warn(
        'STRIPE_SECRET_KEY not set. Running in MOCK DEV MODE for Portal Stripe Checkout. Auto-redirecting to success state.',
      );

      const frontendBase = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
      const defaultSuccessUrl = `${frontendBase}/portal/invoices/success?invoiceId=${params.invoiceId}`;
      const successUrl = this.resolveFrontendUrl(params.successUrl, defaultSuccessUrl);
      const mockSessionId = `mock_session_${crypto.randomBytes(8).toString('hex')}`;
      
      const mockCheckoutUrl = `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id=${mockSessionId}`;

      return {
        sessionId: mockSessionId,
        checkoutUrl: mockCheckoutUrl,
      };
    }

    const invoice = await this.repository.findInvoiceById(params.orgId, params.invoiceId);

    if (!invoice || invoice.patientId !== params.patientId) {
      throw new NotFoundException('Invoice not found.');
    }

    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice is already paid.');
    }

    const frontendBase = (this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000')
      .replace(/\/+$/, '');

    const defaultSuccessUrl = `${frontendBase}/portal/invoices/success?invoiceId=${invoice.id}`;
    const defaultCancelUrl = `${frontendBase}/portal/invoices/cancel?invoiceId=${invoice.id}`;

    const successUrl = this.resolveFrontendUrl(params.successUrl, defaultSuccessUrl);
    const cancelUrl = this.resolveFrontendUrl(params.cancelUrl, defaultCancelUrl);
    const amountInCentimes = Math.round(Number(invoice.total) * 100);

    const session = await this.paymentProvider.createCheckoutSession({
      amountInMinor: amountInCentimes,
      currency: invoice.currency,
      invoiceNo: invoice.invoiceNo,
      successUrl,
      cancelUrl,
      metadata: {
        invoice_id: invoice.id,
        patient_id: params.patientId,
        org_id: params.orgId,
      },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe checkout session URL is missing.');
    }

    this.logger.log(`Stripe checkout session created: ${session.id} for invoice ${invoice.invoiceNo}`);

    return {
      sessionId: session.id,
      checkoutUrl: session.url,
    };
  }

  async confirmPortalStripeCheckoutSession(params: {
    orgId: string;
    patientId: string;
    invoiceId: string;
    sessionId: string;
  }): Promise<{ status: 'paid' | 'already_paid'; invoice: Awaited<ReturnType<BillingRepository['findInvoiceById']>> }> {
    const invoice = await this.repository.findInvoiceById(params.orgId, params.invoiceId);

    if (params.sessionId.startsWith('mock_session_') && !this.paymentProvider.isConfigured()) {
      this.logger.warn(`Mock Stripe session ${params.sessionId} confirmed in DEV MODE for invoice ${params.invoiceId}.`);
      
      if (!invoice || invoice.patientId !== params.patientId) {
        throw new NotFoundException('Invoice not found.');
      }
      
      if (invoice.status === 'PAID') {
        return { status: 'already_paid', invoice };
      }

      await this.repository.recordPayment(params.orgId, invoice.id, Number(invoice.total), 'STRIPE');
      await this.publishInvoicePaidEvent(params.orgId, invoice.id);
      const updatedInvoice = await this.repository.findInvoiceById(params.orgId, invoice.id);
      return { status: 'paid', invoice: updatedInvoice };
    }

    if (!this.paymentProvider.isConfigured()) {
      throw new ServiceUnavailableException(
        'Payment processing is not configured on this server. ' +
        'Set STRIPE_SECRET_KEY environment variable to enable.',
      );
    }

    if (!invoice || invoice.patientId !== params.patientId) {
      throw new NotFoundException('Invoice not found.');
    }

    if (invoice.status === 'PAID') {
      return {
        status: 'already_paid',
        invoice,
      };
    }

    const session = await this.paymentProvider.retrieveCheckoutSession(params.sessionId);

    if (session.metadata?.invoice_id !== invoice.id) {
      throw new BadRequestException('Stripe session does not match this invoice.');
    }

    if (session.paymentStatus !== 'paid') {
      throw new BadRequestException('Stripe checkout is not paid yet.');
    }

    const amountPaid = session.amountTotal
      ? Number(session.amountTotal) / 100
      : Number(invoice.total);

    await this.repository.recordPayment(params.orgId, invoice.id, amountPaid, 'STRIPE');
    await this.publishInvoicePaidEvent(params.orgId, invoice.id);

    const updatedInvoice = await this.repository.findInvoiceById(params.orgId, invoice.id);

    this.logger.log(`Stripe checkout confirmed for invoice ${invoice.invoiceNo}`);

    return {
      status: 'paid',
      invoice: updatedInvoice,
    };
  }

  async getRevenueStats(user: RequestUser) {
    return this.repository.getRevenueByFacility(user.orgId);
  }

  // --- CMI Integration ---
  
  private generateCmiHash(data: Record<string, any>, storeKey: string): string {
    const keys = Object.keys(data).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    let hashString = '';
    
    for (const key of keys) {
      if (key !== 'HASH' && key !== 'encoding') {
        const val = data[key];
        const escapedVal = String(val).replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
        hashString += escapedVal + '|';
      }
    }
    
    hashString += storeKey;
    return crypto.createHash('sha512').update(hashString, 'utf8').digest('base64');
  }

  async generateCmiPaymentIntent(user: RequestUser, id: string) {
    const invoice = await this.getInvoiceById(user, id);
    if (invoice.status === 'PAID') throw new ServiceUnavailableException('Invoice is already paid');

    const appBaseUrl = this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    
    const payload = {
      clientid: this.cmiClientId,
      amount: String(invoice.total),
      okUrl: `${appBaseUrl}/payment/success?invoiceId=${invoice.id}`,
      failUrl: `${appBaseUrl}/payment/error?invoiceId=${invoice.id}`,
      TranType: 'PreAuth',
      callbackUrl: `${this.config.get<string>('API_URL') || 'http://localhost:4000'}/billing/webhooks/cmi`,
      shopurl: appBaseUrl,
      currency: '504', // MAD ISO code
      rnd: crypto.randomBytes(8).toString('hex'),
      storetype: '3D_PAY_HOSTING',
      hashAlgorithm: 'ver3',
      lang: 'fr',
      refreshtime: '5',
      oid: invoice.id,
      BillToName: user.email.split('@')[0],
      email: user.email,
    };

    const hash = this.generateCmiHash(payload, this.cmiStoreKey);
    const finalPayload = { ...payload, HASH: hash };

    this.logger.log(`Generated CMI Payload for invoice ${invoice.invoiceNo}`);
    
    return {
      success: true,
      cmiUrl: 'https://testpayment.cmi.co.ma/fim/est3Dgate',
      payload: finalPayload,
    };
  }

  async handleCmiCallback(body: Record<string, string>) {
    this.logger.log(`Received CMI Callback for order: ${body.oid}`);
    
    const receivedHash = body.HASH;
    const computedHash = this.generateCmiHash(body, this.cmiStoreKey);
    
    if (receivedHash !== computedHash) {
      this.logger.error(`CMI Hash invalid. Computed: ${computedHash}, Received: ${receivedHash}`);
      throw new ServiceUnavailableException('Invalid CMI Hash Signature');
    }

    if (body.Response === 'Approved') {
      const invoiceId = body.oid;
      const amount = Number(body.amount);
      const transactionId = body.TransId;
      const authCode = body.AuthCode;

      // Update invoice as paid in repository via new standard API
      await this.repository.recordPayment(body.orgId || '', invoiceId, amount, 'CMI');
      if (body.orgId) {
        await this.publishInvoicePaidEvent(body.orgId, invoiceId);
      }
      
      this.logger.log(`Invoice ${invoiceId} marked as PAID via CMI`);
      return { success: true, message: 'APPROVED' };
    }

    this.logger.warn(`CMI transaction failed, response: ${body.Response}`);
    return { success: true, message: 'FAILED' };
  }
}

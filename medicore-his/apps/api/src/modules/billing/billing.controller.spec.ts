import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as request from 'supertest';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';

// ─── Stub service ─────────────────────────────────────────────────────────────

const mockBillingService = {
  getInvoices: jest.fn(),
  getInvoiceById: jest.fn(),
  addItems: jest.fn(),
  recordPayment: jest.fn(),
  generateInvoicePdf: jest.fn(),
  generateStripePaymentIntent: jest.fn(),
  generateCmiPaymentIntent: jest.fn(),
  getRevenueStats: jest.fn(),
};

const MOCK_USER = { id: 'user-001', orgId: 'org-001', email: 'billing@medicore.ma' };

describe('BillingController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: mockBillingService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use((req: { user: unknown }, _res: unknown, next: () => void) => {
      req.user = MOCK_USER;
      next();
    });
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ── GET /billing/invoices ───────────────────────────────────────────────────

  describe('GET /billing/invoices', () => {
    it('should return 200 with invoice list', async () => {
      const invoices = [{ id: 'inv-001', invoiceNo: 'INV-2026-001', status: 'DRAFT', total: 500 }];
      mockBillingService.getInvoices.mockResolvedValue(invoices);

      const res = await request(app.getHttpServer()).get('/billing/invoices');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({ invoiceNo: 'INV-2026-001' });
      expect(mockBillingService.getInvoices).toHaveBeenCalledWith(MOCK_USER, undefined);
    });

    it('should pass facility_id query param to service', async () => {
      mockBillingService.getInvoices.mockResolvedValue([]);

      await request(app.getHttpServer()).get('/billing/invoices?facility_id=fac-001');

      expect(mockBillingService.getInvoices).toHaveBeenCalledWith(MOCK_USER, 'fac-001');
    });

    it('should return 401 when JWT guard denies', async () => {
      const restrictedModule = await Test.createTestingModule({
        controllers: [BillingController],
        providers: [{ provide: BillingService, useValue: mockBillingService }],
      })
        .overrideGuard(JwtAuthGuard)
        .useValue({ canActivate: () => false })
        .overrideGuard(PermissionsGuard)
        .useValue({ canActivate: () => true })
        .compile();

      const restrictedApp = restrictedModule.createNestApplication();
      await restrictedApp.init();

      const res = await request(restrictedApp.getHttpServer()).get('/billing/invoices');

      expect(res.status).toBe(403); // NestJS returns 403 when canActivate = false
      await restrictedApp.close();
    });
  });

  // ── GET /billing/invoices/:id ───────────────────────────────────────────────

  describe('GET /billing/invoices/:id', () => {
    it('should return 200 with invoice detail', async () => {
      const invoice = {
        id: 'inv-001',
        invoiceNo: 'INV-2026-001',
        status: 'PAID',
        items: [{ description: 'Consultation', quantity: 1, unitPrice: 500 }],
      };
      mockBillingService.getInvoiceById.mockResolvedValue(invoice);

      const res = await request(app.getHttpServer()).get('/billing/invoices/inv-001');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ invoiceNo: 'INV-2026-001' });
    });

    it('should return 404 when invoice not found', async () => {
      mockBillingService.getInvoiceById.mockRejectedValue(new NotFoundException('Invoice not found'));

      const res = await request(app.getHttpServer()).get('/billing/invoices/nonexistent-id');

      expect(res.status).toBe(404);
    });
  });

  // ── POST /billing/invoices/:id/payment ─────────────────────────────────────

  describe('POST /billing/invoices/:id/payment', () => {
    it('should return 201 and record cash payment', async () => {
      const updatedInvoice = { id: 'inv-001', status: 'PAID', paidAt: new Date().toISOString() };
      mockBillingService.recordPayment.mockResolvedValue(updatedInvoice);

      const res = await request(app.getHttpServer())
        .post('/billing/invoices/inv-001/payment')
        .send({ method: 'CASH', amount: 500 });

      expect(res.status).toBe(201);
      expect(mockBillingService.recordPayment).toHaveBeenCalledWith(
        MOCK_USER,
        'inv-001',
        expect.objectContaining({ method: 'CASH' }),
      );
    });
  });

  // ── POST /billing/invoices/:id/pay/stripe ──────────────────────────────────

  describe('POST /billing/invoices/:id/pay/stripe', () => {
    it('should return 201 with Stripe client_secret', async () => {
      mockBillingService.generateStripePaymentIntent.mockResolvedValue({
        clientSecret: 'pi_test_client_secret',
        paymentIntentId: 'pi_test_123',
      });

      const res = await request(app.getHttpServer())
        .post('/billing/invoices/inv-001/pay/stripe');

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('clientSecret');
    });
  });

  // ── GET /billing/analytics/revenue ─────────────────────────────────────────

  describe('GET /billing/analytics/revenue', () => {
    it('should return 200 with revenue stats', async () => {
      const stats = {
        totalRevenue: 15000,
        byMonth: [{ month: '2026-03', total: 5000 }, { month: '2026-04', total: 10000 }],
      };
      mockBillingService.getRevenueStats.mockResolvedValue(stats);

      const res = await request(app.getHttpServer()).get('/billing/analytics/revenue');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalRevenue', 15000);
    });
  });
});

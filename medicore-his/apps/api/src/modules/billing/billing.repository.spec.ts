import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BillingRepository } from './billing.repository';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';

describe('BillingRepository', () => {
  let repository: BillingRepository;

  const mockPrisma = {
    organization: { update: jest.fn() },
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    invoiceItem: { createMany: jest.fn() },
    payment: { create: jest.fn() },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingRepository,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    repository = module.get<BillingRepository>(BillingRepository);
  });

  // ── findByPatient ────────────────────────────────────────────────────────────
  it('findByPatient scopes invoices by orgId + patientId', async () => {
    const rows = [{ id: 'inv-1', orgId: 'org-001', patientId: 'pat-001' }];
    mockPrisma.invoice.findMany.mockResolvedValue(rows);

    const result = await repository.findByPatient('org-001', 'pat-001');

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orgId: 'org-001', patientId: 'pat-001' },
      }),
    );
    expect(result).toBe(rows);
  });

  // ── updateStatus ─────────────────────────────────────────────────────────────
  it('updateStatus transitions invoice draft -> sent', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1', orgId: 'org-001', status: 'DRAFT', items: [], payments: [],
    });
    mockPrisma.invoice.update.mockResolvedValue({
      id: 'inv-1', orgId: 'org-001', status: 'SENT', items: [], payments: [],
    });

    const result = await repository.updateStatus('org-001', 'inv-1', 'SENT');

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-1' }, data: { status: 'SENT' } }),
    );
    expect(result.status).toBe('SENT');
  });

  it('updateStatus throws NotFoundException when invoice does not belong to org', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    await expect(repository.updateStatus('org-001', 'inv-99', 'SENT')).rejects.toThrow(
      NotFoundException,
    );
  });

  // ── findOverdue ───────────────────────────────────────────────────────────────
  it('findOverdue returns only sent invoices past the 30-day threshold', async () => {
    const now = new Date('2026-04-10T00:00:00.000Z');
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    await repository.findOverdue('org-001', now);

    const call = mockPrisma.invoice.findMany.mock.calls[0][0] as {
      where: { createdAt: { lte: Date }; status: string; orgId: string };
    };

    expect(call.where.orgId).toBe('org-001');
    expect(call.where.status).toBe('SENT');
    expect(call.where.createdAt.lte.toISOString()).toBe('2026-03-11T00:00:00.000Z');
  });

  // ── createInvoice ─────────────────────────────────────────────────────────────
  it('createInvoice generates a sequential INV number and persists the invoice', async () => {
    mockPrisma.organization.update.mockResolvedValue({ invoiceCounter: 3 });
    const created = { id: 'inv-new', invoiceNo: 'INV-2026-00003', items: [], payments: [] };
    mockPrisma.invoice.create.mockResolvedValue(created);

    const result = await repository.createInvoice({
      orgId: 'org-001',
      facilityId: 'fac-001',
      patientId: 'pat-001',
      encounterId: 'enc-001',
      status: 'DRAFT',
      subtotal: 0,
      discount: 0,
      taxAmount: 0,
      total: 0,
    } as any);

    expect(mockPrisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ invoiceNo: 'INV-2026-00003' }) }),
    );
    expect(result).toBe(created);
  });

  // ── findInvoiceById ───────────────────────────────────────────────────────────
  it('findInvoiceById returns null when invoice belongs to a different org', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null);

    const result = await repository.findInvoiceById('org-002', 'inv-1');

    expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'inv-1', orgId: 'org-002' } }),
    );
    expect(result).toBeNull();
  });

  // ── findInvoices ──────────────────────────────────────────────────────────────
  it('findInvoices scopes by orgId and optionally by facilityId', async () => {
    mockPrisma.invoice.findMany.mockResolvedValue([]);

    await repository.findInvoices('org-001', 'fac-001');

    expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 'org-001', facilityId: 'fac-001' } }),
    );
  });

  // ── recordPayment ─────────────────────────────────────────────────────────────
  it('recordPayment marks invoice PAID when total payments cover the total', async () => {
    mockPrisma.payment.create.mockResolvedValue({});
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1', orgId: 'org-001', total: 100,
      payments: [{ amount: 100 }],
    });
    const paid = { id: 'inv-1', status: 'PAID', items: [], payments: [] };
    mockPrisma.invoice.update.mockResolvedValue(paid);

    const result = await repository.recordPayment('org-001', 'inv-1', 100, 'CASH' as any);

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }),
    );
    expect(result.status).toBe('PAID');
  });

  // ── updateInvoiceTotals ───────────────────────────────────────────────────────
  it('updateInvoiceTotals recalculates subtotal and total from line items', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1', orgId: 'org-001',
      items: [{ total: 100 }, { total: 50 }],
      payments: [],
      discount: 10,
      taxAmount: 5,
    });
    const updated = { id: 'inv-1', subtotal: 150, total: 145, items: [], payments: [] };
    mockPrisma.invoice.update.mockResolvedValue(updated);

    const result = await repository.updateInvoiceTotals('org-001', 'inv-1');

    expect(mockPrisma.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { subtotal: 150, total: 145 } }),
    );
    expect(result).toBe(updated);
  });

  it('updateInvoiceTotals throws NotFoundException when invoice not found', async () => {
    mockPrisma.invoice.findFirst.mockResolvedValue(null);
    await expect(repository.updateInvoiceTotals('org-001', 'inv-99')).rejects.toThrow(NotFoundException);
  });

  // ── addInvoiceItems ───────────────────────────────────────────────────────────
  it('addInvoiceItems persists line items and recalculates totals', async () => {
    mockPrisma.invoiceItem.createMany.mockResolvedValue({ count: 1 });
    mockPrisma.invoice.findFirst.mockResolvedValue({
      id: 'inv-1', orgId: 'org-001',
      items: [{ total: 200 }], payments: [], discount: 0, taxAmount: 0,
    });
    const updated = { id: 'inv-1', subtotal: 200, total: 200, items: [], payments: [] };
    mockPrisma.invoice.update.mockResolvedValue(updated);

    const result = await repository.addInvoiceItems('org-001', 'inv-1', [
      { description: 'Consultation', quantity: 1, unitPrice: 200, total: 200 } as any,
    ]);

    expect(mockPrisma.invoiceItem.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.arrayContaining([expect.objectContaining({ invoiceId: 'inv-1' })]) }),
    );
    expect(result).toBe(updated);
  });

  // ── recordPayment partial ────────────────────────────────────────────────────
  it('recordPayment returns the invoice without marking PAID when partial payment', async () => {
    mockPrisma.payment.create.mockResolvedValue({});
    const invoice = { id: 'inv-1', orgId: 'org-001', total: 200, payments: [{ amount: 50 }] };
    mockPrisma.invoice.findFirst.mockResolvedValue(invoice);

    const result = await repository.recordPayment('org-001', 'inv-1', 50, 'CASH' as any);

    expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    expect(result).toBe(invoice);
  });

  // ── getRevenueByFacility ──────────────────────────────────────────────────────
  it('getRevenueByFacility groups paid invoices by facility', async () => {
    const grouped = [{ facilityId: 'fac-001', _sum: { total: 500 } }];
    mockPrisma.invoice.groupBy.mockResolvedValue(grouped);

    const result = await repository.getRevenueByFacility('org-001');

    expect(mockPrisma.invoice.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: { orgId: 'org-001', status: 'PAID' } }),
    );
    expect(result).toBe(grouped);
  });
});

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { Invoice, InvoiceItem, InvoiceStatus, Payment, PaymentMethod, Prisma } from '@prisma/client';

@Injectable()
export class BillingRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Automatically generates INV-YYYY-xxxxx per facility
  async createInvoice(data: Omit<Prisma.InvoiceUncheckedCreateInput, 'invoiceNo'>): Promise<Invoice> {
    // Generate invoice No based on org counter
    const org = await this.prisma.organization.update({
      where: { id: data.orgId },
      data: { invoiceCounter: { increment: 1 } },
      select: { invoiceCounter: true }
    });

    const year = new Date().getFullYear();
    const seq = String(org.invoiceCounter).padStart(5, '0');
    const invoiceNo = `INV-${year}-${seq}`;

    return this.prisma.invoice.create({
      data: {
        ...data,
        invoiceNo,
      },
      include: {
        items: true,
        payments: true
      }
    });
  }

  async findInvoiceById(orgId: string, id: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({
      where: { id, orgId },
      include: {
        items: true,
        payments: true
      }
    });
  }

  async findInvoices(orgId: string, facilityId?: string): Promise<Invoice[]> {
    const where: Prisma.InvoiceWhereInput = { orgId };
    if (facilityId) where.facilityId = facilityId;

    return this.prisma.invoice.findMany({
      where,
      include: {
        items: true,
        payments: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findByPatient(orgId: string, patientId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { orgId, patientId },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findDraftByEncounter(orgId: string, encounterId: string): Promise<Invoice | null> {
    return this.prisma.invoice.findFirst({
      where: {
        orgId,
        encounterId,
        status: 'DRAFT',
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateInvoiceTotals(orgId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { items: true, payments: true }
    });

    if (!invoice) throw new NotFoundException('Invoice not found');

    const subtotal = invoice.items.reduce((sum, item) => sum + Number(item.total), 0);
    const total = subtotal - Number(invoice.discount) + Number(invoice.taxAmount);

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { subtotal, total },
      include: { items: true, payments: true }
    });
  }

  async addInvoiceItems(orgId: string, invoiceId: string, items: Prisma.InvoiceItemCreateManyInvoiceInput[]): Promise<Invoice> {
    await this.prisma.invoiceItem.createMany({
      data: items.map(item => ({ ...item, invoiceId }))
    });

    return this.updateInvoiceTotals(orgId, invoiceId);
  }

  async recordPayment(orgId: string, invoiceId: string, amount: number, method: PaymentMethod): Promise<Invoice> {
    await this.prisma.payment.create({
      data: {
        invoiceId,
        amount,
        method
      }
    });

    // Option to check if fully paid and update status
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { payments: true }
    });
    
    if (invoice) {
        const totalPaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        if (totalPaid >= Number(invoice.total)) {
            return this.prisma.invoice.update({
                where: { id: invoiceId },
                data: { status: 'PAID', paidAt: new Date() },
                include: { items: true, payments: true }
            });
        }
    }

    return invoice as Invoice;
  }
  
  async getRevenueByFacility(orgId: string): Promise<any[]> {
    const result = await this.prisma.invoice.groupBy({
      by: ['facilityId'],
      where: { orgId, status: 'PAID' },
      _sum: { total: true }
    });
    return result;
  }

  async updateStatus(orgId: string, invoiceId: string, status: InvoiceStatus): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, orgId },
      include: { items: true, payments: true },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status },
      include: { items: true, payments: true },
    });
  }

  async findOverdue(orgId: string, now = new Date()): Promise<Invoice[]> {
    const overdueBefore = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return this.prisma.invoice.findMany({
      where: {
        orgId,
        status: 'SENT',
        createdAt: { lte: overdueBefore },
      },
      include: {
        items: true,
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}

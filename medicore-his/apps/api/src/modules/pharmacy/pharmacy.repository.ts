import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';

@Injectable()
export class PharmacyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listDrugs(orgId: string, search?: string, category?: string) {
    const where: Prisma.DrugWhereInput = {
      orgId,
      isActive: true,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { genericName: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.drug.findMany({
      where,
      orderBy: [{ name: 'asc' }, { strength: 'asc' }],
    });
  }

  async createDrug(orgId: string, dto: CreateDrugDto) {
    return this.prisma.drug.create({
      data: {
        orgId,
        name: dto.name,
        genericName: dto.generic_name,
        form: dto.form,
        strength: dto.strength,
        manufacturer: dto.manufacturer,
        category: dto.category,
        unit: dto.unit,
        price: dto.price,
      },
    });
  }

  async findDrugById(orgId: string, drugId: string) {
    return this.prisma.drug.findFirst({ where: { id: drugId, orgId, isActive: true } });
  }

  async listInventory(orgId: string, facilityId: string, lowStockOnly?: boolean, expiringSoon?: boolean) {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const where: Prisma.PharmacyInventoryWhereInput = {
      orgId,
      facilityId,
      ...(expiringSoon ? { expiryDate: { lte: thirtyDays } } : {}),
    };

    const rows = await this.prisma.pharmacyInventory.findMany({
      where,
      include: { drug: true },
      orderBy: [{ expiryDate: 'asc' }, { quantity: 'asc' }],
    });

    if (!lowStockOnly) {
      return rows;
    }

    return rows.filter((row) => row.quantity <= row.reorderLevel);
  }

  async findInventoryBatch(orgId: string, facilityId: string, drugId: string, batchNumber: string) {
    return this.prisma.pharmacyInventory.findFirst({
      where: { orgId, facilityId, drugId, batchNumber },
      include: { drug: true },
    });
  }

  async findFefoBatches(orgId: string, facilityId: string, drugId: string) {
    return this.prisma.pharmacyInventory.findMany({
      where: { orgId, facilityId, drugId, quantity: { gt: 0 } },
      include: { drug: true },
      orderBy: [{ expiryDate: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async upsertInventoryBatch(params: {
    orgId: string;
    facilityId: string;
    drugId: string;
    batchNumber: string;
    expiryDate: Date;
    quantityDelta: number;
    unitCost?: number;
    unitPrice: number;
    reorderLevel?: number;
  }) {
    return this.prisma.pharmacyInventory.upsert({
      where: {
        orgId_facilityId_drugId_batchNumber: {
          orgId: params.orgId,
          facilityId: params.facilityId,
          drugId: params.drugId,
          batchNumber: params.batchNumber,
        },
      },
      create: {
        orgId: params.orgId,
        facilityId: params.facilityId,
        drugId: params.drugId,
        batchNumber: params.batchNumber,
        expiryDate: params.expiryDate,
        quantity: params.quantityDelta,
        unitCost: params.unitCost,
        unitPrice: params.unitPrice,
        reorderLevel: params.reorderLevel ?? 0,
      },
      update: {
        expiryDate: params.expiryDate,
        quantity: { increment: params.quantityDelta },
        ...(params.unitCost !== undefined ? { unitCost: params.unitCost } : {}),
        unitPrice: params.unitPrice,
        ...(params.reorderLevel !== undefined ? { reorderLevel: params.reorderLevel } : {}),
      },
      include: { drug: true },
    });
  }

  async decrementBatchQuantity(batchId: string, quantity: number) {
    const updatedCount = await this.prisma.pharmacyInventory.updateMany({
      where: {
        id: batchId,
        quantity: { gte: quantity },
      },
      data: {
        quantity: { decrement: quantity },
      },
    });

    if (updatedCount.count === 0) {
      throw new NotFoundException('Inventory batch unavailable for requested quantity.');
    }
  }

  async getTotalDrugQuantity(orgId: string, facilityId: string, drugId: string): Promise<number> {
    const aggregate = await this.prisma.pharmacyInventory.aggregate({
      where: { orgId, facilityId, drugId },
      _sum: { quantity: true },
    });

    return aggregate._sum.quantity ?? 0;
  }

  async listSuppliers(orgId: string) {
    return this.prisma.supplier.findMany({
      where: { orgId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async createSupplier(orgId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        orgId,
        name: dto.name,
        contactName: dto.contact_name,
        phone: dto.phone,
        email: dto.email,
        address: dto.address ? { line1: dto.address } : undefined,
      },
    });
  }

  async listPurchaseOrders(orgId: string) {
    return this.prisma.purchaseOrder.findMany({
      where: { orgId },
      include: { supplier: true, items: { include: { drug: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPurchaseOrder(orgId: string, userId: string, dto: CreatePurchaseOrderDto) {
    const submitNow = dto.submit_now ?? true;
    return this.prisma.purchaseOrder.create({
      data: {
        orgId,
        facilityId: dto.facility_id,
        supplierId: dto.supplier_id,
        notes: dto.notes,
        createdBy: userId,
        status: submitNow ? PurchaseOrderStatus.SUBMITTED : PurchaseOrderStatus.DRAFT,
        items: {
          create: dto.items.map((item) => ({
            drugId: item.drug_id,
            quantity: item.quantity,
            unitCost: item.unit_cost,
            total: item.quantity * item.unit_cost,
          })),
        },
      },
      include: { supplier: true, items: true },
    });
  }

  async findPurchaseOrder(orgId: string, purchaseOrderId: string) {
    return this.prisma.purchaseOrder.findFirst({
      where: { orgId, id: purchaseOrderId },
      include: { supplier: true, items: true },
    });
  }

  async updatePurchaseOrderStatus(
    orgId: string,
    purchaseOrderId: string,
    status: PurchaseOrderStatus,
    userId: string,
  ) {
    const updated = await this.prisma.purchaseOrder.updateMany({
      where: { id: purchaseOrderId, orgId },
      data: {
        status,
        ...(status === PurchaseOrderStatus.APPROVED ? { approvedBy: userId, approvedAt: new Date() } : {}),
        ...(status === PurchaseOrderStatus.RECEIVED ? { receivedBy: userId, receivedAt: new Date() } : {}),
      },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Purchase order not found.');
    }

    return this.findPurchaseOrder(orgId, purchaseOrderId);
  }
}

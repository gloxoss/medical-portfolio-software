import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import type { RequestUser } from '../auth/types/request-user.type';
import { PharmacyService } from './pharmacy.service';
import { CreateDrugDto } from './dto/create-drug.dto';
import { ListDrugsDto } from './dto/list-drugs.dto';
import { AdjustInventoryDto } from './dto/adjust-inventory.dto';
import { DispenseDto } from './dto/dispense.dto';
import {
  CreatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from './dto/create-purchase-order.dto';
import { CreateSupplierDto } from './dto/create-supplier.dto';

function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  return undefined;
}

@ApiTags('Pharmacy')
@ApiBearerAuth('staff-jwt')
@Controller('pharmacy')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('drugs')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Drug catalog' })
  listDrugs(@CurrentUser() user: RequestUser, @Query() query: ListDrugsDto) {
    return this.pharmacyService.listDrugs(user.orgId, query);
  }

  @Post('drugs')
  @Permissions('inventory.write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add drug to catalog' })
  createDrug(@CurrentUser() user: RequestUser, @Body() dto: CreateDrugDto) {
    return this.pharmacyService.createDrug(user.orgId, dto);
  }

  @Get('inventory')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Pharmacy inventory (stock levels per facility)' })
  listInventory(
    @CurrentUser() user: RequestUser,
    @Query('facility_id') facilityId: string,
    @Query('low_stock_only') lowStockOnly?: string,
    @Query('expiring_soon') expiringSoon?: string,
  ) {
    return this.pharmacyService.listInventory(
      user.orgId,
      facilityId,
      parseBoolean(lowStockOnly),
      parseBoolean(expiringSoon),
    );
  }

  @Post('inventory/adjust')
  @Permissions('inventory.write')
  @ApiOperation({ summary: 'Stock adjustment (receive, write-off, return)' })
  adjustInventory(@CurrentUser() user: RequestUser, @Body() dto: AdjustInventoryDto) {
    return this.pharmacyService.adjustInventory(user.orgId, dto);
  }

  @Get('queue')
  @Permissions('prescription.dispense')
  @ApiOperation({ summary: 'Pending prescriptions to dispense' })
  listQueue(
    @CurrentUser() user: RequestUser,
    @Query('facility_id') facilityId: string,
    @Query('status') status?: string,
  ) {
    const statuses = status?.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
    return this.pharmacyService.listQueue(user.orgId, facilityId, statuses);
  }

  @Post('dispense')
  @Permissions('prescription.dispense')
  @ApiOperation({ summary: 'Dispense medication to patient' })
  dispense(@CurrentUser() user: RequestUser, @Body() dto: DispenseDto) {
    return this.pharmacyService.dispense(user.orgId, user.id, dto);
  }

  @Get('suppliers')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Supplier list' })
  listSuppliers(@CurrentUser() user: RequestUser) {
    return this.pharmacyService.listSuppliers(user.orgId);
  }

  @Post('suppliers')
  @Permissions('inventory.write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add supplier' })
  createSupplier(@CurrentUser() user: RequestUser, @Body() dto: CreateSupplierDto) {
    return this.pharmacyService.createSupplier(user.orgId, dto);
  }

  @Get('purchase-orders')
  @Permissions('inventory.read')
  @ApiOperation({ summary: 'Purchase order list' })
  listPurchaseOrders(@CurrentUser() user: RequestUser) {
    return this.pharmacyService.listPurchaseOrders(user.orgId);
  }

  @Post('purchase-orders')
  @Permissions('inventory.write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create purchase order' })
  createPurchaseOrder(@CurrentUser() user: RequestUser, @Body() dto: CreatePurchaseOrderDto) {
    return this.pharmacyService.createPurchaseOrder(user.orgId, user.id, dto);
  }

  @Post('purchase-orders/:id/approve')
  @Permissions('inventory.write')
  @ApiOperation({ summary: 'Approve purchase order' })
  approvePurchaseOrder(@CurrentUser() user: RequestUser, @Param('id') purchaseOrderId: string) {
    return this.pharmacyService.approvePurchaseOrder(user.orgId, user.id, purchaseOrderId);
  }

  @Post('purchase-orders/:id/receive')
  @Permissions('inventory.write')
  @ApiOperation({ summary: 'Mark PO as received and auto-update stock' })
  receivePurchaseOrder(
    @CurrentUser() user: RequestUser,
    @Param('id') purchaseOrderId: string,
    @Body() dto: ReceivePurchaseOrderDto,
  ) {
    return this.pharmacyService.receivePurchaseOrder(user.orgId, user.id, purchaseOrderId, dto);
  }
}

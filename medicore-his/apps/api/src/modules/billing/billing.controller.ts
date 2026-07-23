import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { AddInvoiceItemDto, RecordPaymentDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from '../auth/types/request-user.type';


@ApiTags('Billing')
@ApiBearerAuth('staff-jwt')
@Controller('billing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @Permissions('billing.read')
  @ApiOperation({ summary: 'List invoices for org (optionally filtered by facility)' })
  @ApiResponse({ status: 200, description: 'Invoice list' })
  async getInvoices(
    @CurrentUser() user: RequestUser,
    @Query('facility_id') facilityId?: string
  ) {
    return this.billingService.getInvoices(user, facilityId);
  }

  @Get('invoices/:id')
  @Permissions('billing.read')
  @ApiOperation({ summary: 'Get invoice with line items by ID' })
  @ApiResponse({ status: 200, description: 'Invoice detail' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoiceById(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string
  ) {
    return this.billingService.getInvoiceById(user, id);
  }

  @Put('invoices/:id/items')
  @Permissions('billing.write')
  @ApiOperation({ summary: 'Add line items to a DRAFT invoice' })
  async addInvoiceItems(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: AddInvoiceItemDto
  ) {
    return this.billingService.addItems(user, id, dto);
  }

  @Post('invoices/:id/payment')
  @Permissions('billing.write')
  @ApiOperation({ summary: 'Record cash/bank-transfer payment and mark invoice PAID' })
  async recordPayment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto
  ) {
    return this.billingService.recordPayment(user, id, dto);
  }

  @Post('invoices/:id/pdf')
  @Permissions('billing.read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate invoice PDF (returns base64-encoded buffer)' })
  async generateInvoicePdf(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string
  ) {
    return this.billingService.generateInvoicePdf(user, id);
  }

  @Post('invoices/:id/pay/stripe')
  @Permissions('billing.write')
  @ApiOperation({ summary: 'Create Stripe PaymentIntent for an invoice' })
  @ApiResponse({ status: 201, description: 'Stripe client_secret returned' })
  async initiateStripePayment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string
  ) {
    return this.billingService.generateStripePaymentIntent(user, id);
  }

  @Post('invoices/:id/pay/cmi')
  @Permissions('billing.write')
  @ApiOperation({ summary: 'Generate CMI payment form data (Moroccan card gateway)' })
  async initiateCmiPayment(
    @CurrentUser() user: RequestUser,
    @Param('id') id: string
  ) {
    return this.billingService.generateCmiPaymentIntent(user, id);
  }

  @Get('analytics/revenue')
  @Permissions('billing.read')
  @ApiOperation({ summary: 'Revenue analytics — monthly breakdown + top invoices' })
  async getRevenueStats(@CurrentUser() user: RequestUser) {
    return this.billingService.getRevenueStats(user);
  }
}

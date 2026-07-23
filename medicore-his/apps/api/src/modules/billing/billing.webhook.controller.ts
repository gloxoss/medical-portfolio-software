import { Controller, Post, Body, Req, Logger } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';

@ApiTags('Webhooks')
@Controller('billing/webhooks')
export class BillingWebhookController {
  private readonly logger = new Logger(BillingWebhookController.name);

  constructor(private readonly billingService: BillingService) {}

  @Post('cmi')
  @ApiOperation({ summary: 'CMI payment gateway POST-back (called by CMI server — not the frontend)' })
  @ApiResponse({ status: 200, description: 'Callback processed' })
  async handleCmiCallback(@Body() body: Record<string, string>) {
    this.logger.log('Receiving POST from CMI Payment Gateway');
    return this.billingService.handleCmiCallback(body);
  }
}

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PharmacyService } from './pharmacy.service';

@Controller()
export class PharmacyEventHandler {
  private readonly logger = new Logger(PharmacyEventHandler.name);

  constructor(private readonly pharmacyService: PharmacyService) {}

  @EventPattern('pharmacy.rx.received')
  async handlePharmacyRxReceived(@Payload() payload: Record<string, unknown>) {
    try {
      await this.pharmacyService.enqueueFromEvent(payload, 'pharmacy.rx.received');
      this.logger.log('Processed pharmacy.rx.received event');
    } catch (error) {
      this.logger.error(
        'Failed to process pharmacy.rx.received event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  @EventPattern('clinics.prescription.issued')
  async handleLegacyPrescriptionEvent(@Payload() payload: Record<string, unknown>) {
    try {
      await this.pharmacyService.enqueueFromEvent(payload, 'clinics.prescription.issued');
      this.logger.log('Processed clinics.prescription.issued compatibility event');
    } catch (error) {
      this.logger.error(
        'Failed to process clinics.prescription.issued event',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}

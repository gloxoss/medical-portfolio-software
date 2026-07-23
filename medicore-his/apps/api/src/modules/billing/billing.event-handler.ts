import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { BillingService } from './billing.service';

interface EncounterSignedOffEvent {
  orgId?: string;
  org_id?: string;
  facilityId?: string;
  facility_id?: string;
  encounterId?: string;
  encounter_id?: string;
  patientId?: string;
  patient_id?: string;
  doctorId?: string; // the one who signed off
  doctor_id?: string;
}

interface PharmacyDispensedEvent {
  orgId?: string;
  org_id?: string;
  facilityId?: string;
  facility_id?: string;
  patientId?: string;
  patient_id?: string;
  encounterId?: string;
  encounter_id?: string;
  dispensedBy?: string;
  dispensed_by?: string;
  dispensedItems?: Array<{
    drug_id: string;
    drug_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  dispensed_items?: Array<{
    drug_id: string;
    drug_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
}

interface TelemedicineSessionEndedEvent {
  orgId?: string;
  org_id?: string;
  facilityId?: string;
  facility_id?: string;
  sessionId?: string;
  session_id?: string;
  appointmentId?: string;
  appointment_id?: string;
  encounterId?: string;
  encounter_id?: string;
  patientId?: string;
  patient_id?: string;
  doctorId?: string;
  doctor_id?: string;
  durationMinutes?: number;
  duration_minutes?: number;
}

@Controller()
export class BillingEventHandler {
  private readonly logger = new Logger(BillingEventHandler.name);

  constructor(private readonly billingService: BillingService) {}

  @EventPattern('encounter.signed_off')
  async handleEncounterSignedOff(@Payload() data: EncounterSignedOffEvent) {
    const orgId = data.orgId ?? data.org_id;
    const facilityId = data.facilityId ?? data.facility_id;
    const encounterId = data.encounterId ?? data.encounter_id;
    const patientId = data.patientId ?? data.patient_id;
    const doctorId = data.doctorId ?? data.doctor_id;

    if (!orgId || !facilityId || !encounterId || !patientId || !doctorId) {
      this.logger.error('Invalid encounter.signed_off event payload, required fields are missing.');
      return;
    }

    this.logger.log(`Received encounter signed off event for encounter: ${encounterId}`);
    
    try {
      const invoice = await this.billingService.autoGenerateInvoice(
        orgId,
        facilityId,
        patientId,
        encounterId,
        doctorId, // treating doctor as creator
      );

      this.logger.log(`Auto-generated invoice [DRAFT] ${invoice.invoiceNo} successfully.`);
    } catch (error) {
      this.logger.error(`Failed to generate invoice for encounter ${encounterId}: `, error);
    }
  }

  @EventPattern('pharmacy.dispensed')
  async handlePharmacyDispensed(@Payload() data: PharmacyDispensedEvent) {
    const orgId = data.orgId ?? data.org_id;
    const facilityId = data.facilityId ?? data.facility_id;
    const patientId = data.patientId ?? data.patient_id;
    const encounterId = data.encounterId ?? data.encounter_id;
    const dispensedBy = data.dispensedBy ?? data.dispensed_by;
    const items = data.dispensedItems ?? data.dispensed_items ?? [];

    if (!orgId || !facilityId || !patientId || !encounterId || !dispensedBy) {
      this.logger.error('Invalid pharmacy.dispensed event payload, required fields are missing.');
      return;
    }

    try {
      await this.billingService.addPharmacyDispenseCharges({
        orgId,
        facilityId,
        patientId,
        encounterId,
        dispensedBy,
        items,
      });
      this.logger.log(`Applied pharmacy charges for encounter ${encounterId}`);
    } catch (error) {
      this.logger.error(`Failed to apply pharmacy charges for encounter ${encounterId}: `, error);
    }
  }

  @EventPattern('telemedicine.session.ended')
  async handleTelemedicineSessionEnded(@Payload() data: TelemedicineSessionEndedEvent) {
    const orgId = data.orgId ?? data.org_id;
    const facilityId = data.facilityId ?? data.facility_id;
    const sessionId = data.sessionId ?? data.session_id;
    const appointmentId = data.appointmentId ?? data.appointment_id;
    const encounterId = data.encounterId ?? data.encounter_id;
    const patientId = data.patientId ?? data.patient_id;
    const doctorId = data.doctorId ?? data.doctor_id;
    const durationMinutes = data.durationMinutes ?? data.duration_minutes ?? 1;

    if (!orgId || !facilityId || !appointmentId || !patientId || !doctorId) {
      this.logger.error('Invalid telemedicine.session.ended event payload, required fields are missing.');
      return;
    }

    try {
      await this.billingService.addTelemedicineSessionCharge({
        orgId,
        facilityId,
        patientId,
        encounterId,
        appointmentId,
        doctorId,
        durationMinutes,
      });

      this.logger.log(`Applied telemedicine charge for session ${sessionId ?? 'unknown'}`);
    } catch (error) {
      this.logger.error(
        `Failed to apply telemedicine charge for session ${sessionId ?? 'unknown'}: `,
        error,
      );
    }
  }
}

import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TelemedicineService } from './telemedicine.service';

type AppointmentTelemedicineBookedEvent = {
  orgId?: string;
  org_id?: string;
  facilityId?: string;
  facility_id?: string;
  appointmentId?: string;
  appointment_id?: string;
  recordingEnabled?: boolean;
  recording_enabled?: boolean;
};

@Controller()
export class TelemedicineEventHandler {
  private readonly logger = new Logger(TelemedicineEventHandler.name);

  constructor(private readonly telemedicineService: TelemedicineService) {}

  @EventPattern('appointment.telemedicine.booked')
  async handleAppointmentTelemedicineBooked(
    @Payload() payload: AppointmentTelemedicineBookedEvent,
  ): Promise<void> {
    const orgId = payload.orgId ?? payload.org_id;
    const facilityId = payload.facilityId ?? payload.facility_id;
    const appointmentId = payload.appointmentId ?? payload.appointment_id;
    const recordingEnabled = payload.recordingEnabled ?? payload.recording_enabled;

    if (!orgId || !appointmentId) {
      this.logger.warn('Skipping appointment.telemedicine.booked event: required fields missing');
      return;
    }

    try {
      await this.telemedicineService.createSessionFromEvent(
        orgId,
        appointmentId,
        facilityId,
        recordingEnabled,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to auto-create telemedicine session for appointment ${appointmentId}: ${message}`,
      );
    }
  }
}

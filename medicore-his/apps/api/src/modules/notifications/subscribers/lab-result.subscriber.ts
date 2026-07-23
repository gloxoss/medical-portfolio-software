import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import { RedisPublisherService } from '../../../infrastructure/events/redis-publisher.service';
import { LabResultRepository } from '../../lab/lab-result.repository';
import { PatientsService } from '../../patients/patients.service';
import { NotificationService } from '../notification.service';
import { NotificationTemplates } from '../notification.templates';

type LabResultEventPayload = {
  orderId?: string;
  order_id?: string;
  patientId?: string;
  patient_id?: string;
  panelCode?: string;
  panel_code?: string;
  orgId?: string;
  org_id?: string;
  facilityId?: string;
  facility_id?: string;
  encounterId?: string;
  encounter_id?: string;
  components?: Array<{ flag?: string }>;
};

type PatientContact = {
  _id?: string;
  phone?: string;
  name?: { display?: string };
};

@Injectable()
export class LabResultSubscriber {
  private readonly logger = new Logger(LabResultSubscriber.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly patientsService: PatientsService,
    private readonly labResultRepository: LabResultRepository,
    private readonly redisPublisher: RedisPublisherService,
    private readonly config: ConfigService,
  ) {}

  @EventPattern('lab.result.ready')
  async handleLabResultReady(@Payload() payload: LabResultEventPayload): Promise<void> {
    const orgId = payload.orgId ?? payload.org_id;
    const patientId = payload.patientId ?? payload.patient_id;
    const orderId = payload.orderId ?? payload.order_id;
    const panelCode = payload.panelCode ?? payload.panel_code ?? 'lab panel';

    if (!orgId || !patientId || !orderId) {
      this.logger.warn('Skipping lab.result.ready: required fields missing');
      return;
    }

    const patient = await this.patientsService.getById(orgId, patientId) as PatientContact;
    if (!patient || !patient.phone) return;

    const portalBase = (this.config.get<string>('PORTAL_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');

    await this.notificationService.notify('sms', patient.phone, NotificationTemplates.LAB_RESULT_READY, {
      patient_name: patient?.name?.display ?? 'Patient',
      panel: panelCode,
      portal_url: `${portalBase}/portal/labs`,
    }, {
      orgId,
      patientId,
      originalEvent: 'lab.result.ready',
    });

    const hasCriticalFromEvent = (payload.components ?? []).some((component) => component.flag === 'critical');

    let hasCritical = hasCriticalFromEvent;
    if (!hasCritical) {
      const result = await this.labResultRepository.findByOrderId(orgId, orderId);
      hasCritical = (result?.components ?? []).some((component) => component.flag === 'critical');
    }

    if (!hasCritical) return;

    await this.notificationService.notify('sms', patient.phone, NotificationTemplates.LAB_RESULT_CRITICAL, {
      patient_name: patient?.name?.display ?? 'Patient',
      panel: panelCode,
      portal_url: `${portalBase}/portal/labs`,
    }, {
      orgId,
      patientId,
      originalEvent: 'lab.result.ready',
    });

    await this.redisPublisher.publish('notification.inapp', {
      type: 'LAB_RESULT_CRITICAL',
      orgId,
      facilityId: payload.facilityId ?? payload.facility_id,
      patientId,
      orderId,
      encounterId: payload.encounterId ?? payload.encounter_id,
      message: `Critical result detected for ${panelCode}`,
    });
  }
}

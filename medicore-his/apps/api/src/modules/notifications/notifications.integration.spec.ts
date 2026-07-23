import { ConfigService } from '@nestjs/config';
import { AppointmentReminderSubscriber } from './subscribers/appointment-reminder.subscriber';
import { InvoicePaidSubscriber } from './subscribers/invoice-paid.subscriber';
import { LabResultSubscriber } from './subscribers/lab-result.subscriber';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { PatientsService } from '../patients/patients.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { SchedulingService } from '../scheduling/scheduling.service';
import { LabResultRepository } from '../lab/lab-result.repository';
import { NotificationService } from './notification.service';
import { NotificationTemplates } from './notification.templates';

describe('Notifications Integration', () => {
  const notificationService = {
    notify: jest.fn(),
    generateInvoicePdf: jest.fn(),
  } as unknown as NotificationService;

  const schedulingService = {
    getUpcomingAppointmentsForTomorrow: jest.fn(),
  } as unknown as SchedulingService;

  const prisma = {
    organization: { findMany: jest.fn() },
    facility: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    portalPatientSetting: { findUnique: jest.fn() },
    invoice: { findFirst: jest.fn() },
  } as unknown as PrismaService;

  const patientsService = {
    getById: jest.fn(),
  } as unknown as PatientsService;

  const redisPublisher = {
    publish: jest.fn(),
  } as unknown as RedisPublisherService;

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'PORTAL_URL') return 'http://localhost:3000';
      return undefined;
    }),
  } as unknown as ConfigService;

  const labResultRepository = {
    findByOrderId: jest.fn(),
  } as unknown as LabResultRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    (notificationService.notify as jest.Mock).mockResolvedValue({ ok: true, value: undefined });
    (notificationService.generateInvoicePdf as jest.Mock).mockResolvedValue(Buffer.from('pdf'));
    (prisma.portalPatientSetting.findUnique as jest.Mock).mockResolvedValue({
      smsNotifications: true,
      emailNotifications: false,
    });
  });

  it('appointment reminder fires for tomorrow appointments', async () => {
    const subscriber = new AppointmentReminderSubscriber(
      notificationService,
      schedulingService,
      prisma,
      patientsService,
      redisPublisher,
    );

    (prisma.organization.findMany as jest.Mock).mockResolvedValue([{ id: 'org-1' }]);
    (prisma.facility.findMany as jest.Mock).mockResolvedValue([{ id: 'fac-1' }]);
    (schedulingService.getUpcomingAppointmentsForTomorrow as jest.Mock).mockResolvedValue([
      {
        _id: 'appt-1',
        patient_id: 'pat-1',
        doctor_id: 'doc-1',
        start_time: new Date('2026-04-11T10:00:00.000Z'),
      },
    ]);

    await subscriber.publishTomorrowReminders();

    expect(redisPublisher.publish).toHaveBeenCalledWith(
      'appointment.reminder',
      expect.objectContaining({
        orgId: 'org-1',
        facilityId: 'fac-1',
        appointmentId: 'appt-1',
      }),
    );
  });

  it('lab result ready sends SMS with portal URL', async () => {
    const subscriber = new LabResultSubscriber(
      notificationService,
      patientsService,
      labResultRepository,
      redisPublisher,
      config,
    );

    (patientsService.getById as jest.Mock).mockResolvedValue({
      _id: 'pat-1',
      phone: '+212600000001',
      name: { display: 'Nadia Karim' },
    });
    (labResultRepository.findByOrderId as jest.Mock).mockResolvedValue({ components: [] });

    await subscriber.handleLabResultReady({
      org_id: 'org-1',
      patient_id: 'pat-1',
      order_id: 'lab-1',
      panel_code: 'CBC',
    });

    expect(notificationService.notify).toHaveBeenCalledWith(
      'sms',
      '+212600000001',
      NotificationTemplates.LAB_RESULT_READY,
      expect.objectContaining({
        panel: 'CBC',
        portal_url: 'http://localhost:3000/portal/labs',
      }),
      expect.objectContaining({
        orgId: 'org-1',
        patientId: 'pat-1',
      }),
    );
  });

  it('critical lab result sends priority SMS and doctor in-app notification', async () => {
    const subscriber = new LabResultSubscriber(
      notificationService,
      patientsService,
      labResultRepository,
      redisPublisher,
      config,
    );

    (patientsService.getById as jest.Mock).mockResolvedValue({
      _id: 'pat-1',
      phone: '+212600000001',
      name: { display: 'Nadia Karim' },
    });

    await subscriber.handleLabResultReady({
      org_id: 'org-1',
      facility_id: 'fac-1',
      patient_id: 'pat-1',
      order_id: 'lab-1',
      panel_code: 'CBC',
      components: [{ flag: 'critical' }],
    });

    expect(notificationService.notify).toHaveBeenCalledWith(
      'sms',
      '+212600000001',
      NotificationTemplates.LAB_RESULT_CRITICAL,
      expect.any(Object),
      expect.objectContaining({
        orgId: 'org-1',
        patientId: 'pat-1',
      }),
    );

    expect(redisPublisher.publish).toHaveBeenCalledWith(
      'notification.inapp',
      expect.objectContaining({
        type: 'LAB_RESULT_CRITICAL',
        orgId: 'org-1',
        patientId: 'pat-1',
      }),
    );
  });

  it('invoice paid sends email receipt and falls back to SMS when email fails', async () => {
    const subscriber = new InvoicePaidSubscriber(
      notificationService,
      patientsService,
      prisma,
      config,
    );

    (notificationService.notify as jest.Mock)
      .mockResolvedValueOnce({ ok: false, error: 'smtp unavailable' })
      .mockResolvedValueOnce({ ok: true, value: undefined });

    (patientsService.getById as jest.Mock).mockResolvedValue({
      _id: 'pat-1',
      email: 'patient@example.com',
      phone: '+212600000001',
    });

    (prisma.invoice.findFirst as jest.Mock).mockResolvedValue({
      id: 'inv-1',
      invoiceNo: 'INV-2026-00001',
      patientId: 'pat-1',
      total: 420,
      currency: 'MAD',
      createdAt: new Date('2026-04-10T10:00:00.000Z'),
      paidAt: new Date('2026-04-10T11:00:00.000Z'),
      items: [
        { description: 'Consultation', quantity: 1, unitPrice: 420, total: 420 },
      ],
    });

    await subscriber.handleInvoicePaid({
      org_id: 'org-1',
      invoice_id: 'inv-1',
      patient_id: 'pat-1',
      amount: 420,
      currency: 'MAD',
    });

    expect(notificationService.notify).toHaveBeenNthCalledWith(
      1,
      'email',
      'patient@example.com',
      NotificationTemplates.INVOICE_RECEIPT,
      expect.objectContaining({ invoice_no: 'INV-2026-00001' }),
      expect.objectContaining({
        orgId: 'org-1',
        patientId: 'pat-1',
        attachment: expect.objectContaining({ filename: 'receipt-INV-2026-00001.pdf' }),
      }),
    );

    expect(notificationService.notify).toHaveBeenNthCalledWith(
      2,
      'sms',
      '+212600000001',
      NotificationTemplates.INVOICE_RECEIPT_SMS_FALLBACK,
      expect.objectContaining({ portal_url: 'http://localhost:3000/portal/invoices' }),
      expect.objectContaining({
        orgId: 'org-1',
        patientId: 'pat-1',
      }),
    );
  });
});

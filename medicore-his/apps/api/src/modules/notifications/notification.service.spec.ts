import { NotificationService } from './notification.service';
import type { ISmsProvider } from '../../infrastructure/providers/sms/sms.interface';
import type { IEmailProvider } from '../../infrastructure/providers/email/email.interface';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { NotificationRepository } from './notification.repository';

describe('NotificationService', () => {
  let service: NotificationService;

  const repository = {
    getTemplate: jest.fn(),
    logNotification: jest.fn(),
  } as unknown as jest.Mocked<NotificationRepository>;

  const smsProvider = {
    isConfigured: jest.fn(),
    send: jest.fn(),
  } as unknown as jest.Mocked<ISmsProvider>;

  const emailProvider = {
    isConfigured: jest.fn(),
    send: jest.fn(),
  } as unknown as jest.Mocked<IEmailProvider>;

  const redisPublisher = {
    publish: jest.fn(),
  } as unknown as RedisPublisherService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationService(repository, smsProvider, emailProvider, redisPublisher);
    smsProvider.isConfigured.mockReturnValue(true);
    emailProvider.isConfigured.mockReturnValue(true);
    smsProvider.send.mockResolvedValue({ messageId: 'sms-1' });
    emailProvider.send.mockResolvedValue(undefined);

    repository.getTemplate.mockImplementation(async (_orgId, event) => {
      if (event === 'appointment.reminder') {
        return {
          id: 'tpl-sms',
          orgId: 'org-1',
          createdAt: new Date('2026-04-12T00:00:00.000Z'),
          isActive: true,
          language: 'fr',
          event,
          channel: 'sms',
          subject: null,
          body: 'Hi {{patient_name}}',
        } as any;
      }

      return {
        id: 'tpl-email',
        orgId: 'org-1',
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
        isActive: true,
        language: 'fr',
        event,
        channel: 'email',
        subject: 'Invoice {{invoice_no}}',
        body: 'Body {{amount}}',
      } as any;
    });
  });

  it('routes sms notifications to SMS provider with hydrated template vars', async () => {
    await service.notify(
      'sms',
      '+212600000000',
      'appointment.reminder',
      { patient_name: 'Nadia', date: '2026-04-11' },
      {
        orgId: 'org-1',
        patientId: 'pat-1',
      },
    );

    expect(smsProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+212600000000',
        body: 'Hi Nadia',
      }),
    );
  });

  it('routes email notifications to Email provider with hydrated template vars', async () => {
    await service.notify(
      'email',
      'patient@example.com',
      'invoice.receipt',
      { invoice_no: 'INV-2026-00001', amount: '420.00' },
      {
        orgId: 'org-1',
        patientId: 'pat-1',
      },
    );

    expect(emailProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'patient@example.com',
        subject: 'Invoice INV-2026-00001',
        html: 'Body 420.00',
      }),
    );
  });

  it('publishes notifications.failed when provider throws', async () => {
    smsProvider.send.mockRejectedValue(new Error('gateway timeout'));

    const result = await service.notify(
      'sms',
      '+212600000000',
      'appointment.reminder',
      { patient_name: 'Nadia' },
      {
        orgId: 'org-1',
        patientId: 'pat-1',
        attempt: 2,
        originalEvent: 'appointment.reminder',
      },
    );

    expect(result).toEqual({ ok: false, error: 'gateway timeout' });
    expect(redisPublisher.publish).toHaveBeenCalledWith(
      'notifications.failed',
      expect.objectContaining({
        channel: 'sms',
        recipient: '+212600000000',
        template: 'appointment.reminder',
        attempt: 2,
        orgId: 'org-1',
        patientId: 'pat-1',
      }),
    );
  });
});

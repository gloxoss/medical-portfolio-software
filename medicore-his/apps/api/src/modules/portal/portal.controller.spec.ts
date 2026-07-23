import { Test, TestingModule } from '@nestjs/testing';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import type { PatientRequestUser } from './portal-jwt.strategy';

const mockPortalService = {
  getBookableFacilities: jest.fn(),
  getBookableDoctors: jest.fn(),
  getDoctorAvailabilityForPortal: jest.fn(),
  getPortalSettings: jest.fn(),
  updatePortalSettings: jest.fn(),
  requestDataExport: jest.fn(),
  requestAccountDeletion: jest.fn(),
};

describe('PortalController (guided booking)', () => {
  let controller: PortalController;

  const patientUser: PatientRequestUser = {
    patientId: '662f7f7f7f7f7f7f7f7f7f7f',
    orgId: 'org_123',
    phone: '+212600000000',
  };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalController],
      providers: [{ provide: PortalService, useValue: mockPortalService }],
    }).compile();

    controller = module.get<PortalController>(PortalController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns bookable facilities scoped to patient org', async () => {
    mockPortalService.getBookableFacilities.mockResolvedValue([
      { id: 'facility_a', name: 'Main Clinic' },
    ]);

    const result = await controller.getBookableFacilities(patientUser);

    expect(mockPortalService.getBookableFacilities).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
    );
    expect(result).toEqual([{ id: 'facility_a', name: 'Main Clinic' }]);
  });

  it('returns doctors for selected facility', async () => {
    mockPortalService.getBookableDoctors.mockResolvedValue([
      { id: 'doctor_a', name: 'Amal Idrissi', specialties: ['Cardiology'] },
    ]);

    const result = await controller.getBookableDoctors(patientUser, 'facility_a');

    expect(mockPortalService.getBookableDoctors).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
      'facility_a',
    );
    expect(result).toEqual([
      { id: 'doctor_a', name: 'Amal Idrissi', specialties: ['Cardiology'] },
    ]);
  });

  it('returns availability slots for doctor and date', async () => {
    mockPortalService.getDoctorAvailabilityForPortal.mockResolvedValue([
      {
        start_time: '2026-04-22T09:00:00.000Z',
        end_time: '2026-04-22T09:20:00.000Z',
        available: true,
      },
    ]);

    const result = await controller.getBookableAvailability(patientUser, {
      facilityId: 'facility_a',
      doctorId: 'doctor_a',
      date: '2026-04-22',
    });

    expect(mockPortalService.getDoctorAvailabilityForPortal).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
      'facility_a',
      'doctor_a',
      '2026-04-22',
    );
    expect(result).toEqual([
      {
        start_time: '2026-04-22T09:00:00.000Z',
        end_time: '2026-04-22T09:20:00.000Z',
        available: true,
      },
    ]);
  });

  it('throws when service rejects invalid doctor/facility combination', async () => {
    const error = new Error('Doctor not found for facility');
    mockPortalService.getDoctorAvailabilityForPortal.mockRejectedValue(error);

    await expect(
      controller.getBookableAvailability(patientUser, {
        facilityId: 'facility_a',
        doctorId: 'doctor_invalid',
        date: '2026-04-22',
      }),
    ).rejects.toThrow('Doctor not found for facility');
  });

  it('returns portal settings scoped to patient org', async () => {
    mockPortalService.getPortalSettings.mockResolvedValue({
      sms_notifications: true,
      email_notifications: false,
      ai_consent: true,
    });

    const result = await controller.getSettings(patientUser);

    expect(mockPortalService.getPortalSettings).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
    );
    expect(result).toEqual({
      sms_notifications: true,
      email_notifications: false,
      ai_consent: true,
    });
  });

  it('forwards settings update payload and audit metadata', async () => {
    mockPortalService.updatePortalSettings.mockResolvedValue({
      sms_notifications: false,
      email_notifications: true,
      ai_consent: false,
    });

    const request = {
      headers: {
        'x-forwarded-for': '203.0.113.5, 198.51.100.10',
        'user-agent': 'vitest-agent',
      },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.2' },
    } as any;

    const dto = {
      sms_notifications: false,
      email_notifications: true,
    };

    const result = await controller.updateSettings(patientUser, dto, request);

    expect(mockPortalService.updatePortalSettings).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
      dto,
      {
        ipAddress: '203.0.113.5',
        userAgent: 'vitest-agent',
      },
    );
    expect(result).toEqual({
      sms_notifications: false,
      email_notifications: true,
      ai_consent: false,
    });
  });

  it('forwards GDPR data export request to service', async () => {
    mockPortalService.requestDataExport.mockResolvedValue({
      status: 'queued',
      request_id: 'req_1',
      request_type: 'data_export',
      message: 'Export queued',
    });

    const result = await controller.requestDataExport(patientUser);

    expect(mockPortalService.requestDataExport).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
    );
    expect(result).toEqual({
      status: 'queued',
      request_id: 'req_1',
      request_type: 'data_export',
      message: 'Export queued',
    });
  });

  it('forwards account deletion reason to service', async () => {
    mockPortalService.requestAccountDeletion.mockResolvedValue({
      status: 'queued',
      request_id: 'req_2',
      request_type: 'delete_account',
      message: 'Deletion request queued',
    });

    const result = await controller.requestDeleteAccount(patientUser, {
      reason: 'User requested removal',
    });

    expect(mockPortalService.requestAccountDeletion).toHaveBeenCalledWith(
      patientUser.patientId,
      patientUser.orgId,
      'User requested removal',
    );
    expect(result).toEqual({
      status: 'queued',
      request_id: 'req_2',
      request_type: 'delete_account',
      message: 'Deletion request queued',
    });
  });
});

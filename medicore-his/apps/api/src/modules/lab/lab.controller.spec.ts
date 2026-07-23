import { BadRequestException } from '@nestjs/common';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';

const mockLabService = {
  placeOrder: jest.fn(),
  listOrders: jest.fn(),
  getOrderById: jest.fn(),
  updateStatus: jest.fn(),
  recordResult: jest.fn(),
  getResult: jest.fn(),
  getResultsForPatient: jest.fn(),
};

describe('LabController', () => {
  let controller: LabController;

  const user = {
    id: 'user_1',
    orgId: 'org_1',
  } as any;

  beforeAll(() => {
    controller = new LabController(mockLabService as unknown as LabService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires x-facility-id header on place order', async () => {
    await expect(
      controller.placeOrder(user, '' as unknown as string, {
        patientId: 'patient_1',
        encounterId: 'enc_1',
        panelCode: 'CBC',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('requires x-facility-id header on list orders', async () => {
    await expect(controller.listOrders(user, '' as unknown as string, {} as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('requires x-facility-id header on update status', async () => {
    await expect(
      controller.updateStatus(user, '' as unknown as string, 'order_1', {
        status: 'collected',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('forwards list filters to service', async () => {
    mockLabService.listOrders.mockResolvedValue([]);

    const query = {
      patientId: 'patient_1',
      encounterId: 'enc_1',
      status: 'completed',
    };

    await controller.listOrders(user, 'facility_1', query as any);

    expect(mockLabService.listOrders).toHaveBeenCalledWith('org_1', 'facility_1', query);
  });

  it('forwards status update body to service', async () => {
    mockLabService.updateStatus.mockResolvedValue({ id: 'order_1', status: 'collected' });

    await controller.updateStatus(user, 'facility_1', 'order_1', {
      status: 'collected',
    });

    expect(mockLabService.updateStatus).toHaveBeenCalledWith(
      'org_1',
      'facility_1',
      'order_1',
      'collected',
    );
  });

  it('forwards recordResult and injects authenticated resultedBy user id', async () => {
    mockLabService.recordResult.mockResolvedValue({ id: 'result_1' });

    const payload = {
      components: [
        {
          name: 'WBC',
          value: 11.2,
          unit: 'x10^9/L',
          flag: 'high',
        },
      ],
      freetextNote: 'Follow up',
    };

    await controller.recordResult(user, 'facility_1', 'order_1', payload as any);

    expect(mockLabService.recordResult).toHaveBeenCalledWith(
      'org_1',
      'facility_1',
      'order_1',
      'user_1',
      payload,
    );
  });

  it('forwards patient results route to service', async () => {
    mockLabService.getResultsForPatient.mockResolvedValue([]);

    await controller.getPatientResults(user, 'facility_1', 'patient_1');

    expect(mockLabService.getResultsForPatient).toHaveBeenCalledWith(
      'org_1',
      'facility_1',
      'patient_1',
    );
  });
});

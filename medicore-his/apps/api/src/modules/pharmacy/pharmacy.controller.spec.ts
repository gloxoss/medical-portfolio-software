import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';

const mockPharmacyService = {
  listDrugs: jest.fn(),
  createDrug: jest.fn(),
  listInventory: jest.fn(),
  adjustInventory: jest.fn(),
  listQueue: jest.fn(),
  dispense: jest.fn(),
  listSuppliers: jest.fn(),
  createSupplier: jest.fn(),
  listPurchaseOrders: jest.fn(),
  createPurchaseOrder: jest.fn(),
  approvePurchaseOrder: jest.fn(),
  receivePurchaseOrder: jest.fn(),
};

describe('PharmacyController', () => {
  let controller: PharmacyController;

  const user = {
    id: 'user_1',
    orgId: 'org_1',
  } as any;

  beforeAll(() => {
    controller = new PharmacyController(mockPharmacyService as unknown as PharmacyService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('forwards drug catalog query to service', async () => {
    mockPharmacyService.listDrugs.mockResolvedValue([{ id: 'drug_1', name: 'Metformin' }]);

    const result = await controller.listDrugs(user, { search: 'met', category: 'oral' } as any);

    expect(mockPharmacyService.listDrugs).toHaveBeenCalledWith(user.orgId, {
      search: 'met',
      category: 'oral',
    });
    expect(result).toEqual([{ id: 'drug_1', name: 'Metformin' }]);
  });

  it('parses inventory boolean filters from query string', async () => {
    mockPharmacyService.listInventory.mockResolvedValue([]);

    await controller.listInventory(user, 'facility_1', 'true', 'false');

    expect(mockPharmacyService.listInventory).toHaveBeenCalledWith(
      user.orgId,
      'facility_1',
      true,
      false,
    );
  });

  it('splits queue status list from comma-separated query', async () => {
    mockPharmacyService.listQueue.mockResolvedValue([]);

    await controller.listQueue(user, 'facility_1', 'pending,dispensing');

    expect(mockPharmacyService.listQueue).toHaveBeenCalledWith(
      user.orgId,
      'facility_1',
      ['pending', 'dispensing'],
    );
  });

  it('forwards dispense request with authenticated user id', async () => {
    mockPharmacyService.dispense.mockResolvedValue({ success: true });

    const dto = {
      patient_id: 'patient_1',
      encounter_id: 'enc_1',
      facility_id: 'facility_1',
      items: [{ drug_id: 'drug_1', quantity: 10 }],
    };

    const result = await controller.dispense(user, dto as any);

    expect(mockPharmacyService.dispense).toHaveBeenCalledWith(user.orgId, user.id, dto);
    expect(result).toEqual({ success: true });
  });

  it('forwards receive purchase order request', async () => {
    mockPharmacyService.receivePurchaseOrder.mockResolvedValue({ id: 'po_1', status: 'RECEIVED' });

    const result = await controller.receivePurchaseOrder(user, 'po_1', {
      items: [{ drug_id: 'drug_1', quantity: 10, unit_cost: 2.5 }],
    } as any);

    expect(mockPharmacyService.receivePurchaseOrder).toHaveBeenCalledWith(
      user.orgId,
      user.id,
      'po_1',
      { items: [{ drug_id: 'drug_1', quantity: 10, unit_cost: 2.5 }] },
    );
    expect(result).toEqual({ id: 'po_1', status: 'RECEIVED' });
  });
});

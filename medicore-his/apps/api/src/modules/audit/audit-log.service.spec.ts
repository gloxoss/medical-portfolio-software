import { AuditLogService } from './audit-log.service';
import { GetAuditLogsDto } from './dto/get-audit-logs.dto';

describe('AuditLogService', () => {
  const create = jest.fn();
  const find = jest.fn();
  const countDocuments = jest.fn();

  let sort: jest.Mock;
  let skip: jest.Mock;
  let limit: jest.Mock;
  let exec: jest.Mock;

  let service: AuditLogService;

  beforeEach(() => {
    jest.clearAllMocks();

    exec = jest.fn();
    limit = jest.fn(() => ({ exec }));
    skip = jest.fn(() => ({ limit }));
    sort = jest.fn(() => ({ skip }));

    find.mockReturnValue({ sort });

    service = new AuditLogService({
      create,
      find,
      countDocuments,
    } as any);
  });

  it('maps camelCase params to snake_case fields when logging', async () => {
    await service.log({
      orgId: 'org_1',
      facilityId: 'facility_1',
      userId: 'user_1',
      userName: 'Amine Idrissi',
      userRole: 'doctor',
      action: 'encounter.updated',
      entityType: 'encounter',
      entityId: 'enc_1',
      metadata: { key: 'value' },
      ipAddress: '127.0.0.1',
      userAgent: 'vitest',
    });

    expect(create).toHaveBeenCalledWith({
      org_id: 'org_1',
      facility_id: 'facility_1',
      user_id: 'user_1',
      user_name: 'Amine Idrissi',
      user_role: 'doctor',
      action: 'encounter.updated',
      entity_type: 'encounter',
      entity_id: 'enc_1',
      metadata: { key: 'value' },
      ip_address: '127.0.0.1',
      user_agent: 'vitest',
    });
  });

  it('applies search/entity/action filters and pagination', async () => {
    const rows = [{ _id: 'audit_1' }, { _id: 'audit_2' }];
    exec.mockResolvedValue(rows);
    countDocuments.mockResolvedValue(22);

    const query: GetAuditLogsDto = {
      q: 'patient',
      entity_type: 'encounter',
      action: 'encounter.updated',
      page: 2,
      limit: 10,
    };

    const result = await service.getAuditLogs('org_1', query);

    const expectedFilter = {
      org_id: 'org_1',
      entity_type: 'encounter',
      action: 'encounter.updated',
      $text: { $search: 'patient' },
    };

    expect(find).toHaveBeenCalledWith(expectedFilter);
    expect(sort).toHaveBeenCalledWith({ created_at: -1 });
    expect(skip).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(countDocuments).toHaveBeenCalledWith(expectedFilter);
    expect(result).toEqual({ data: rows, total: 22 });
  });

  it('uses org-only filter when optional filters are omitted', async () => {
    exec.mockResolvedValue([]);
    countDocuments.mockResolvedValue(0);

    const query: GetAuditLogsDto = {
      page: 1,
      limit: 20,
    };

    await service.getAuditLogs('org_2', query);

    expect(find).toHaveBeenCalledWith({ org_id: 'org_2' });
    expect(skip).toHaveBeenCalledWith(0);
    expect(limit).toHaveBeenCalledWith(20);
  });
});

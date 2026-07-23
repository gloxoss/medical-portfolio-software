import { BadRequestException } from '@nestjs/common';
import { Icd10Controller } from './icd10.controller';
import { Icd10Service } from './icd10.service';

const mockIcd10Service = {
  search: jest.fn(),
};

describe('Icd10Controller', () => {
  let controller: Icd10Controller;

  beforeAll(() => {
    controller = new Icd10Controller(mockIcd10Service as unknown as Icd10Service);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires x-facility-id header', () => {
    expect(() => controller.search('' as unknown as string, {} as any)).toThrow(BadRequestException);
    expect(mockIcd10Service.search).not.toHaveBeenCalled();
  });

  it('forwards query and limit to service', () => {
    mockIcd10Service.search.mockReturnValue([
      { code: 'A00', description: 'Cholera' },
    ]);

    const result = controller.search('facility_1', { q: 'A00', limit: 10 });

    expect(mockIcd10Service.search).toHaveBeenCalledWith('A00', 10);
    expect(result).toEqual([
      { code: 'A00', description: 'Cholera' },
    ]);
  });

  it('uses empty query when q is omitted', () => {
    mockIcd10Service.search.mockReturnValue([]);

    controller.search('facility_1', {} as any);

    expect(mockIcd10Service.search).toHaveBeenCalledWith('', undefined);
  });
});

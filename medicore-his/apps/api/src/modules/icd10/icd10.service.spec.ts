import { Icd10Service } from './icd10.service';

describe('Icd10Service', () => {
  let service: Icd10Service;

  beforeAll(() => {
    service = new Icd10Service();
  });

  it('returns default limited results for empty query', () => {
    const results = service.search('');

    expect(results).toHaveLength(20);
    expect(results[0]).toEqual(
      expect.objectContaining({
        code: expect.any(String),
        description: expect.any(String),
      }),
    );
  });

  it('caps maximum result size at 50', () => {
    const results = service.search('', 500);

    expect(results).toHaveLength(50);
  });

  it('matches by code with dot-insensitive lookup', () => {
    const results = service.search('A00.0', 20);

    expect(results.some((item) => item.code === 'A000')).toBe(true);
  });

  it('matches by description text case-insensitively', () => {
    const results = service.search('chol', 20);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((item) => item.description.toLowerCase().includes('chol'))).toBe(true);
  });
});

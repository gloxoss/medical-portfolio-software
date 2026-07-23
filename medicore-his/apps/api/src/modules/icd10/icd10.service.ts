import { Injectable, Logger } from '@nestjs/common';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

type Icd10Record = {
  code: string;
  name: string;
};

export type Icd10SearchResult = {
  code: string;
  description: string;
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class Icd10Service {
  private readonly logger = new Logger(Icd10Service.name);
  private readonly records: Icd10Record[];

  constructor() {
    this.records = this.loadDataset();
    this.logger.log(`ICD-10 catalog loaded (${this.records.length} records)`);
  }

  search(query: string, limit = DEFAULT_LIMIT): Icd10SearchResult[] {
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit || DEFAULT_LIMIT)));
    const normalizedQuery = query.trim().toLowerCase();
    const normalizedCodeQuery = normalizedQuery.replace(/\./g, '').toUpperCase();

    if (!normalizedQuery) {
      return this.records.slice(0, safeLimit).map((record) => ({
        code: record.code,
        description: record.name,
      }));
    }

    const results = this.records.filter((record) => {
      return record.code.includes(normalizedCodeQuery)
        || record.name.toLowerCase().includes(normalizedQuery);
    });

    return results.slice(0, safeLimit).map((record) => ({
      code: record.code,
      description: record.name,
    }));
  }

  private loadDataset(): Icd10Record[] {
    const packageJsonPath = require.resolve('icd10/package.json');
    const packageRoot = dirname(packageJsonPath);
    const datasetPath = join(packageRoot, 'data', '2016', 'all_cim10.json');

    if (!existsSync(datasetPath)) {
      throw new Error(`ICD-10 dataset file not found: ${datasetPath}`);
    }

    const raw = readFileSync(datasetPath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      throw new Error('ICD-10 dataset has invalid shape: expected array');
    }

    return parsed.filter((item): item is Icd10Record => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      const candidate = item as Partial<Icd10Record>;
      return typeof candidate.code === 'string' && typeof candidate.name === 'string';
    });
  }
}

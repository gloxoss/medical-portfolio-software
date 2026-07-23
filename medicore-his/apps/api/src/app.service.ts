import { Injectable } from '@nestjs/common';
import type { HealthCheckResponse } from '@medicore/shared-types';

@Injectable()
export class AppService {
  health(): HealthCheckResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}

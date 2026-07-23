import { SetMetadata } from '@nestjs/common';
import type { Permission } from '@medicore/shared-types';

export const PERMISSIONS_KEY = 'permissions';

// Usage: @Permissions('encounter.write', 'patient.read')
export const Permissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

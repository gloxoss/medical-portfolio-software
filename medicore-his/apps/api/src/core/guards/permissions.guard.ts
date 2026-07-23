import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ROLE_PERMISSIONS } from '../../modules/auth/constants/role-permissions';
import type { Permission } from '@medicore/shared-types';
import type { RequestUser } from '../../modules/auth/types/request-user.type';

// Must be applied AFTER JwtAuthGuard (req.user must exist).
// Reads x-facility-id header to scope the permission check.
// Super admins bypass permission checks entirely.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [ctx.getHandler(), ctx.getClass()],
    );

    // No @Permissions decorator → route is authenticated-only, no role check
    if (!required || required.length === 0) return true;

    const request = ctx.switchToHttp().getRequest<{
      user: RequestUser;
      headers: Record<string, string>;
    }>();

    const user = request.user;

    // Super admins have all permissions
    if (user.isSuperAdmin) return true;

    const facilityId = request.headers['x-facility-id'];
    if (!facilityId) {
      throw new ForbiddenException('x-facility-id header is required');
    }

    const roleRecord = await this.prisma.userFacilityRole.findUnique({
      where: {
        userId_facilityId: { userId: user.id, facilityId },
      },
      select: { role: true, isActive: true },
    });

    if (!roleRecord || !roleRecord.isActive) {
      throw new ForbiddenException('No active role in this facility');
    }

    const granted = ROLE_PERMISSIONS[roleRecord.role] ?? [];
    const hasAll = required.every((p) => granted.includes(p));

    if (!hasAll) throw new ForbiddenException('Insufficient permissions');

    return true;
  }
}

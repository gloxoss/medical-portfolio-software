import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import type { JwtPayload } from './types/request-user.type';
import type { UserFacilityRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// How long (ms) the refresh token is valid — matches JWT_REFRESH_EXPIRES_IN
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

interface SafeUser {
  id: string;
  email: string;
  nameFirst: string;
  nameLast: string;
  orgId: string;
  isSuperAdmin: boolean;
  facilities: FacilityWithRole[];
}

interface FacilityWithRole {
  facilityId: string;
  facilityName: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ─── Login ────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        facilityRoles: {
          where: { isActive: true },
          include: { facility: { select: { name: true } } },
        },
      },
    });

    // Generic error — never reveal whether user exists
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.signAccessToken(user);
    const { rawToken, tokenHash, expiresAt } = this.generateRefreshToken();

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        revoked: false,
      },
    });

    let roles = user.facilityRoles;
    if (user.isSuperAdmin) {
      const orgFacilities = await this.prisma.facility.findMany({ where: { orgId: user.orgId, status: 'ACTIVE' } });
      roles = orgFacilities.map(f => ({
        id: `super-${f.id}`,
        userId: user.id,
        facilityId: f.id,
        role: 'ORG_ADMIN',
        isActive: true,
        createdAt: new Date(),
        facility: { name: f.name }
      }));
    }

    this.logger.log(`Login: ${user.email} (org: ${user.orgId})`);

    return {
      accessToken,
      refreshToken: rawToken,
      user: this.toSafeUser(user, roles),
    };
  }

  // ─── Refresh ──────────────────────────────────────────────────────────────
  async refresh(rawToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = this.hashToken(rawToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (stored.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    // Rotate — revoke old token, issue new one
    const { rawToken: newRaw, tokenHash: newHash, expiresAt } = this.generateRefreshToken();

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked: true },
      }),
      this.prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: newHash,
          expiresAt,
          revoked: false,
        },
      }),
    ]);

    return {
      accessToken: this.signAccessToken(stored.user),
      refreshToken: newRaw,
    };
  }

  // ─── Logout ───────────────────────────────────────────────────────────────
  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);

    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revoked: false },
      data: { revoked: true },
    });
  }

  // ─── GetMe ────────────────────────────────────────────────────────────────
  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        facilityRoles: {
          where: { isActive: true },
          include: { facility: { select: { name: true } } },
        },
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    let roles = user.facilityRoles;
    if (user.isSuperAdmin) {
      const orgFacilities = await this.prisma.facility.findMany({ where: { orgId: user.orgId, status: 'ACTIVE' } });
      roles = orgFacilities.map(f => ({
        id: `super-${f.id}`,
        userId: user.id,
        facilityId: f.id,
        role: 'ORG_ADMIN',
        isActive: true,
        createdAt: new Date(),
        facility: { name: f.name }
      }));
    }

    return this.toSafeUser(user, roles);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  private signAccessToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      isSuperAdmin: user.isSuperAdmin,
    };
    return this.jwt.sign(payload);
  }

  private generateRefreshToken(): {
    rawToken: string;
    tokenHash: string;
    expiresAt: Date;
  } {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    return { rawToken, tokenHash, expiresAt };
  }

  private hashToken(rawToken: string): string {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  private toSafeUser(
    user: User,
    roles: Array<UserFacilityRole & { facility: { name: string } }>,
  ): SafeUser {
    return {
      id: user.id,
      email: user.email,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      orgId: user.orgId,
      isSuperAdmin: user.isSuperAdmin,
      facilities: roles.map((r) => ({
        facilityId: r.facilityId,
        facilityName: r.facility.name,
        role: r.role,
      })),
    };
  }
}

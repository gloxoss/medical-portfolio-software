import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { OnboardDto } from './dto/onboard.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { Prisma, FacilityRole } from '@prisma/client';
import type { JwtPayload } from '../auth/types/request-user.type';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class TenancyService {
  private readonly logger = new Logger(TenancyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly events: RedisPublisherService,
  ) {}

  // ─── Onboard ──────────────────────────────────────────────────────────────
  // Creates Org + Facility + Admin User atomically in one PG transaction.
  // If any step fails, nothing is persisted (Prisma rolls back automatically).
  async onboard(dto: OnboardDto): Promise<{
    organization: unknown;
    facility: unknown;
    user: unknown;
    access_token: string;
  }> {
    // Pre-check slug uniqueness (better error message than PG constraint)
    const slugExists = await this.prisma.organization.findUnique({
      where: { slug: dto.org_slug },
      select: { id: true },
    });
    if (slugExists) {
      throw new ConflictException(`Slug "${dto.org_slug}" is already taken`);
    }

    const emailExists = await this.prisma.user.findUnique({
      where: { email: dto.admin_email },
      select: { id: true },
    });
    if (emailExists) {
      throw new ConflictException(`Email "${dto.admin_email}" is already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.admin_password, BCRYPT_ROUNDS);

    // Atomic transaction — all or nothing
    const [org, facility, user] = await this.prisma.$transaction(
      async (tx) => {
        const organization = await tx.organization.create({
          data: {
            name: dto.org_name,
            slug: dto.org_slug,
            mrnPrefix: dto.mrn_prefix.toUpperCase(),
            mrnCounter: 0,
            plan: 'SOLO',
            status: 'TRIAL',
            trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
            settings: {
              timezone: 'Africa/Casablanca',
              currency: 'MAD',
              language: 'fr',
            },
          },
        });

        const newFacility = await tx.facility.create({
          data: {
            orgId: organization.id,
            name: dto.facility_name,
            address: (dto.facility_address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
            status: 'ACTIVE',
          },
        });

        const adminUser = await tx.user.create({
          data: {
            email: dto.admin_email,
            passwordHash,
            orgId: organization.id,
            nameFirst: dto.admin_first_name,
            nameLast: dto.admin_last_name,
            isSuperAdmin: false,
            status: 'ACTIVE',
            doctorSpecialties: [],
          },
        });

        await tx.userFacilityRole.create({
          data: {
            userId: adminUser.id,
            facilityId: newFacility.id,
            role: FacilityRole.ORG_ADMIN,
            isActive: true,
          },
        });

        return [organization, newFacility, adminUser] as const;
      },
    );

    // Issue access token for the new admin (auto-login after onboarding)
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: org.id,
      isSuperAdmin: false,
    };
    const access_token = this.jwt.sign(payload);

    // Publish event — async, non-blocking (failure is logged, not re-thrown)
    this.events
      .publish('tenancy.facility.created', {
        facilityId: facility.id,
        facilityName: facility.name,
        orgId: org.id,
        orgName: org.name,
      })
      .catch((err: Error) =>
        this.logger.error('Failed to publish tenancy.facility.created', err.message),
      );

    this.logger.log(`Onboarded: org=${org.slug}, facility=${facility.id}, admin=${user.email}`);

    return {
      organization: this.toSafeOrg(org),
      facility: this.toSafeFacility(facility),
      user: this.toSafeUser(user),
      access_token,
    };
  }

  // ─── List Facilities ──────────────────────────────────────────────────────
  async getFacilities(orgId: string, requestingOrgId: string): Promise<unknown[]> {
    // Users can only list facilities within their own org
    if (orgId !== requestingOrgId) {
      throw new ForbiddenException('Cannot access facilities of another organization');
    }

    const facilities = await this.prisma.facility.findMany({
      where: { orgId, status: 'ACTIVE' },
      orderBy: { createdAt: 'asc' },
    });

    return facilities.map(this.toSafeFacility);
  }

  // ─── Create Facility ──────────────────────────────────────────────────────
  async createFacility(
    orgId: string,
    requestingOrgId: string,
    dto: CreateFacilityDto,
  ): Promise<unknown> {
    if (orgId !== requestingOrgId) {
      throw new ForbiddenException('Cannot create facility in another organization');
    }

    // Verify org exists
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const facility = await this.prisma.facility.create({
      data: {
        orgId,
        name: dto.name,
        address: (dto.address as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        phone: dto.phone,
        email: dto.email,
        status: 'ACTIVE',
      },
    });

    this.events
      .publish('tenancy.facility.created', {
        facilityId: facility.id,
        facilityName: facility.name,
        orgId,
      })
      .catch((err: Error) =>
        this.logger.error('Failed to publish tenancy.facility.created', err.message),
      );

    return this.toSafeFacility(facility);
  }

  // ─── Doctors by Facility ─────────────────────────────────────────────────
  // Returns all active DOCTOR-role users assigned to a facility.
  // Used by the frontend appointment booking page to populate the doctor picker.
  async getDoctorsByFacility(facilityId: string, orgId: string): Promise<unknown[]> {
    // Verify facility belongs to the requesting org
    const facility = await this.prisma.facility.findFirst({
      where: { id: facilityId, orgId },
      select: { id: true },
    });
    if (!facility) throw new NotFoundException('Facility not found');

    const roles = await this.prisma.userFacilityRole.findMany({
      where: { facilityId, role: 'DOCTOR', isActive: true },
      include: {
        user: {
          select: {
            id: true,
            nameFirst: true,
            nameLast: true,
            doctorSpecialties: true,
            doctorLicenseNo: true,
          },
        },
      },
    });

    return roles.map((r) => ({
      id: r.user.id,
      name: `Dr. ${r.user.nameFirst} ${r.user.nameLast}`,
      specialties: r.user.doctorSpecialties ?? [],
      license_no: r.user.doctorLicenseNo ?? null,
    }));
  }

  // ─── Get Org ──────────────────────────────────────────────────────────────
  async getOrg(orgId: string, requestingOrgId: string): Promise<unknown> {
    if (orgId !== requestingOrgId) {
      throw new ForbiddenException('Cannot access another organization');
    }

    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');

    return this.toSafeOrg(org);
  }

  // ─── Safe mappers (strip internal fields) ─────────────────────────────────
  private toSafeOrg(org: {
    id: string; name: string; slug: string; mrnPrefix: string;
    plan: string; status: string; createdAt: Date;
  }) {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      mrn_prefix: org.mrnPrefix,
      plan: org.plan,
      status: org.status,
      created_at: org.createdAt.toISOString(),
    };
  }

  private toSafeFacility(facility: {
    id: string; orgId: string; name: string; address: unknown;
    phone: string | null; email: string | null; status: string; createdAt: Date;
  }) {
    return {
      id: facility.id,
      org_id: facility.orgId,
      name: facility.name,
      address: facility.address,
      phone: facility.phone,
      email: facility.email,
      status: facility.status,
      created_at: facility.createdAt.toISOString(),
    };
  }

  private toSafeUser(user: {
    id: string; email: string; nameFirst: string; nameLast: string; orgId: string;
  }) {
    return {
      id: user.id,
      email: user.email,
      name_first: user.nameFirst,
      name_last: user.nameLast,
      org_id: user.orgId,
    };
  }
}

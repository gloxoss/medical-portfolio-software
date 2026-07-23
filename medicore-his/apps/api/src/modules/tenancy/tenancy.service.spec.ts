import { Test, TestingModule } from '@nestjs/testing';
import { TenancyService } from './tenancy.service';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockOrg = {
  id: 'org-001', name: 'Test Clinic', slug: 'test-clinic',
  mrnPrefix: 'TC', mrnCounter: 0, plan: 'SOLO', status: 'TRIAL',
  createdAt: new Date(), updatedAt: new Date(),
  trialEndsAt: null, stripeCustomerId: null, stripeSubscriptionId: null,
  logoUrl: null, settings: null,
};

const mockFacility = {
  id: 'fac-001', orgId: 'org-001', name: 'Main Branch',
  address: null, phone: null, email: null, settings: null,
  status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date(),
};

const mockUser = {
  id: 'user-001', email: 'admin@test.ma', passwordHash: 'hash',
  orgId: 'org-001', nameFirst: 'Test', nameLast: 'Admin',
  isSuperAdmin: false, status: 'ACTIVE', phone: null,
  doctorSpecialties: [], doctorLicenseNo: null, doctorConsultFee: null,
  createdAt: new Date(), updatedAt: new Date(),
};

const mockTx = {
  organization: { create: jest.fn().mockResolvedValue(mockOrg) },
  facility: { create: jest.fn().mockResolvedValue(mockFacility) },
  user: { create: jest.fn().mockResolvedValue(mockUser) },
  userFacilityRole: { create: jest.fn().mockResolvedValue({}) },
};

const mockPrisma = {
  organization: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
  },
  facility: {
    findMany: jest.fn(),
    create: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockEvents = {
  publish: jest.fn().mockResolvedValue(undefined),
};

describe('TenancyService', () => {
  let service: TenancyService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenancyService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('jwt.token') } },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: RedisPublisherService, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<TenancyService>(TenancyService);
    jest.clearAllMocks();
  });

  // ─── onboard ───────────────────────────────────────────────────────────────
  describe('onboard', () => {
    const validDto = {
      org_name: 'Test Clinic',
      org_slug: 'test-clinic',
      mrn_prefix: 'TC',
      facility_name: 'Main Branch',
      admin_email: 'admin@test.ma',
      admin_password: 'Admin1234!',
      admin_first_name: 'Test',
      admin_last_name: 'Admin',
    };

    it('should create org, facility, and user atomically', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null); // slug free
      mockPrisma.user.findUnique.mockResolvedValue(null);         // email free
      mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.onboard(validDto) as Record<string, unknown>;

      expect(result.access_token).toBe('jwt.token');
      expect(result.organization).toBeDefined();
      expect(result.facility).toBeDefined();
      expect(result.user).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw 409 when slug is already taken', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.onboard(validDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should throw 409 when email is already registered', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.onboard(validDto)).rejects.toThrow(ConflictException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('should publish tenancy.facility.created event after onboarding', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
      );

      await service.onboard(validDto);

      // Give async publish a tick to fire
      await new Promise((r) => setTimeout(r, 10));
      expect(mockEvents.publish).toHaveBeenCalledWith(
        'tenancy.facility.created',
        expect.objectContaining({ facilityId: mockFacility.id }),
      );
    });

    it('should not expose passwordHash in returned user', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation((fn: (tx: typeof mockTx) => Promise<unknown>) =>
        fn(mockTx),
      );

      const result = await service.onboard(validDto) as { user: Record<string, unknown> };
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('password_hash');
    });
  });

  // ─── getFacilities ─────────────────────────────────────────────────────────
  describe('getFacilities', () => {
    it('should return facilities for the requesting org', async () => {
      mockPrisma.facility.findMany.mockResolvedValue([mockFacility]);

      const result = await service.getFacilities('org-001', 'org-001');
      expect(result).toHaveLength(1);
    });

    it('should throw ForbiddenException when accessing another org', async () => {
      await expect(
        service.getFacilities('org-002', 'org-001'),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.facility.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── createFacility ────────────────────────────────────────────────────────
  describe('createFacility', () => {
    it('should create a facility within the org', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(mockOrg);
      mockPrisma.facility.create.mockResolvedValue(mockFacility);

      const result = await service.createFacility('org-001', 'org-001', { name: 'Branch 2' });
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenException when creating in another org', async () => {
      await expect(
        service.createFacility('org-002', 'org-001', { name: 'Branch' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when org does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(
        service.createFacility('org-001', 'org-001', { name: 'Branch' }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

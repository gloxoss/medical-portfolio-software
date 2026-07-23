import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

// ─── Mock Prisma ─────────────────────────────────────────────────────────────
const mockUser = {
  id: 'user-001',
  email: 'admin@medicore.ma',
  passwordHash: '', // set in beforeAll
  orgId: 'org-001',
  nameFirst: 'Oussama',
  nameLast: 'Zaki',
  isSuperAdmin: true,
  status: 'ACTIVE',
  phone: null,
  doctorSpecialties: [],
  doctorLicenseNo: null,
  doctorConsultFee: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  facilityRoles: [
    {
      id: 'role-001',
      userId: 'user-001',
      facilityId: 'facility-001',
      role: 'ORG_ADMIN',
      isActive: true,
      createdAt: new Date(),
      facility: { name: 'Ain Diab Clinic' },
    },
  ],
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  refreshToken: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  facility: {
    // Super-admin path: returns facility list when isSuperAdmin === true
    findMany: jest.fn().mockResolvedValue([
      { id: 'facility-001', name: 'Ain Diab Clinic', orgId: 'org-001', status: 'ACTIVE' },
    ]),
  },
  $transaction: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    // Hash once for all tests
    mockUser.passwordHash = await bcrypt.hash('Admin1234!', 10);
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('test.jwt.token') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn(), getOrThrow: jest.fn().mockReturnValue('test-secret') },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─── login ─────────────────────────────────────────────────────────────────
  describe('login', () => {
    it('should return access_token and user on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.refreshToken.create.mockResolvedValue({});

      const result = await service.login({
        email: 'admin@medicore.ma',
        password: 'Admin1234!',
      });

      expect(result.accessToken).toBe('test.jwt.token');
      expect(result.user.email).toBe('admin@medicore.ma');
      expect(result.refreshToken).toBeDefined();
      expect(result.refreshToken.length).toBeGreaterThan(32);
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nobody@medicore.ma', password: 'Admin1234!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'admin@medicore.ma', password: 'WrongPassword!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when user is INACTIVE', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, status: 'INACTIVE' });

      await expect(
        service.login({ email: 'admin@medicore.ma', password: 'Admin1234!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should NOT reveal whether user exists in error message', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      try {
        await service.login({ email: 'nobody@test.com', password: 'pass' });
      } catch (e) {
        const error = e as UnauthorizedException;
        expect(error.message).toBe('Invalid credentials');
        // Must NOT say "user not found" or "email not found"
        expect(error.message.toLowerCase()).not.toContain('not found');
        expect(error.message.toLowerCase()).not.toContain('user');
      }
    });
  });

  // ─── refresh ───────────────────────────────────────────────────────────────
  describe('refresh', () => {
    it('should rotate refresh token and return new access_token', async () => {
      const futureDate = new Date(Date.now() + 1_000_000);
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-001',
        userId: 'user-001',
        tokenHash: 'any',
        expiresAt: futureDate,
        revoked: false,
        user: { ...mockUser, facilityRoles: undefined },
      });
      mockPrisma.$transaction.mockResolvedValue([]);

      const result = await service.refresh('valid-raw-token');

      expect(result.accessToken).toBe('test.jwt.token');
      expect(result.refreshToken).toBeDefined();
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw when refresh token is revoked', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-001',
        revoked: true,
        expiresAt: new Date(Date.now() + 1_000_000),
        user: mockUser,
      });

      await expect(service.refresh('revoked-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when refresh token is expired', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue({
        id: 'rt-001',
        revoked: false,
        expiresAt: new Date(Date.now() - 1000), // past
        user: mockUser,
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw when token not found in DB', async () => {
      mockPrisma.refreshToken.findUnique.mockResolvedValue(null);

      await expect(service.refresh('unknown-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // ─── logout ────────────────────────────────────────────────────────────────
  describe('logout', () => {
    it('should revoke the refresh token', async () => {
      mockPrisma.refreshToken.updateMany.mockResolvedValue({ count: 1 });

      await service.logout('some-raw-token');

      expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({ data: { revoked: true } }),
      );
    });
  });

  // ─── getMe ─────────────────────────────────────────────────────────────────
  describe('getMe', () => {
    it('should return safe user with facility roles', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getMe('user-001');

      expect(result.email).toBe('admin@medicore.ma');
      expect(result.facilities).toHaveLength(1);
      expect(result.facilities[0].role).toBe('ORG_ADMIN');
      // password hash must never be returned
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should throw when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe('nonexistent')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});

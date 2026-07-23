import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import * as cookieParser from 'cookie-parser';
import { PortalAuthController } from './portal-auth.controller';
import { PortalAuthService } from './portal-auth.service';

// ─── Stub service ─────────────────────────────────────────────────────────────

const mockPortalAuthService = {
  sendOtp: jest.fn(),
  verifyOtp: jest.fn(),
};

describe('PortalAuthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PortalAuthController],
      providers: [{ provide: PortalAuthService, useValue: mockPortalAuthService }],
    }).compile();

    app = module.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ── POST /portal/auth/otp/request ──────────────────────────────────────────

  describe('POST /portal/auth/otp/request', () => {
    it('should return 200 regardless of whether phone is registered', async () => {
      mockPortalAuthService.sendOtp.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/request')
        .send({ phone: '+212612345678' });

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('OTP');
      expect(mockPortalAuthService.sendOtp).toHaveBeenCalledWith('+212612345678');
    });

    it('should return 200 even when phone is not registered (no enumeration)', async () => {
      mockPortalAuthService.sendOtp.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/request')
        .send({ phone: '+212699999999' });

      expect(res.status).toBe(200);
    });

    it('should return 400 when phone is not in E.164 format', async () => {
      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/request')
        .send({ phone: '0612345678' }); // missing country code

      expect(res.status).toBe(400);
      expect(mockPortalAuthService.sendOtp).not.toHaveBeenCalled();
    });

    it('should return 400 when phone is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/request')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  // ── POST /portal/auth/otp/verify ───────────────────────────────────────────

  describe('POST /portal/auth/otp/verify', () => {
    it('should return 200 and set portal_session cookie on valid OTP', async () => {
      mockPortalAuthService.verifyOtp.mockResolvedValue('portal-jwt-token');

      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/verify')
        .send({ phone: '+212612345678', code: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Authenticated successfully.');
      // httpOnly cookie must be set
      const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
      expect(cookies?.some((c: string) => c.startsWith('portal_session='))).toBe(true);
    });

    it('should return 401 when OTP is invalid', async () => {
      mockPortalAuthService.verifyOtp.mockRejectedValue(
        new UnauthorizedException('Invalid or expired OTP'),
      );

      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/verify')
        .send({ phone: '+212612345678', code: '000000' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when code is not 6 digits', async () => {
      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/verify')
        .send({ phone: '+212612345678', code: '12345' }); // 5 digits

      expect(res.status).toBe(400);
      expect(mockPortalAuthService.verifyOtp).not.toHaveBeenCalled();
    });

    it('should return 400 when phone is invalid E.164', async () => {
      const res = await request(app.getHttpServer())
        .post('/portal/auth/otp/verify')
        .send({ phone: 'invalid', code: '123456' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /portal/auth/logout ────────────────────────────────────────────────

  describe('POST /portal/auth/logout', () => {
    it('should return 200 and clear portal_session cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/portal/auth/logout')
        .set('Cookie', 'portal_session=some-jwt');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logged out.');

      // Cookie should be cleared (set to empty or expires in past)
      const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
      const portalCookie = cookies?.find((c: string) => c.startsWith('portal_session='));
      expect(portalCookie).toBeDefined();
      // Cleared cookie has empty value or Expires in past
      expect(portalCookie).toMatch(/portal_session=;|portal_session=\s*;|Expires=Thu, 01 Jan 1970/i);
    });
  });
});

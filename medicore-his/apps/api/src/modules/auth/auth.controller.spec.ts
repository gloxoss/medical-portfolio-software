import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, UnauthorizedException } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import * as cookieParser from 'cookie-parser';

// ─── Stub service ─────────────────────────────────────────────────────────────

const mockAuthService = {
  login: jest.fn(),
  refresh: jest.fn(),
  logout: jest.fn(),
  getMe: jest.fn(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeApp(module: TestingModule): INestApplication {
  const app = module.createNestApplication();
  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AuthController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: mockAuthService }],
    })
      // Override JwtAuthGuard so /auth/me works without a real JWT in tests
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = makeApp(module);
    // Attach a mock user to every request so @CurrentUser() returns something
    app.use((req: { user: unknown }, _res: unknown, next: () => void) => {
      req.user = { id: 'user-001', orgId: 'org-001', email: 'admin@medicore.ma' };
      next();
    });

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── POST /auth/login ────────────────────────────────────────────────────────

  describe('POST /auth/login', () => {
    it('should return 200 + access_token on valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
        user: { id: 'user-001', email: 'admin@medicore.ma' },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@medicore.ma', password: 'Admin1234!' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token', 'jwt-access-token');
      expect(res.headers['set-cookie']).toBeDefined();
      expect(mockAuthService.login).toHaveBeenCalledWith({
        email: 'admin@medicore.ma',
        password: 'Admin1234!',
      });
    });

    it('should return 401 when service throws UnauthorizedException', async () => {
      mockAuthService.login.mockRejectedValue(
        new UnauthorizedException('Invalid credentials'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'wrong@medicore.ma', password: 'WrongPass!' });

      expect(res.status).toBe(401);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ password: 'Admin1234!' });

      expect(res.status).toBe(400);
      expect(mockAuthService.login).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@medicore.ma' });

      expect(res.status).toBe(400);
    });
  });

  // ── POST /auth/refresh ──────────────────────────────────────────────────────

  describe('POST /auth/refresh', () => {
    it('should return 200 + new access_token when refresh cookie is valid', async () => {
      mockAuthService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=valid-refresh-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('access_token', 'new-access-token');
    });

    it('should return 401 when refresh cookie is absent', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh');

      expect(res.status).toBe(401);
      expect(mockAuthService.refresh).not.toHaveBeenCalled();
    });

    it('should return 401 when service throws UnauthorizedException', async () => {
      mockAuthService.refresh.mockRejectedValue(
        new UnauthorizedException('Refresh token expired'),
      );

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', 'refresh_token=expired-token');

      expect(res.status).toBe(401);
    });
  });

  // ── POST /auth/logout ───────────────────────────────────────────────────────

  describe('POST /auth/logout', () => {
    it('should return 200 and call logout service when cookie present', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const res = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', 'refresh_token=valid-refresh-token');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message', 'Logged out');
      expect(mockAuthService.logout).toHaveBeenCalledWith('valid-refresh-token');
    });

    it('should return 200 even when no refresh cookie (graceful)', async () => {
      const res = await request(app.getHttpServer()).post('/auth/logout');

      expect(res.status).toBe(200);
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });
  });

  // ── GET /auth/me ────────────────────────────────────────────────────────────

  describe('GET /auth/me', () => {
    it('should return 200 + user when JWT guard passes', async () => {
      const mockUser = { id: 'user-001', email: 'admin@medicore.ma', orgId: 'org-001' };
      mockAuthService.getMe.mockResolvedValue(mockUser);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(res.body.user).toMatchObject({ id: 'user-001' });
    });
  });
});

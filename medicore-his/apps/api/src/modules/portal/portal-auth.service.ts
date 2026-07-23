import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  GoneException,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import Redis from 'ioredis';
import { Patient, PatientDocument_ } from '../patients/schemas/patient.schema';
import type { IOtpProvider } from '../../infrastructure/providers/otp/otp.interface';
import { OTP_PROVIDER_TOKEN } from '../../infrastructure/providers/otp/otp.interface';

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_REQUEST_WINDOW_SECONDS = 600; // 10 minutes
const OTP_MAX_REQUESTS_PER_WINDOW = 3;
const OTP_CODE_PATTERN = /^\d{6}$/;

export interface PatientJwtPayload {
  sub: string;       // patientId (MongoDB _id as string)
  orgId: string;
  phone: string;
  role: 'PATIENT';
  aud: 'patient-portal';
}

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);
  private readonly redis: Redis;

  constructor(
    @InjectModel(Patient.name) private readonly patientModel: Model<PatientDocument_>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @Inject(OTP_PROVIDER_TOKEN) private readonly otpProvider: IOtpProvider,
  ) {
    this.redis = new Redis(
      this.config.get<string>('REDIS_URL', 'redis://:medicore@localhost:6379'),
    );
  }

  private normalizePhone(phone: string): string {
    return phone.trim().replace(/\s+/g, '');
  }

  private otpKey(phone: string): string {
    return `otp:${phone}`;
  }

  private otpRateKey(phone: string): string {
    return `otp:rate:${phone}`;
  }

  private async enforceOtpRequestLimit(phone: string): Promise<void> {
    const key = this.otpRateKey(phone);
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, OTP_REQUEST_WINDOW_SECONDS);
    }

    if (current > OTP_MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException(
        'Too many OTP requests. Please wait 10 minutes before trying again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private generateRandomOtp(): string {
    return Math.floor(100_000 + Math.random() * 900_000).toString();
  }

  private resolveOtpCode(): string {
    const defaultCode = this.generateRandomOtp();
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const configuredDevCode = this.config.get<string>('DEV_OTP_CODE')?.trim();

    if (nodeEnv === 'production' || !configuredDevCode) {
      return defaultCode;
    }

    if (!OTP_CODE_PATTERN.test(configuredDevCode)) {
      this.logger.warn(
        'DEV_OTP_CODE must be a 6-digit value. Falling back to generated OTP.',
      );
      return defaultCode;
    }

    this.logger.warn('Using fixed DEV_OTP_CODE for portal OTP requests (non-production).');
    return configuredDevCode;
  }

  // ─── Send OTP ─────────────────────────────────────────────────────────────
  async sendOtp(phone: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    await this.enforceOtpRequestLimit(normalizedPhone);

    // Verify patient exists in any org (portal is multi-org)
    const patient = await this.patientModel.findOne({ phone: normalizedPhone }).lean();
    if (!patient) {
      // Security: Don't reveal whether the phone exists — return silently
      this.logger.warn(`OTP requested for unknown phone: ${normalizedPhone}`);
      return;
    }

    // Generate OTP (or use configured dev override)
    const code = this.resolveOtpCode();

    // Store in Redis with TTL
    await this.redis.set(this.otpKey(normalizedPhone), code, 'EX', OTP_TTL_SECONDS);

    // Dispatch via configured provider
    await this.otpProvider.send(normalizedPhone, code);
  }

  // ─── Verify OTP & Issue Cookie JWT ───────────────────────────────────────
  async verifyOtp(phone: string, code: string): Promise<string> {
    const normalizedPhone = this.normalizePhone(phone);
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    const configuredDevCode = this.config.get<string>('DEV_OTP_CODE')?.trim() || '123456';
    const isDevBypass = nodeEnv !== 'production' && code === configuredDevCode;

    const stored = isDevBypass ? configuredDevCode : await this.redis.get(this.otpKey(normalizedPhone));

    if (!stored) {
      throw new GoneException('Verification code expired. Please request a new code.');
    }

    if (stored !== code) {
      throw new UnauthorizedException('Invalid verification code.');
    }

    // Delete immediately — one-time use
    await this.redis.del(this.otpKey(normalizedPhone));

    // Fetch patient
    const patient = await this.patientModel.findOne({ phone: normalizedPhone }).lean();
    if (!patient) {
      throw new NotFoundException('Patient not found.');
    }

    const payload: PatientJwtPayload = {
      sub: (patient._id as Types.ObjectId).toString(),
      orgId: patient.org_id,
      phone: patient.phone,
      role: 'PATIENT',
      aud: 'patient-portal',
    };

    const token = this.jwt.sign(payload, {
      secret: this.config.getOrThrow<string>('PORTAL_JWT_SECRET'),
      expiresIn: this.config.get<string>('PORTAL_JWT_EXPIRES_IN', '24h'),
    });

    this.logger.log(`Portal login: ${normalizedPhone} (org: ${patient.org_id})`);
    return token;
  }

  // ─── Get Patient Profile ──────────────────────────────────────────────────
  async getPatient(patientId: string, orgId: string): Promise<PatientDocument_> {
    const patient = await this.patientModel.findOne({
      _id: patientId,
      org_id: orgId,
    });
    if (!patient) throw new NotFoundException('Patient not found.');
    return patient;
  }
}

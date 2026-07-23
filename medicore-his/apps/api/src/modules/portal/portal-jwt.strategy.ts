import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { PatientJwtPayload } from './portal-auth.service';

export interface PatientRequestUser {
  patientId: string;
  orgId: string;
  phone: string;
}

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor(config: ConfigService) {
    super({
      // Extract JWT from httpOnly cookie named 'portal_session'
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.['portal_session'] ?? null,
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('PORTAL_JWT_SECRET'),
      audience: 'patient-portal',
    });
  }

  validate(payload: PatientJwtPayload): PatientRequestUser {
    if (payload.role !== 'PATIENT' || payload.aud !== 'patient-portal') {
      throw new UnauthorizedException('Portal access requires a patient token.');
    }

    return {
      patientId: payload.sub,
      orgId: payload.orgId,
      phone: payload.phone,
    };
  }
}

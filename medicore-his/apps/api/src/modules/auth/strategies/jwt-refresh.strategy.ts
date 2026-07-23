import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import type { JwtPayload } from '../types/request-user.type';

// Reads refresh token from the HttpOnly cookie named 'refresh_token'
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const token = req?.cookies?.refresh_token as string | undefined;
          return token ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  // Returns payload + raw cookie token (for hash lookup in DB)
  validate(
    req: Request,
    payload: JwtPayload,
  ): { userId: string; rawToken: string } {
    const rawToken = req.cookies?.refresh_token as string;
    return { userId: payload.sub, rawToken };
  }
}

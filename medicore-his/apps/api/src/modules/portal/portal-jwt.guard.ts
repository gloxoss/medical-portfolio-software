import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard that extracts and validates the JWT from the portal_session httpOnly cookie.
 * Uses the 'portal-jwt' Passport strategy (PortalJwtStrategy).
 * Attach to any route that requires a logged-in patient.
 */
@Injectable()
export class PortalJwtGuard extends AuthGuard('portal-jwt') {}

import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Validates the HttpOnly refresh_token cookie.
// Apply only to POST /auth/refresh and POST /auth/logout.
@Injectable()
export class JwtRefreshGuard extends AuthGuard('jwt-refresh') {}

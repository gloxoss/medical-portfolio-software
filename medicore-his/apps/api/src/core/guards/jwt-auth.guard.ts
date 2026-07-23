import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Validates Bearer token in Authorization header.
// Apply to any route that requires authentication.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiBody, ApiCookieAuth } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { RequestUser } from './types/request-user.type';

// Refresh cookie config — set once, used in multiple methods
const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /api/v1/auth/login
  // Rate limit: 5 req / 15 min per IP (stricter than global 100/60s)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 15 * 60 * 1000 } })
  @ApiOperation({ summary: 'Staff login — returns access token + sets refresh cookie' })
  @ApiBody({ schema: { example: { email: 'admin@clinic.ma', password: 'Admin1234!' } } })
  @ApiResponse({ status: 200, description: 'Login successful — access_token returned, refresh_token set in httpOnly cookie' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many login attempts (5 per 15 min)' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string; user: unknown }> {
    const { accessToken, refreshToken, user } = await this.authService.login(dto);

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return { access_token: accessToken, user };
  }

  // POST /api/v1/auth/refresh  (cookie-based, no body needed)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth('refresh-cookie')
  @ApiOperation({ summary: 'Rotate JWT pair using httpOnly refresh cookie (refresh_token)' })
  @ApiResponse({ status: 200, description: 'New access token returned, refresh cookie rotated' })
  @ApiResponse({ status: 401, description: 'Missing or expired refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string }> {
    const rawToken = req.cookies?.refresh_token as string | undefined;
    if (!rawToken) {
      throw new UnauthorizedException('Missing refresh token');
    }

    const { accessToken, refreshToken } = await this.authService.refresh(
      rawToken,
    );

    res.cookie('refresh_token', refreshToken, REFRESH_COOKIE_OPTIONS);

    return { access_token: accessToken };
  }

  // POST /api/v1/auth/logout
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh token and clear cookie' })
  @ApiResponse({ status: 200, description: 'Logged out — refresh cookie cleared' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const rawToken = req.cookies?.refresh_token as string | undefined;
    if (rawToken) {
      await this.authService.logout(rawToken);
    }

    res.clearCookie('refresh_token', { path: '/' });

    return { message: 'Logged out' };
  }

  // GET /api/v1/auth/me
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('staff-jwt')
  @ApiOperation({ summary: 'Get current authenticated staff user with role assignments' })
  @ApiResponse({ status: 200, description: 'Authenticated user profile' })
  @ApiResponse({ status: 401, description: 'Missing or expired access token' })
  async getMe(
    @CurrentUser() user: RequestUser,
  ): Promise<{ user: unknown }> {
    const fullUser = await this.authService.getMe(user.id);
    return { user: fullUser };
  }
}

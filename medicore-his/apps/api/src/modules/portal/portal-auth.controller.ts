import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PortalAuthService } from './portal-auth.service';
import { IsString, IsNotEmpty, Matches } from 'class-validator';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format (e.g. +212600000001)' })
  phone!: string;
}

class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+[1-9]\d{6,14}$/, { message: 'Phone must be in E.164 format' })
  phone!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Code must be exactly 6 digits' })
  code!: string;
}

// ─── Cookie config ────────────────────────────────────────────────────────────

const COOKIE_NAME = 'portal_session';
// Cookie lifetime must match PORTAL_JWT_EXPIRES_IN (default 24h).
// Previously 8h, which caused users to be forced to re-auth while their
// portal JWT was still valid — cookie was gone before the token expired.
const PORTAL_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: PORTAL_SESSION_MAX_AGE_MS,
};

// ─── Controller ───────────────────────────────────────────────────────────────

@ApiTags('Portal Auth')
@Controller('portal/auth')
export class PortalAuthController {
  constructor(private readonly portalAuth: PortalAuthService) {}

  /**
   * POST /api/v1/portal/auth/otp/request
   * (Backward-compatible alias: /otp/send)
   * Rate-limited in service layer: 3 requests per 10 minutes per phone.
   * Returns 200 regardless of whether phone exists (security: don't enumerate).
   */
  @Post('otp/request')
  @Post('otp/send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to patient phone (rate-limited: 3 per 10 min)' })
  @ApiResponse({ status: 200, description: 'Returns 200 regardless — no phone enumeration' })
  async sendOtp(@Body() dto: SendOtpDto): Promise<{ message: string }> {
    await this.portalAuth.sendOtp(dto.phone);
    return { message: 'If this number is registered, an OTP has been sent.' };
  }

  /**
   * POST /api/v1/portal/auth/otp/verify
   * On success, sets portal_session httpOnly cookie and returns patient info.
   */
  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP — sets portal_session httpOnly cookie on success' })
  @ApiResponse({ status: 200, description: 'Authenticated — portal_session cookie set' })
  @ApiResponse({ status: 401, description: 'Invalid or expired OTP' })
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ message: string }> {
    const token = await this.portalAuth.verifyOtp(dto.phone, dto.code);

    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return { message: 'Authenticated successfully.' };
  }

  /**
   * POST /api/v1/portal/auth/logout
   * Clears the portal_session cookie.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear portal session cookie' })
  @ApiResponse({ status: 200, description: 'Cookie cleared' })
  logout(@Res({ passthrough: true }) res: Response): { message: string } {
    res.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out.' };
  }
}

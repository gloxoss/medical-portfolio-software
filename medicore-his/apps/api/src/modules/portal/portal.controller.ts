import { Body, Controller, Get, HttpCode, Param, Post, Put, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PortalJwtGuard } from './portal-jwt.guard';
import { PortalService } from './portal.service';
import type { PatientRequestUser } from './portal-jwt.strategy';
import type { Request, Response } from 'express';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsUrl,
  MaxLength,
} from 'class-validator';

/**
 * Retrieves the currently authenticated portal user from the request.
 * Uses the 'portal-jwt' strategy which reads from the portal_session httpOnly cookie.
 */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const PortalUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): PatientRequestUser => {
    const request = ctx.switchToHttp().getRequest<{ user: PatientRequestUser }>();
    return request.user;
  },
);

function getClientIp(request: Request): string | undefined {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
    return forwardedFor.split(',')[0]?.trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0]?.split(',')[0]?.trim();
  }

  return request.ip ?? request.socket.remoteAddress ?? undefined;
}

function getUserAgent(request: Request): string | undefined {
  const userAgent = request.headers['user-agent'];

  if (typeof userAgent === 'string' && userAgent.length > 0) {
    return userAgent;
  }

  if (Array.isArray(userAgent) && userAgent.length > 0) {
    return userAgent[0];
  }

  return undefined;
}

class StartPortalStripeCheckoutDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
  successUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  cancelUrl?: string;
}

class ConfirmPortalStripeCheckoutDto {
  @IsString()
  @IsNotEmpty()
  sessionId!: string;
}

class CancelPortalAppointmentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class BookPortalAppointmentDto {
  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @IsString()
  @IsNotEmpty()
  facilityId!: string;

  @IsDateString()
  startTime!: string;

  @IsOptional()
  @IsIn(['consultation', 'followup', 'emergency', 'telemedicine'])
  type?: 'consultation' | 'followup' | 'emergency' | 'telemedicine';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

class ReschedulePortalAppointmentDto {
  @IsDateString()
  newStartTime!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

class GetPortalAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  facilityId!: string;

  @IsString()
  @IsNotEmpty()
  doctorId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}

class UpdatePortalSettingsDto {
  @IsOptional()
  @IsBoolean()
  sms_notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  email_notifications?: boolean;

  @IsOptional()
  @IsBoolean()
  ai_consent?: boolean;
}

class RequestPortalAccountDeletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@ApiTags('Portal')
@ApiCookieAuth('portal-cookie')
@Controller('portal')
@UseGuards(PortalJwtGuard)
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  private bookAppointmentForPatient(
    patient: PatientRequestUser,
    dto: BookPortalAppointmentDto,
  ) {
    return this.portalService.bookAppointment(patient.patientId, patient.orgId, {
      doctorId: dto.doctorId,
      facilityId: dto.facilityId,
      startTime: dto.startTime,
      type: dto.type,
      notes: dto.notes,
    });
  }

  /**
   * GET /api/v1/portal/me
   * Returns the authenticated patient's profile.
   */
  @Get('me')
  @ApiOperation({ summary: "Get authenticated patient's profile" })
  async getMe(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getMe(patient.patientId, patient.orgId);
  }

  /**
   * GET /api/v1/portal/appointments
   * Returns patient's appointments (upcoming first, then past) — limit 50.
   */
  @Get('appointments')
  @ApiOperation({ summary: "List patient's appointments (upcoming first, limit 50)" })
  async getAppointments(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getAppointments(patient.patientId, patient.orgId);
  }

  /**
   * GET /api/v1/portal/appointments/facilities
   * Returns active facilities for the authenticated patient's organization.
   */
  @Get('appointments/facilities')
  @ApiOperation({ summary: 'List active facilities available for portal appointment booking' })
  async getBookableFacilities(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getBookableFacilities(patient.patientId, patient.orgId);
  }

  /**
   * GET /api/v1/portal/appointments/facilities/:facilityId/doctors
   * Returns active doctors assigned to a selected facility.
   */
  @Get('appointments/facilities/:facilityId/doctors')
  @ApiOperation({ summary: 'List active doctors for a selected facility' })
  async getBookableDoctors(
    @PortalUser() patient: PatientRequestUser,
    @Param('facilityId') facilityId: string,
  ) {
    return this.portalService.getBookableDoctors(patient.patientId, patient.orgId, facilityId);
  }

  /**
   * GET /api/v1/portal/appointments/availability
   * Returns available slots for facility + doctor + date.
   */
  @Get('appointments/availability')
  @ApiOperation({ summary: 'List available booking slots for a selected doctor and date' })
  async getBookableAvailability(
    @PortalUser() patient: PatientRequestUser,
    @Query() query: GetPortalAvailabilityDto,
  ) {
    return this.portalService.getDoctorAvailabilityForPortal(
      patient.patientId,
      patient.orgId,
      query.facilityId,
      query.doctorId,
      query.date,
    );
  }

  /**
   * POST /api/v1/portal/appointments
   * Canonical booking endpoint.
   */
  @Post('appointments')
  @ApiOperation({ summary: 'Book an appointment from the patient portal' })
  async bookAppointment(
    @PortalUser() patient: PatientRequestUser,
    @Body() dto: BookPortalAppointmentDto,
  ) {
    return this.bookAppointmentForPatient(patient, dto);
  }

  /**
   * POST /api/v1/portal/appointments/book
   * Legacy alias kept for backward compatibility.
   */
  @Post('appointments/book')
  @ApiOperation({ summary: 'Book an appointment from the patient portal (legacy alias)' })
  async bookAppointmentLegacy(
    @PortalUser() patient: PatientRequestUser,
    @Body() dto: BookPortalAppointmentDto,
  ) {
    return this.bookAppointmentForPatient(patient, dto);
  }

  /**
   * POST /api/v1/portal/appointments/:id/cancel
   * Cancels a future appointment owned by the authenticated patient.
   */
  @Post('appointments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a future appointment owned by the patient' })
  async cancelAppointment(
    @PortalUser() patient: PatientRequestUser,
    @Param('id') appointmentId: string,
    @Body() dto: CancelPortalAppointmentDto,
  ) {
    return this.portalService.cancelAppointment(
      patient.patientId,
      patient.orgId,
      appointmentId,
      dto.reason,
    );
  }

  /**
   * PUT /api/v1/portal/appointments/:id/reschedule
   * Reschedules a future appointment owned by the authenticated patient.
   */
  @Put('appointments/:id/reschedule')
  @ApiOperation({ summary: 'Reschedule a future appointment owned by the patient' })
  async rescheduleAppointment(
    @PortalUser() patient: PatientRequestUser,
    @Param('id') appointmentId: string,
    @Body() dto: ReschedulePortalAppointmentDto,
  ) {
    return this.portalService.rescheduleAppointment(
      patient.patientId,
      patient.orgId,
      appointmentId,
      dto.newStartTime,
      dto.reason,
    );
  }

  /**
   * GET /api/v1/portal/invoices
   * Returns patient's invoice history with line items — limit 50.
   */
  @Get('invoices')
  @ApiOperation({ summary: "List patient's invoice history with line items (limit 50)" })
  async getInvoices(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getInvoices(patient.patientId, patient.orgId);
  }

  /**
   * GET /api/v1/portal/invoices/:id/receipt
   * Downloads invoice receipt PDF for an invoice owned by the authenticated patient.
   */
  @Get('invoices/:id/receipt')
  @ApiOperation({ summary: 'Download invoice receipt PDF (patient-owned only)' })
  @ApiResponse({ status: 200, description: 'application/pdf stream' })
  async downloadInvoiceReceipt(
    @PortalUser() patient: PatientRequestUser,
    @Param('id') invoiceId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const receipt = await this.portalService.getInvoiceReceiptPdf(
      patient.patientId,
      patient.orgId,
      invoiceId,
    );

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `attachment; filename="${receipt.fileName}"`);

    return receipt.pdf;
  }

  /**
   * POST /api/v1/portal/invoices/:id/pay/stripe/checkout
   * Creates a Stripe checkout session for an invoice owned by the authenticated patient.
   */
  @Post('invoices/:id/pay/stripe/checkout')
  @ApiOperation({ summary: 'Create Stripe checkout session for portal invoice payment' })
  async startStripeCheckout(
    @PortalUser() patient: PatientRequestUser,
    @Param('id') invoiceId: string,
    @Body() dto: StartPortalStripeCheckoutDto,
  ) {
    return this.portalService.startStripeCheckout(patient.patientId, patient.orgId, invoiceId, {
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });
  }

  /**
   * POST /api/v1/portal/invoices/:id/pay/stripe/confirm
   * Confirms Stripe session completion and finalizes invoice payment state.
   */
  @Post('invoices/:id/pay/stripe/confirm')
  @ApiOperation({ summary: 'Confirm Stripe checkout and update invoice status to PAID' })
  async confirmStripeCheckout(
    @PortalUser() patient: PatientRequestUser,
    @Param('id') invoiceId: string,
    @Body() dto: ConfirmPortalStripeCheckoutDto,
  ) {
    return this.portalService.confirmStripeCheckout(
      patient.patientId,
      patient.orgId,
      invoiceId,
      dto.sessionId,
    );
  }

  /**
   * GET /api/v1/portal/encounters
   * Returns patient's encounter history (read-only, no clinical edit) — limit 20.
   */
  @Get('encounters')
  @ApiOperation({ summary: "List patient's encounter history (read-only, limit 20)" })
  async getEncounters(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getEncounters(patient.patientId, patient.orgId);
  }

  /**
   * GET /api/v1/portal/lab/results
   * Returns completed lab results for the authenticated patient.
   */
  @Get('lab/results')
  @ApiOperation({ summary: "List completed lab results for the authenticated patient" })
  async getLabResults(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getLabResults(patient.patientId, patient.orgId);
  }

  /**
   * GET /api/v1/portal/consent/status
   * Returns whether the patient has accepted required portal terms consent.
   */
  @Get('consent/status')
  @ApiOperation({ summary: 'Check if patient has accepted portal terms consent' })
  async getConsentStatus(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getPortalConsentStatus(patient.patientId, patient.orgId);
  }

  /**
   * POST /api/v1/portal/consent/accept
   * Stores affirmative portal terms acceptance with audit metadata.
   */
  @Post('consent/accept')
  @ApiOperation({ summary: 'Record portal terms acceptance with IP + user-agent audit metadata' })
  async acceptConsent(@PortalUser() patient: PatientRequestUser, @Req() request: Request) {
    return this.portalService.acceptPortalConsent(patient.patientId, patient.orgId, {
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  }

  /**
   * GET /api/v1/portal/settings
   * Returns patient-level notification and AI consent settings.
   */
  @Get('settings')
  @ApiOperation({ summary: 'Get patient notification preferences and AI consent settings' })
  async getSettings(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.getPortalSettings(patient.patientId, patient.orgId);
  }

  /**
   * PUT /api/v1/portal/settings
   * Updates patient-level notification and AI consent settings.
   */
  @Put('settings')
  @ApiOperation({ summary: 'Update notification preferences and AI consent (with audit metadata)' })
  async updateSettings(
    @PortalUser() patient: PatientRequestUser,
    @Body() dto: UpdatePortalSettingsDto,
    @Req() request: Request,
  ) {
    return this.portalService.updatePortalSettings(patient.patientId, patient.orgId, dto, {
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });
  }

  /**
   * POST /api/v1/portal/data-export
   * Queues GDPR data export for the authenticated patient.
   */
  @Post('data-export')
  @HttpCode(202)
  @ApiOperation({ summary: 'Queue GDPR data export request (returns 202 Accepted)' })
  @ApiResponse({ status: 202, description: 'Export queued for processing' })
  async requestDataExport(@PortalUser() patient: PatientRequestUser) {
    return this.portalService.requestDataExport(patient.patientId, patient.orgId);
  }

  /**
   * POST /api/v1/portal/delete-account
   * Queues GDPR account deletion request for admin confirmation.
   */
  @Post('delete-account')
  @HttpCode(202)
  @ApiOperation({ summary: 'Queue GDPR account deletion request (admin confirmation required)' })
  @ApiResponse({ status: 202, description: 'Deletion request queued' })
  async requestDeleteAccount(
    @PortalUser() patient: PatientRequestUser,
    @Body() dto: RequestPortalAccountDeletionDto,
  ) {
    return this.portalService.requestAccountDeletion(
      patient.patientId,
      patient.orgId,
      dto.reason,
    );
  }
}

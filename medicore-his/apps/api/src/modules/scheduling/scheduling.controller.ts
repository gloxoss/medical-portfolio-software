import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';
import { Permissions } from '../../core/decorators/permissions.decorator';
import { SchedulingService } from './scheduling.service';
import { RedisQueueService } from './redis-queue.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { AvailabilityQueryDto } from './dto/availability-query.dto';

// Reusable tenant extraction from validated JWT payload
function tenantCtx(req: Request & { user?: { orgId: string; id: string } }) {
  return { orgId: req.user!.orgId, userId: req.user!.id };
}

@ApiTags('Scheduling')
@ApiBearerAuth('staff-jwt')
@Controller()
export class SchedulingController {
  constructor(
    private readonly svc: SchedulingService,
    private readonly redisQueue: RedisQueueService,
  ) {}

  // ── Doctor Schedule Templates ─────────────────────────────────────────────

  // POST /doctors/:id/schedule — define working hours for a day
  @Post('doctors/:id/schedule')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('settings.write')
  @ApiOperation({ summary: 'Define weekly schedule template for a doctor' })
  @ApiResponse({ status: 201, description: 'Schedule created' })
  async createSchedule(
    @Param('id') doctorId: string,
    @Body() dto: CreateScheduleDto,
    @Req() req: Request & { user?: { orgId: string; id: string } },
  ) {
    const { orgId } = tenantCtx(req);
    const schedule = await this.svc.createSchedule(doctorId, orgId, dto);
    if (!schedule) {
      return { message: 'Doctor not found in this organisation' };
    }
    return schedule;
  }

  // GET /doctors/:id/schedule — list all schedule templates for a doctor
  @Get('doctors/:id/schedule')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List all schedule templates for a doctor' })
  async getDoctorSchedules(
    @Param('id') doctorId: string,
    @Req() req: Request & { user?: { orgId: string; id: string } },
  ) {
    const { orgId } = tenantCtx(req);
    return this.svc.getDoctorSchedules(doctorId, orgId);
  }

  // ── Availability ──────────────────────────────────────────────────────────

  // GET /doctors/:id/availability?date=2026-04-10&facility_id=xxx
  // FIX-1: was missing auth guard — anyone could enumerate doctor schedules.
  // Now requires authentication + appointment.read permission.
  // FIX-2: orgId is extracted from JWT and forwarded to service so the service
  // can verify the queried doctor belongs to the caller's organisation.
  @Get('doctors/:id/availability')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('appointment.read')
  @ApiOperation({ summary: 'Get available slots for a doctor on a given date' })
  @ApiResponse({ status: 200, description: 'Array of available time slots' })
  async getAvailability(
    @Param('id') doctorId: string,
    @Query() query: AvailabilityQueryDto,
    @Req() req: Request & { user?: { orgId: string; id: string } },
  ) {
    const { orgId } = tenantCtx(req);
    return this.svc.getAvailability(orgId, doctorId, query.facility_id, query.date);
  }

  // ── Appointments ──────────────────────────────────────────────────────────

  // POST /appointments — book a slot
  @Post('appointments')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('appointment.write')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Book an appointment slot (Redis lock prevents double-booking)' })
  @ApiResponse({ status: 201, description: 'Appointment booked' })
  @ApiResponse({ status: 409, description: 'Slot already taken' })
  async bookAppointment(
    @Body() dto: BookAppointmentDto,
    @Req() req: Request & { user?: { orgId: string; id: string } },
  ) {
    const { orgId } = tenantCtx(req);
    return this.svc.bookAppointment(orgId, dto);
  }

  // POST /appointments/:id/checkin — patient arrives
  @Post('appointments/:id/checkin')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('appointment.write')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a patient — assigns queue token' })
  async checkIn(
    @Param('id') appointmentId: string,
    @Req() req: Request & { user?: { orgId: string; id: string } },
  ) {
    const { orgId, userId } = tenantCtx(req);
    return this.svc.checkIn(orgId, appointmentId, userId);
  }

  // PATCH /appointments/:id/status — transition to any valid status
  @Patch('appointments/:id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('appointment.write')
  @ApiOperation({ summary: 'Update appointment status (CONFIRMED/CANCELLED/NO_SHOW)' })
  async updateStatus(
    @Param('id') appointmentId: string,
    @Body() body: { status: string; cancel_reason?: string },
    @Req() req: Request & { user?: { orgId: string; id: string } },
  ) {
    const { orgId, userId } = tenantCtx(req);
    return this.svc.updateStatus(
      orgId,
      appointmentId,
      body.status,
      userId,
      body.cancel_reason ? { cancel_reason: body.cancel_reason } : undefined,
    );
  }

  // ── Queue SSE (authenticated staff view) ─────────────────────────────────

  // GET /facilities/:id/queue — live queue for authenticated staff
  @Get('facilities/:id/queue')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'SSE stream — live check-in queue for authenticated staff' })
  @ApiResponse({ status: 200, description: 'text/event-stream — queue events (init, update)' })
  async queueStream(
    @Param('id') facilityId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send current queue state immediately on connect
    const current = await this.svc.getTodayQueue(facilityId);
    res.write(`data: ${JSON.stringify({ event: 'init', queue: current })}\n\n`);

    // Subscribe to live updates
    const unsub = this.redisQueue.subscribeToQueue(facilityId, (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    });

    // Keep-alive ping every 25s (proxy/load balancer timeout guard)
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);

    res.on('close', () => {
      clearInterval(ping);
      unsub();
    });
  }

  // ── Queue Display (unauthenticated waiting-room screen) ──────────────────

  // GET /queue-display/:facilityId — public SSE for TV/kiosk screens
  @Get('queue-display/:facilityId')
  @ApiOperation({ summary: 'SSE stream — public queue display (no auth, no PII — for TV/kiosk)' })
  @ApiResponse({ status: 200, description: 'text/event-stream — token + status only' })
  async queueDisplay(
    @Param('facilityId') facilityId: string,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Only expose token + status (no patient PII) for public display
    const current = await this.svc.getTodayQueue(facilityId);
    const publicQueue = current.map((a) => ({
      token: a.queue_token,
      status: a.status,
    }));
    res.write(`data: ${JSON.stringify({ event: 'init', queue: publicQueue })}\n\n`);

    const unsub = this.redisQueue.subscribeToQueue(facilityId, (payload) => {
      // Strip PII before forwarding to public display
      const safe = payload as Record<string, unknown>;
      res.write(
        `data: ${JSON.stringify({
          event: safe['event'],
          token: safe['queue_token'],
        })}\n\n`,
      );
    });

    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
    res.on('close', () => {
      clearInterval(ping);
      unsub();
    });
  }
}

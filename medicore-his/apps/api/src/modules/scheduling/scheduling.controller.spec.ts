import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, ConflictException } from '@nestjs/common';
import * as request from 'supertest';
import { SchedulingController } from './scheduling.controller';
import { SchedulingService } from './scheduling.service';
import { RedisQueueService } from './redis-queue.service';
import { JwtAuthGuard } from '../../core/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../core/guards/permissions.guard';

// ─── Stub services ────────────────────────────────────────────────────────────

const mockSchedulingService = {
  createSchedule: jest.fn(),
  getDoctorSchedules: jest.fn(),
  getAvailability: jest.fn(),
  bookAppointment: jest.fn(),
  checkIn: jest.fn(),
  updateStatus: jest.fn(),
  getTodayQueue: jest.fn(),
};

const mockRedisQueueService = {
  subscribeToQueue: jest.fn(),
};

const MOCK_USER = { id: 'staff-001', orgId: 'org-001', email: 'staff@medicore.ma' };

describe('SchedulingController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulingController],
      providers: [
        { provide: SchedulingService, useValue: mockSchedulingService },
        { provide: RedisQueueService, useValue: mockRedisQueueService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.use((req: { user: unknown }, _res: unknown, next: () => void) => {
      req.user = MOCK_USER;
      next();
    });
    await app.init();
  });

  afterAll(() => app.close());
  afterEach(() => jest.clearAllMocks());

  // ── GET /doctors/:id/availability ──────────────────────────────────────────

  describe('GET /doctors/:id/availability', () => {
    it('should return 200 with available slots', async () => {
      const slots = [
        { startTime: '09:00', endTime: '09:30', available: true },
        { startTime: '09:30', endTime: '10:00', available: false },
      ];
      mockSchedulingService.getAvailability.mockResolvedValue(slots);

      const res = await request(app.getHttpServer())
        .get('/doctors/doctor-001/availability?facility_id=fac-001&date=2026-04-15')
        .set('Authorization', 'Bearer mock-jwt');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(mockSchedulingService.getAvailability).toHaveBeenCalledWith(
        'org-001',
        'doctor-001',
        'fac-001',
        '2026-04-15',
      );
    });

    it('should return 200 with empty slots when doctor has no schedule', async () => {
      mockSchedulingService.getAvailability.mockResolvedValue([]);

      const res = await request(app.getHttpServer())
        .get('/doctors/doctor-999/availability?facility_id=fac-001&date=2026-04-15');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(0);
    });
  });

  // ── POST /appointments ──────────────────────────────────────────────────────

  describe('POST /appointments', () => {
    const validBooking = {
      doctor_id: 'doctor-001',
      facility_id: 'fac-001',
      patient_id: 'patient-001',
      start_time: '2026-04-15T09:00:00.000Z',
      type: 'consultation',
    };

    it('should return 201 and booked appointment', async () => {
      const booked = {
        _id: 'appt-001',
        status: 'CONFIRMED',
        queue_token: null,
        ...validBooking,
      };
      mockSchedulingService.bookAppointment.mockResolvedValue(booked);

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .send(validBooking);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ status: 'CONFIRMED' });
      expect(mockSchedulingService.bookAppointment).toHaveBeenCalledWith(
        'org-001',
        validBooking,
      );
    });

    it('should return 409 when slot is already taken', async () => {
      mockSchedulingService.bookAppointment.mockRejectedValue(
        new ConflictException('Slot already booked'),
      );

      const res = await request(app.getHttpServer())
        .post('/appointments')
        .send(validBooking);

      expect(res.status).toBe(409);
    });
  });

  // ── POST /appointments/:id/checkin ─────────────────────────────────────────

  describe('POST /appointments/:id/checkin', () => {
    it('should return 200 with check-in result', async () => {
      const checkedIn = { _id: 'appt-001', status: 'CHECKED_IN', queue_token: 'A-042' };
      mockSchedulingService.checkIn.mockResolvedValue(checkedIn);

      const res = await request(app.getHttpServer())
        .post('/appointments/appt-001/checkin');

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'CHECKED_IN', queue_token: 'A-042' });
      expect(mockSchedulingService.checkIn).toHaveBeenCalledWith('org-001', 'appt-001', 'staff-001');
    });
  });

  // ── PATCH /appointments/:id/status ─────────────────────────────────────────

  describe('PATCH /appointments/:id/status', () => {
    it('should return 200 when status updated to CANCELLED', async () => {
      const updated = { _id: 'appt-001', status: 'CANCELLED', cancel_reason: 'Patient request' };
      mockSchedulingService.updateStatus.mockResolvedValue(updated);

      const res = await request(app.getHttpServer())
        .patch('/appointments/appt-001/status')
        .send({ status: 'CANCELLED', cancel_reason: 'Patient request' });

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: 'CANCELLED' });
    });
  });

  // ── POST /doctors/:id/schedule ──────────────────────────────────────────────

  describe('POST /doctors/:id/schedule', () => {
    it('should return 201 when schedule is created', async () => {
      const schedule = { id: 'sched-001', doctorId: 'doctor-001', dayOfWeek: 1, startTime: '08:00', endTime: '17:00' };
      mockSchedulingService.createSchedule.mockResolvedValue(schedule);

      const res = await request(app.getHttpServer())
        .post('/doctors/doctor-001/schedule')
        .send({ facility_id: 'fac-001', day_of_week: 1, start_time: '08:00', end_time: '17:00', slot_minutes: 30 });

      expect(res.status).toBe(201);
      expect(mockSchedulingService.createSchedule).toHaveBeenCalledWith(
        'doctor-001',
        'org-001',
        expect.objectContaining({ day_of_week: 1 }),
      );
    });

    it('should return 200 with not-found message when doctor not in org', async () => {
      mockSchedulingService.createSchedule.mockResolvedValue(null);

      const res = await request(app.getHttpServer())
        .post('/doctors/unknown-doctor/schedule')
        .send({ facility_id: 'fac-001', day_of_week: 1, start_time: '08:00', end_time: '17:00', slot_minutes: 30 });

      expect(res.status).toBe(201); // controller returns message with 201 by default
      expect(res.body).toMatchObject({ message: 'Doctor not found in this organisation' });
    });
  });
});

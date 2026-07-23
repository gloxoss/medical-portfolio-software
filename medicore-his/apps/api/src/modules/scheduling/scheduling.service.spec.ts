import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { SchedulingService } from './scheduling.service';
import { SchedPgRepository } from './sched-pg.repository';
import { SchedMongoRepository } from './sched-mongo.repository';
import { RedisQueueService } from './redis-queue.service';
import { RedisPublisherService } from '../../infrastructure/events/redis-publisher.service';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const mockSchedule = {
  id: 'sched-1',
  doctorId: 'doc-1',
  facilityId: 'fac-1',
  dayOfWeek: 1, // Monday
  startTime: '09:00',
  endTime: '11:00',
  slotMinutes: 30,
  breaks: [],
  isActive: true,
};

const mockAppointment = {
  _id: 'appt-1',
  org_id: 'org-1',
  facility_id: 'fac-1',
  patient_id: 'pat-1',
  doctor_id: 'doc-1',
  start_time: new Date('2026-04-06T09:00:00.000Z'), // Monday
  end_time: new Date('2026-04-06T09:30:00.000Z'),
  type: 'consultation',
  status: 'booked',
  status_history: [],
};

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPg: jest.Mocked<Partial<SchedPgRepository>> = {
  createSchedule: jest.fn(),
  getSchedule: jest.fn(),
  getDoctorSchedules: jest.fn(),
};

const mockMongo: jest.Mocked<Partial<SchedMongoRepository>> = {
  create: jest.fn(),
  getBookedSlots: jest.fn(),
  findById: jest.fn(),
  updateStatus: jest.fn(),
  updateStatusConditional: jest.fn(), // FIX-3 — atomic check-in method
  setQueueToken: jest.fn(),            // FIX-3 — separate token assignment
  findStaleActive: jest.fn(),
  bulkMarkNoShow: jest.fn(),
  getTodayCheckedIn: jest.fn(),
  findUpcomingTomorrow: jest.fn(),
};

const mockRedis: jest.Mocked<Partial<RedisQueueService>> = {
  acquireBookingLock: jest.fn(),
  releaseBookingLock: jest.fn(),
  nextToken: jest.fn(),
  enqueue: jest.fn(),
  removeFromQueue: jest.fn(),
  notifyQueueUpdate: jest.fn(),
};

const mockPublisher: jest.Mocked<Partial<RedisPublisherService>> = {
  publish: jest.fn(),
};

// ── Suite ──────────────────────────────────────────────────────────────────────

describe('SchedulingService', () => {
  let service: SchedulingService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulingService,
        { provide: SchedPgRepository, useValue: mockPg },
        { provide: SchedMongoRepository, useValue: mockMongo },
        { provide: RedisQueueService, useValue: mockRedis },
        { provide: RedisPublisherService, useValue: mockPublisher },
      ],
    }).compile();

    service = module.get(SchedulingService);
  });

  // ── getAvailability ──────────────────────────────────────────────────────────

  describe('getAvailability', () => {
    it('returns empty array when doctor has no schedule for that day', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(null);

      const slots = await service.getAvailability('org-1', 'doc-1', 'fac-1', '2026-04-10');
      expect(slots).toEqual([]);
    });

    it('computes correct slots for a 2h window with 30m slots (no breaks)', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(mockSchedule);
      (mockMongo.getBookedSlots as jest.Mock).mockResolvedValue([]);

      // 2026-04-06 is a Monday — matches dayOfWeek=1
      const slots = await service.getAvailability('org-1', 'doc-1', 'fac-1', '2026-04-06');

      expect(slots).toHaveLength(4); // 09:00, 09:30, 10:00, 10:30
      expect(slots.every((s) => s.available)).toBe(true);
    });

    it('marks a slot as unavailable when already booked', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(mockSchedule);
      (mockMongo.getBookedSlots as jest.Mock).mockResolvedValue([
        { start_time: new Date('2026-04-06T09:00:00.000Z') },
      ]);

      const slots = await service.getAvailability('org-1', 'doc-1', 'fac-1', '2026-04-06');

      const first = slots.find((s) => s.start_time.includes('09:00'));
      expect(first?.available).toBe(false);
      expect(slots.filter((s) => s.available)).toHaveLength(3);
    });

    it('excludes slots that fall within a break', async () => {
      const schedWithBreak = {
        ...mockSchedule,
        breaks: [{ start: '09:30', end: '10:00' }],
      };
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(schedWithBreak);
      (mockMongo.getBookedSlots as jest.Mock).mockResolvedValue([]);

      const slots = await service.getAvailability('org-1', 'doc-1', 'fac-1', '2026-04-06');
      // 09:00 ✓, 09:30 blocked by break, 10:00 ✓, 10:30 ✓
      expect(slots).toHaveLength(3);
    });

    // FIX-2 regression test: cross-org query must return empty
    it('returns empty array when doctor does not belong to the requesting org (FIX-2)', async () => {
      // pgRepo.getSchedule returns null when orgId doesn't match doctor's org
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(null);

      const slots = await service.getAvailability('org-OTHER', 'doc-1', 'fac-1', '2026-04-06');

      expect(slots).toEqual([]);
      // Verify orgId is forwarded to the repository for org-isolation enforcement
      expect(mockPg.getSchedule).toHaveBeenCalledWith(
        'doc-1', 'fac-1', expect.any(Number), 'org-OTHER',
      );
    });
  });

  // ── bookAppointment ──────────────────────────────────────────────────────────

  describe('bookAppointment', () => {
    const dto = {
      patient_id: 'pat-1',
      doctor_id: 'doc-1',
      facility_id: 'fac-1',
      start_time: '2026-04-06T09:00:00.000Z',
      type: 'consultation' as const,
    };

    it('throws BadRequestException when doctor has no schedule for that day', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(null);

      await expect(service.bookAppointment('org-1', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when Redis lock cannot be acquired', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(mockSchedule);
      (mockRedis.acquireBookingLock as jest.Mock).mockResolvedValue(false);

      await expect(service.bookAppointment('org-1', dto)).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException when slot is already booked (double-check after lock)', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(mockSchedule);
      (mockRedis.acquireBookingLock as jest.Mock).mockResolvedValue(true);
      (mockRedis.releaseBookingLock as jest.Mock).mockResolvedValue(undefined);
      (mockMongo.getBookedSlots as jest.Mock).mockResolvedValue([
        { start_time: new Date('2026-04-06T09:00:00.000Z') },
      ]);

      await expect(service.bookAppointment('org-1', dto)).rejects.toThrow(ConflictException);
      // Lock must still be released even on error
      expect(mockRedis.releaseBookingLock).toHaveBeenCalled();
    });

    it('creates appointment and releases lock on success', async () => {
      (mockPg.getSchedule as jest.Mock).mockResolvedValue(mockSchedule);
      (mockRedis.acquireBookingLock as jest.Mock).mockResolvedValue(true);
      (mockRedis.releaseBookingLock as jest.Mock).mockResolvedValue(undefined);
      (mockMongo.getBookedSlots as jest.Mock).mockResolvedValue([]);
      (mockMongo.create as jest.Mock).mockResolvedValue(mockAppointment);

      const result = await service.bookAppointment('org-1', dto);

      expect(result).toEqual(mockAppointment);
      expect(mockMongo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          org_id: 'org-1',
          doctor_id: 'doc-1',
          patient_id: 'pat-1',
          type: 'consultation',
        }),
      );
      expect(mockRedis.releaseBookingLock).toHaveBeenCalled();
    });
  });

  // ── checkIn ──────────────────────────────────────────────────────────────────

  describe('checkIn', () => {
    it('throws NotFoundException when appointment does not exist', async () => {
      (mockMongo.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.checkIn('org-1', 'appt-x', 'user-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when appointment status is not booked/confirmed', async () => {
      (mockMongo.findById as jest.Mock).mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(service.checkIn('org-1', 'appt-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    // FIX-3 regression test: token is generated AFTER the atomic write wins
    it('performs atomic check-in: conditional write wins, then assigns token (FIX-3)', async () => {
      const checkedInDoc = { ...mockAppointment, status: 'checked_in' };
      const withTokenDoc = { ...checkedInDoc, queue_token: 'T-001' };

      (mockMongo.findById as jest.Mock).mockResolvedValue(mockAppointment);
      (mockMongo.updateStatusConditional as jest.Mock).mockResolvedValue(checkedInDoc);
      (mockRedis.nextToken as jest.Mock).mockResolvedValue('T-001');
      (mockMongo.setQueueToken as jest.Mock).mockResolvedValue(withTokenDoc);
      (mockRedis.enqueue as jest.Mock).mockResolvedValue(undefined);
      (mockRedis.notifyQueueUpdate as jest.Mock).mockResolvedValue(undefined);

      const result = await service.checkIn('org-1', 'appt-1', 'user-1');

      // Write uses conditional update — only succeeds if still in eligible state
      expect(mockMongo.updateStatusConditional).toHaveBeenCalledWith(
        'appt-1',
        ['booked', 'confirmed'],
        'checked_in',
        'user-1',
      );
      // Token assigned AFTER write (not before — no wasted sequence numbers)
      expect(mockMongo.setQueueToken).toHaveBeenCalledWith('appt-1', 'T-001');
      expect(mockRedis.enqueue).toHaveBeenCalled();
      expect(result.queue_token).toBe('T-001');
    });

    // FIX-3 regression test: second concurrent caller loses the race gracefully
    it('throws BadRequestException when concurrent request already checked in (FIX-3 race)', async () => {
      (mockMongo.findById as jest.Mock).mockResolvedValue(mockAppointment); // still shows booked
      // updateStatusConditional returns null = document already transitioned by the winning request
      (mockMongo.updateStatusConditional as jest.Mock).mockResolvedValue(null);

      await expect(service.checkIn('org-1', 'appt-1', 'user-1')).rejects.toThrow(BadRequestException);
      // No token consumed for the losing request
      expect(mockRedis.nextToken).not.toHaveBeenCalled();
    });
  });

  // ── markNoShows (cron) ────────────────────────────────────────────────────────

  describe('markNoShows', () => {
    it('does nothing when no stale appointments exist', async () => {
      (mockMongo.findStaleActive as jest.Mock).mockResolvedValue([]);

      await service.markNoShows();

      expect(mockMongo.bulkMarkNoShow).not.toHaveBeenCalled();
    });

    it('bulk-marks stale appointments as no_show on first attempt', async () => {
      (mockMongo.findStaleActive as jest.Mock).mockResolvedValue([
        { _id: 'a1' },
        { _id: 'a2' },
      ]);
      (mockMongo.bulkMarkNoShow as jest.Mock).mockResolvedValue(undefined);

      await service.markNoShows();

      expect(mockMongo.bulkMarkNoShow).toHaveBeenCalledWith(['a1', 'a2']);
    });

    // FIX-6 regression test: single failure → retry → success
    it('retries bulkMarkNoShow on MongoDB failure and succeeds on second attempt (FIX-6)', async () => {
      jest.useFakeTimers();

      (mockMongo.findStaleActive as jest.Mock).mockResolvedValue([{ _id: 'a1' }]);
      (mockMongo.bulkMarkNoShow as jest.Mock)
        .mockRejectedValueOnce(new Error('MongoDB timeout')) // First attempt fails
        .mockResolvedValueOnce(undefined);                   // Second attempt succeeds

      const promise = service.markNoShows();
      await jest.advanceTimersByTimeAsync(2500); // Past first retry delay (2000ms)
      await promise;

      expect(mockMongo.bulkMarkNoShow).toHaveBeenCalledTimes(2);
      jest.useRealTimers();
    });

    // FIX-6 regression test: all 3 retries exhausted → error logged, no throw
    it('exhausts all retries and logs error without crashing the process (FIX-6)', async () => {
      jest.useFakeTimers();

      (mockMongo.findStaleActive as jest.Mock).mockResolvedValue([{ _id: 'a1' }]);
      (mockMongo.bulkMarkNoShow as jest.Mock).mockRejectedValue(new Error('persistent failure'));

      const promise = service.markNoShows();
      // Advance past all backoff delays: 2000 + 4000 = 6000ms total
      await jest.advanceTimersByTimeAsync(10_000);
      // Cron must NOT throw (it logs and exits gracefully)
      await expect(promise).resolves.toBeUndefined();

      expect(mockMongo.bulkMarkNoShow).toHaveBeenCalledTimes(3);
      jest.useRealTimers();
    });
  });
});

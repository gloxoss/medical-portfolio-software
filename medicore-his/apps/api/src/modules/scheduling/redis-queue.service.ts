import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Handles queue state in Redis:
//   - Atomic token generation: INCR queue_seq:{facilityId}:{date} → T-001
//   - Queue ordering: ZADD queue:{facilityId}:{date} <score> <appointmentId>
//   - SSE notifications: PUBLISH queue.update:{facilityId} <payload>
//   - Subscriber connection for SSE consumers

const TOKEN_PREFIX = 'T';
const QUEUE_KEY = (facilityId: string, date: string) =>
  `queue:${facilityId}:${date}`;
const SEQ_KEY = (facilityId: string, date: string) =>
  `queue_seq:${facilityId}:${date}`;
const QUEUE_CHANNEL = (facilityId: string) => `queue.update:${facilityId}`;
// Keys expire 48h after creation — auto-cleanup
const QUEUE_TTL_SECONDS = 48 * 60 * 60;

@Injectable()
export class RedisQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisQueueService.name);
  private publisher!: Redis;
  private subscriber!: Redis;
  // FIX-4: Track readiness — operations throw instead of silently failing
  private isReady = false;

  constructor(private readonly config: ConfigService) {}

  // FIX-4: Changed to async so we can await a PING health check.
  // If Redis is unreachable at startup, we log a FATAL message and throw so
  // the process exits rather than running with a silently broken queue.
  async onModuleInit(): Promise<void> {
    const url = this.config.get<string>('REDIS_URL', 'redis://:medicore@localhost:6379');
    // Two separate connections — Redis requires a dedicated connection for SUBSCRIBE
    this.publisher = new Redis(url, { lazyConnect: true });
    this.subscriber = new Redis(url, { lazyConnect: true });

    this.publisher.on('error', (err: Error) =>
      this.logger.error('Redis queue publisher error', err.message),
    );
    this.subscriber.on('error', (err: Error) =>
      this.logger.error('Redis queue subscriber error', err.message),
    );

    // FIX-4: Explicit connect + health check — fail fast instead of silent failure
    try {
      await this.publisher.connect();
      await this.subscriber.connect();

      // PING verifies the connection is functional, not just TCP-established
      await this.publisher.ping();
      await this.subscriber.ping();

      this.isReady = true;
      this.logger.log('Redis queue connections established and healthy');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // FATAL — log before throwing so the message appears in startup output
      this.logger.fatal(
        `Redis is unreachable at startup — cannot start with a broken queue: ${message}`,
      );
      throw new Error(`Redis startup health check failed: ${message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
  }

  // Guard called by every public method — throws a typed error instead of an
  // ioredis error with no context, making Redis failures visible to callers.
  private assertReady(): void {
    if (!this.isReady) {
      throw Object.assign(new Error('Redis queue is not available'), {
        statusCode: 503,
        code: 'REDIS_UNAVAILABLE',
      });
    }
  }

  // ── Token Generation ────────────────────────────────────────────────────────

  // Returns "T-042". The INCR is atomic — no two callers get the same number.
  async nextToken(facilityId: string, date: string): Promise<string> {
    this.assertReady();
    const key = SEQ_KEY(facilityId, date);
    const seq = await this.publisher.incr(key);
    // Set TTL on first increment
    if (seq === 1) {
      await this.publisher.expire(key, QUEUE_TTL_SECONDS);
    }
    return `${TOKEN_PREFIX}-${String(seq).padStart(3, '0')}`;
  }

  // ── Sorted Set Queue ────────────────────────────────────────────────────────

  // Score = arrival epoch seconds (earlier arrivals served first)
  async enqueue(
    facilityId: string,
    date: string,
    appointmentId: string,
  ): Promise<void> {
    this.assertReady();
    const key = QUEUE_KEY(facilityId, date);
    const score = Date.now() / 1000;
    await this.publisher.zadd(key, score, appointmentId);
    await this.publisher.expire(key, QUEUE_TTL_SECONDS);
  }

  async dequeue(facilityId: string, date: string): Promise<string[]> {
    this.assertReady();
    const key = QUEUE_KEY(facilityId, date);
    // Returns all members in score order (position = queue order)
    return this.publisher.zrange(key, 0, -1);
  }

  async removeFromQueue(
    facilityId: string,
    date: string,
    appointmentId: string,
  ): Promise<void> {
    this.assertReady();
    const key = QUEUE_KEY(facilityId, date);
    await this.publisher.zrem(key, appointmentId);
  }

  // ── Pub/Sub ─────────────────────────────────────────────────────────────────

  async notifyQueueUpdate(facilityId: string, payload: unknown): Promise<void> {
    this.assertReady();
    const message = JSON.stringify({
      channel: QUEUE_CHANNEL(facilityId),
      data: payload,
      ts: new Date().toISOString(),
    });
    await this.publisher.publish(QUEUE_CHANNEL(facilityId), message);
  }

  // Subscribe a callback to queue updates for a facility.
  // Returns an unsubscribe function — call it when the SSE connection closes.
  subscribeToQueue(
    facilityId: string,
    onMessage: (payload: unknown) => void,
  ): () => void {
    this.assertReady();
    const channel = QUEUE_CHANNEL(facilityId);
    this.subscriber.subscribe(channel, (err) => {
      if (err) this.logger.error(`Subscribe error for ${channel}`, err.message);
    });

    const handler = (_ch: string, message: string) => {
      try {
        const parsed = JSON.parse(message) as { data: unknown };
        onMessage(parsed.data);
      } catch {
        this.logger.warn('Malformed queue message received');
      }
    };

    this.subscriber.on('message', handler);

    return () => {
      this.subscriber.unsubscribe(channel);
      this.subscriber.off('message', handler);
    };
  }

  // ── Booking Lock ─────────────────────────────────────────────────────────────

  // Optimistic lock — prevents double-booking the same slot.
  // Key: booking_lock:{doctorId}:{slotISO}  TTL: 30s  Value: appointmentId
  // Returns true if lock was acquired (i.e., slot is free).
  async acquireBookingLock(
    doctorId: string,
    slotISO: string,
    appointmentId: string,
  ): Promise<boolean> {
    this.assertReady();
    const key = `booking_lock:${doctorId}:${slotISO}`;
    const result = await this.publisher.set(key, appointmentId, 'EX', 30, 'NX');
    return result === 'OK';
  }

  async releaseBookingLock(doctorId: string, slotISO: string): Promise<void> {
    this.assertReady();
    const key = `booking_lock:${doctorId}:${slotISO}`;
    await this.publisher.del(key);
  }
}

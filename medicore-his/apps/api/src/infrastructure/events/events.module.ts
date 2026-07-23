import { Global, Module } from '@nestjs/common';
import { RedisPublisherService } from './redis-publisher.service';

// Global — every module can inject RedisPublisherService without importing EventsModule
@Global()
@Module({
  providers: [RedisPublisherService],
  exports: [RedisPublisherService],
})
export class EventsModule {}

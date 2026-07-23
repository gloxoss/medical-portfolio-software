import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema';
import { SchedPgRepository } from './sched-pg.repository';
import { SchedMongoRepository } from './sched-mongo.repository';
import { RedisQueueService } from './redis-queue.service';
import { SchedulingService } from './scheduling.service';
import { SchedulingController } from './scheduling.controller';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { EventsModule } from '../../infrastructure/events/events.module';

@Module({
  imports: [
    PrismaModule,
    EventsModule,
    MongooseModule.forFeature([
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  providers: [
    SchedPgRepository,
    SchedMongoRepository,
    RedisQueueService,
    SchedulingService,
  ],
  controllers: [SchedulingController],
  exports: [SchedulingService],
})
export class SchedulingModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../infrastructure/events/events.module';
import { VideoModule } from '../../infrastructure/providers/video/video.module';
import { EncountersModule } from '../encounters/encounters.module';
import { Appointment, AppointmentSchema } from '../scheduling/schemas/appointment.schema';
import { Encounter, EncounterSchema } from '../encounters/encounter.schema';
import { TelemedicineController } from './telemedicine.controller';
import { TelemedicinePortalController } from './telemedicine-portal.controller';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineEventHandler } from './telemedicine.event-handler';
import { VideoSessionRecord, VideoSessionSchema } from './video-session.schema';

@Module({
  imports: [
    ConfigModule,
    EventsModule,
    VideoModule,
    EncountersModule,
    MongooseModule.forFeature([
      { name: VideoSessionRecord.name, schema: VideoSessionSchema },
      { name: Appointment.name, schema: AppointmentSchema },
      { name: Encounter.name, schema: EncounterSchema },
    ]),
  ],
  controllers: [TelemedicineController, TelemedicinePortalController],
  providers: [TelemedicineService, TelemedicineEventHandler],
  exports: [TelemedicineService],
})
export class TelemedicineModule {}

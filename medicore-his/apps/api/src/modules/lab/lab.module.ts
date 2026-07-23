import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrismaModule } from '../../infrastructure/database/prisma/prisma.module';
import { EncountersModule } from '../encounters/encounters.module';
import { EventsModule } from '../../infrastructure/events/events.module';
import { LabController } from './lab.controller';
import { LabService } from './lab.service';
import { LabResultRepository } from './lab-result.repository';
import { LabResultRecord, LabResultSchema } from './lab-result.schema';

@Module({
  imports: [
    PrismaModule,
    EncountersModule,
    EventsModule,
    MongooseModule.forFeature([{ name: LabResultRecord.name, schema: LabResultSchema }]),
  ],
  controllers: [LabController],
  providers: [LabService, LabResultRepository],
  exports: [LabService, LabResultRepository],
})
export class LabModule {}

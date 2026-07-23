import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Encounter, EncounterSchema } from './encounter.schema';
import { EncountersRepository } from './encounters.repository';
import { EncountersService } from './encounters.service';
import { EncountersController } from './encounters.controller';
import { EventsModule } from '../../infrastructure/events/events.module';
import { PatientsModule } from '../patients/patients.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Encounter.name, schema: EncounterSchema }]),
    EventsModule,
    PatientsModule, // For allergy cross-check in prescriptions
  ],
  controllers: [EncountersController],
  providers: [EncountersRepository, EncountersService],
  exports: [EncountersService],
})
export class EncountersModule {}

import { Module } from '@nestjs/common';
import { TenancyController } from './tenancy.controller';
import { TenancyService } from './tenancy.service';
import { AuthModule } from '../auth/auth.module';
import { EventsModule } from '../../infrastructure/events/events.module';

@Module({
  imports: [AuthModule, EventsModule],
  controllers: [TenancyController],
  providers: [TenancyService],
  exports: [TenancyService],
})
export class TenancyModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DailyVideoProvider } from './daily.provider';
import { VIDEO_PROVIDER } from './video.interface';

@Module({
  imports: [ConfigModule],
  providers: [
    DailyVideoProvider,
    {
      provide: VIDEO_PROVIDER,
      useExisting: DailyVideoProvider,
    },
  ],
  exports: [VIDEO_PROVIDER],
})
export class VideoModule {}
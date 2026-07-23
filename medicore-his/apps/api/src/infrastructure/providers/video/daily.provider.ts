import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IVideoProvider, VideoMeetingTokenInput, VideoRoomInput, VideoRoomResult } from './video.interface';

type DailyRoomPayload = {
  name?: string;
  url?: string;
};

type DailyMeetingTokenPayload = {
  token?: string;
};

@Injectable()
export class DailyVideoProvider implements IVideoProvider {
  private readonly logger = new Logger(DailyVideoProvider.name);

  constructor(private readonly config: ConfigService) {}

  async createRoom(input: VideoRoomInput): Promise<VideoRoomResult> {
    const roomName = this.buildRoomName(input.orgId, input.appointmentId);
    const dailyApiKey = this.config.get<string>('DAILY_API_KEY');

    if (!dailyApiKey) {
      const roomUrl = `${this.dailyMockRoomBaseUrl}${this.dailyMockRoomBaseUrl.includes('?') ? '&' : '?'}room=${encodeURIComponent(roomName)}`;
      this.logger.warn('DAILY_API_KEY is missing — returning mock room URL');
      return { roomName, roomUrl };
    }

    const expiresAt = Math.floor((input.scheduledStartAt.getTime() + 2 * 60 * 60 * 1000) / 1000);

    const response = await fetch(`${this.dailyApiBaseUrl}/rooms`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: roomName,
        privacy: 'private',
        properties: {
          exp: expiresAt,
          max_participants: 4,
          enable_chat: false,
        },
      }),
    });

    if (!response.ok) {
      const body = await this.readHttpBody(response);
      this.logger.error(`Daily.co room creation failed (${response.status}): ${body}`);
      throw new ServiceUnavailableException('Unable to create Daily.co room');
    }

    const payload = (await this.readHttpJson(response)) as DailyRoomPayload;
    if (!payload.name || !payload.url) {
      throw new ServiceUnavailableException('Daily.co room response is incomplete');
    }

    return {
      roomName: payload.name,
      roomUrl: payload.url,
    };
  }

  async createMeetingToken(input: VideoMeetingTokenInput): Promise<string> {
    const dailyApiKey = this.config.get<string>('DAILY_API_KEY');

    if (!dailyApiKey) {
      return `mock-token-${input.roomName}-${input.isOwner ? 'doctor' : 'patient'}`;
    }

    const response = await fetch(`${this.dailyApiBaseUrl}/meeting-tokens`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          room_name: input.roomName,
          user_name: input.userName,
          is_owner: input.isOwner,
          exp: Math.floor((Date.now() + 2 * 60 * 60 * 1000) / 1000),
        },
      }),
    });

    if (!response.ok) {
      const body = await this.readHttpBody(response);
      this.logger.error(`Daily.co token creation failed (${response.status}): ${body}`);
      throw new ServiceUnavailableException('Unable to create Daily.co meeting token');
    }

    const payload = (await this.readHttpJson(response)) as DailyMeetingTokenPayload;
    if (!payload.token) {
      throw new ServiceUnavailableException('Daily.co token response is incomplete');
    }

    return payload.token;
  }

  async deleteRoom(roomName: string): Promise<void> {
    const dailyApiKey = this.config.get<string>('DAILY_API_KEY');
    if (!dailyApiKey) {
      return;
    }

    const response = await fetch(`${this.dailyApiBaseUrl}/rooms/${encodeURIComponent(roomName)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${dailyApiKey}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      const body = await this.readHttpBody(response);
      this.logger.error(`Daily.co room deletion failed (${response.status}): ${body}`);
      throw new ServiceUnavailableException('Unable to delete Daily.co room');
    }
  }

  private get dailyApiBaseUrl(): string {
    return this.config.get<string>('DAILY_API_BASE_URL') ?? 'https://api.daily.co/v1';
  }

  private get dailyMockRoomBaseUrl(): string {
    return this.config.get<string>('DAILY_MOCK_ROOM_URL') ?? 'https://demo.daily.co/hello';
  }

  private buildRoomName(orgId: string, appointmentId: string): string {
    const seed = `${orgId.slice(0, 6)}-${appointmentId.slice(-6)}-${Date.now()}`;
    return `medicore-${seed}`.toLowerCase().replace(/[^a-z0-9-]/g, '');
  }

  private async readHttpJson(response: Response): Promise<unknown> {
    try {
      return await response.json();
    } catch {
      return {};
    }
  }

  private async readHttpBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return '<unreadable>';
    }
  }
}
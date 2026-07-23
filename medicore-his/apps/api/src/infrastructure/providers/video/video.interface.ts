export const VIDEO_PROVIDER = Symbol('VIDEO_PROVIDER');

export type VideoRoomInput = {
  orgId: string;
  appointmentId: string;
  scheduledStartAt: Date;
};

export type VideoRoomResult = {
  roomName: string;
  roomUrl: string;
};

export type VideoMeetingTokenInput = {
  roomName: string;
  userName: string;
  isOwner: boolean;
};

export interface IVideoProvider {
  createRoom(input: VideoRoomInput): Promise<VideoRoomResult>;
  createMeetingToken(input: VideoMeetingTokenInput): Promise<string>;
  deleteRoom(roomName: string): Promise<void>;
}
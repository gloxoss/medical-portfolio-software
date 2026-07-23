export type NotificationChannel = 'sms' | 'email';

export interface NotificationAttachment {
  filename: string;
  content: Buffer;
  mimeType?: string;
}

export interface NotificationDispatchOptions {
  orgId: string;
  patientId: string;
  attempt?: number;
  originalEvent?: string;
  attachment?: NotificationAttachment;
}

export type NotificationResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export interface INotificationProvider {
  readonly channel: NotificationChannel;

  send(
    to: string,
    template: string,
    vars: Record<string, string>,
    options: NotificationDispatchOptions,
  ): Promise<NotificationResult<void>>;
}

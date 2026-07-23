export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export type EmailAttachment = {
  contentBase64: string;
  filename: string;
  mimeType: string;
  disposition?: 'attachment' | 'inline';
};

export type EmailSendInput = {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
};

export interface IEmailProvider {
  isConfigured(): boolean;
  send(input: EmailSendInput): Promise<void>;
}
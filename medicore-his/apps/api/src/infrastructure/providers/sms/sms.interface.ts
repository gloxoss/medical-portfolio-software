export const SMS_PROVIDER = Symbol('SMS_PROVIDER');

export type SmsSendInput = {
  to: string;
  body: string;
};

export interface ISmsProvider {
  isConfigured(): boolean;
  send(input: SmsSendInput): Promise<{ messageId?: string }>;
}
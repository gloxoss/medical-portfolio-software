export interface IOtpProvider {
  send(phone: string, code: string): Promise<void>;
}

export const OTP_PROVIDER_TOKEN = 'OTP_PROVIDER';
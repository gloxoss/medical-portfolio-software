import { assertDevOtpCodeNotInProduction } from './main';

describe('assertDevOtpCodeNotInProduction', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.DEV_OTP_CODE;
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws in production when DEV_OTP_CODE is set', () => {
    process.env.NODE_ENV = 'production';
    process.env.DEV_OTP_CODE = '123456';

    expect(() => assertDevOtpCodeNotInProduction()).toThrow(
      'FATAL: DEV_OTP_CODE must not be set in production.',
    );
  });

  it('does not throw in production when DEV_OTP_CODE is absent', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DEV_OTP_CODE;

    expect(() => assertDevOtpCodeNotInProduction()).not.toThrow();
  });

  it('does not throw in non-production environments', () => {
    process.env.NODE_ENV = 'development';
    process.env.DEV_OTP_CODE = '123456';

    expect(() => assertDevOtpCodeNotInProduction()).not.toThrow();
  });
});

export const ONBOARDING_STEP_ORDER = [
  'ORG_DETAILS',
  'FACILITY_SETUP',
  'ADMIN_USER',
  'BRANDING',
  'GO_LIVE',
] as const;

export const SKIPPABLE_ONBOARDING_STEPS = ['BRANDING'] as const;

export type OnboardingStep = (typeof ONBOARDING_STEP_ORDER)[number];

export type OnboardingStateEntity = {
  org_id: string;
  step: OnboardingStep;
  completed_steps: OnboardingStep[];
  skipped_steps: OnboardingStep[];
  completed_at: string | null;
  last_updated_by: string;
  remaining_steps: number;
};

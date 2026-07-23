import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import {
  ONBOARDING_STEP_ORDER,
  SKIPPABLE_ONBOARDING_STEPS,
  type OnboardingStateEntity,
  type OnboardingStep,
} from './entities/onboarding-state.entity';

type PersistedOnboardingState = {
  orgId: string;
  step: string;
  completedSteps: string[];
  skippedSteps: string[];
  completedAt: Date | null;
  lastUpdatedBy: string;
};

const REQUIRED_STEPS_BEFORE_GO_LIVE: OnboardingStep[] = [
  'ORG_DETAILS',
  'FACILITY_SETUP',
  'ADMIN_USER',
];

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getOnboardingState(orgId: string, userId: string): Promise<OnboardingStateEntity> {
    const state = await this.getOrCreateState(orgId, userId);
    return this.toEntity(state);
  }

  async updateOnboardingStep(
    orgId: string,
    userId: string,
    step: string,
    skipped = false,
  ): Promise<OnboardingStateEntity> {
    const normalizedStep = this.assertValidStep(step);
    const state = await this.getOrCreateState(orgId, userId);

    const completed = new Set(this.sanitizeStepList(state.completedSteps));
    const skippedSteps = new Set(this.sanitizeStepList(state.skippedSteps));

    if (skipped) {
      if (!(SKIPPABLE_ONBOARDING_STEPS as readonly OnboardingStep[]).includes(normalizedStep)) {
        throw new BadRequestException(`Step ${normalizedStep} cannot be skipped`);
      }

      skippedSteps.add(normalizedStep);
      completed.delete(normalizedStep);
    } else {
      if (normalizedStep === 'GO_LIVE' && !this.canGoLive(completed, skippedSteps)) {
        throw new BadRequestException(
          'GO_LIVE requires ORG_DETAILS, FACILITY_SETUP, ADMIN_USER, and BRANDING (or skip) first',
        );
      }

      completed.add(normalizedStep);
      skippedSteps.delete(normalizedStep);
    }

    const completedAt =
      completed.has('GO_LIVE') && this.canGoLive(completed, skippedSteps)
        ? state.completedAt ?? new Date()
        : null;

    const nextStep = this.firstIncompleteStep(completed, skippedSteps);

    const updated = (await this.prisma.onboardingState.upsert({
      where: { orgId },
      create: {
        orgId,
        step: nextStep,
        completedSteps: Array.from(completed),
        skippedSteps: Array.from(skippedSteps),
        completedAt,
        lastUpdatedBy: userId,
      },
      update: {
        step: nextStep,
        completedSteps: Array.from(completed),
        skippedSteps: Array.from(skippedSteps),
        completedAt,
        lastUpdatedBy: userId,
      },
    })) as PersistedOnboardingState;

    return this.toEntity(updated);
  }

  async activateOrganization(
    orgId: string,
    requesterOrgId: string,
    userId: string,
  ): Promise<{ org_id: string; status: 'ACTIVE' }> {
    if (orgId !== requesterOrgId) {
      throw new ForbiddenException('Cannot activate another organization');
    }

    const state = await this.getOrCreateState(orgId, userId);
    const completed = new Set(this.sanitizeStepList(state.completedSteps));
    const skippedSteps = new Set(this.sanitizeStepList(state.skippedSteps));

    if (!this.canGoLive(completed, skippedSteps)) {
      throw new BadRequestException(
        'Complete ORG_DETAILS, FACILITY_SETUP, ADMIN_USER, and BRANDING (or skip) before activation',
      );
    }

    await this.prisma.organization.update({
      where: { id: orgId },
      data: { status: 'ACTIVE' },
    });

    return {
      org_id: orgId,
      status: 'ACTIVE',
    };
  }

  private async getOrCreateState(orgId: string, userId: string): Promise<PersistedOnboardingState> {
    const existing = (await this.prisma.onboardingState.findUnique({
      where: { orgId },
    })) as PersistedOnboardingState | null;

    if (existing) {
      return existing;
    }

    return (await this.prisma.onboardingState.create({
      data: {
        orgId,
        step: 'ORG_DETAILS',
        completedSteps: [],
        skippedSteps: [],
        completedAt: null,
        lastUpdatedBy: userId,
      },
    })) as PersistedOnboardingState;
  }

  private toEntity(state: PersistedOnboardingState): OnboardingStateEntity {
    const completedSteps = this.sanitizeStepList(state.completedSteps);
    const skippedSteps = this.sanitizeStepList(state.skippedSteps);
    const remainingSteps = ONBOARDING_STEP_ORDER.filter(
      (step) => !completedSteps.includes(step) && !skippedSteps.includes(step),
    ).length;

    return {
      org_id: state.orgId,
      step: this.assertValidStep(state.step),
      completed_steps: completedSteps,
      skipped_steps: skippedSteps,
      completed_at: state.completedAt ? state.completedAt.toISOString() : null,
      last_updated_by: state.lastUpdatedBy,
      remaining_steps: remainingSteps,
    };
  }

  private sanitizeStepList(steps: string[]): OnboardingStep[] {
    const stepSet = new Set<OnboardingStep>();

    for (const step of steps) {
      if (ONBOARDING_STEP_ORDER.includes(step as OnboardingStep)) {
        stepSet.add(step as OnboardingStep);
      }
    }

    return Array.from(stepSet);
  }

  private assertValidStep(step: string): OnboardingStep {
    if (!ONBOARDING_STEP_ORDER.includes(step as OnboardingStep)) {
      throw new BadRequestException(`Unknown onboarding step: ${step}`);
    }

    return step as OnboardingStep;
  }

  private firstIncompleteStep(
    completed: Set<OnboardingStep>,
    skippedSteps: Set<OnboardingStep>,
  ): OnboardingStep {
    for (const step of ONBOARDING_STEP_ORDER) {
      if (completed.has(step)) {
        continue;
      }

      if (skippedSteps.has(step)) {
        continue;
      }

      return step;
    }

    return 'GO_LIVE';
  }

  private canGoLive(
    completed: Set<OnboardingStep>,
    skippedSteps: Set<OnboardingStep>,
  ): boolean {
    const requiredComplete = REQUIRED_STEPS_BEFORE_GO_LIVE.every((step) => completed.has(step));
    const brandingResolved = completed.has('BRANDING') || skippedSteps.has('BRANDING');

    return requiredComplete && brandingResolved;
  }
}

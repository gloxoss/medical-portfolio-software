import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma/prisma.service';
import { AdminService } from './admin.service';

type StoredState = {
  orgId: string;
  step: string;
  completedSteps: string[];
  skippedSteps: string[];
  completedAt: Date | null;
  lastUpdatedBy: string;
};

describe('AdminService onboarding', () => {
  let service: AdminService;
  let state: StoredState | null;

  const mockPrisma = {
    onboardingState: {
      findUnique: jest.fn(async () => state),
      create: jest.fn(async ({ data }: { data: StoredState }) => {
        state = {
          orgId: data.orgId,
          step: data.step,
          completedSteps: [...data.completedSteps],
          skippedSteps: [...data.skippedSteps],
          completedAt: data.completedAt,
          lastUpdatedBy: data.lastUpdatedBy,
        };
        return state;
      }),
      upsert: jest.fn(async ({ where, create, update }: {
        where: { orgId: string };
        create: StoredState;
        update: Partial<StoredState>;
      }) => {
        if (!state || state.orgId !== where.orgId) {
          state = {
            orgId: create.orgId,
            step: create.step,
            completedSteps: [...create.completedSteps],
            skippedSteps: [...create.skippedSteps],
            completedAt: create.completedAt,
            lastUpdatedBy: create.lastUpdatedBy,
          };
          return state;
        }

        state = {
          ...state,
          ...update,
          completedSteps: update.completedSteps ? [...update.completedSteps] : state.completedSteps,
          skippedSteps: update.skippedSteps ? [...update.skippedSteps] : state.skippedSteps,
        };
        return state;
      }),
    },
    organization: {
      update: jest.fn(async () => ({ id: 'org-1', status: 'ACTIVE' })),
    },
  };

  beforeEach(async () => {
    state = null;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  it('marks step complete and updates completed_steps', async () => {
    const result = await service.updateOnboardingStep('org-1', 'user-1', 'ORG_DETAILS', false);

    expect(result.completed_steps).toContain('ORG_DETAILS');
    expect(result.completed_at).toBeNull();
  });

  it('skips branding step and keeps completed_at null', async () => {
    const result = await service.updateOnboardingStep('org-1', 'user-1', 'BRANDING', true);

    expect(result.skipped_steps).toContain('BRANDING');
    expect(result.completed_at).toBeNull();
  });

  it('rejects GO_LIVE before required steps are complete', async () => {
    await expect(
      service.updateOnboardingStep('org-1', 'user-1', 'GO_LIVE', false),
    ).rejects.toThrow(BadRequestException);
  });
});

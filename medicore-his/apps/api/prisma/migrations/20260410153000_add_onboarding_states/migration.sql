-- CreateEnum
CREATE TYPE "OnboardingStep" AS ENUM ('ORG_DETAILS', 'FACILITY_SETUP', 'ADMIN_USER', 'BRANDING', 'GO_LIVE');

-- CreateTable
CREATE TABLE "onboarding_states" (
    "org_id" TEXT NOT NULL,
    "step" "OnboardingStep" NOT NULL DEFAULT 'ORG_DETAILS',
    "completed_steps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "skipped_steps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "completed_at" TIMESTAMP(3),
    "last_updated_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_states_pkey" PRIMARY KEY ("org_id")
);

-- CreateIndex
CREATE INDEX "onboarding_states_last_updated_by_idx" ON "onboarding_states"("last_updated_by");

-- AddForeignKey
ALTER TABLE "onboarding_states" ADD CONSTRAINT "onboarding_states_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_states" ADD CONSTRAINT "onboarding_states_last_updated_by_fkey" FOREIGN KEY ("last_updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

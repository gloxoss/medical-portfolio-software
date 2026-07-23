-- CreateEnum
CREATE TYPE "PatientConsentType" AS ENUM ('PORTAL_TERMS', 'AI_AMBIENT_AUDIO');

-- CreateTable
CREATE TABLE "patient_consents" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "consent_type" "PatientConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT false,
    "granted_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_consents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patient_consents_patient_id_org_id_consent_type_key" ON "patient_consents"("patient_id", "org_id", "consent_type");

-- CreateIndex
CREATE INDEX "patient_consents_org_id_patient_id_consent_type_idx" ON "patient_consents"("org_id", "patient_id", "consent_type");

-- AddForeignKey
ALTER TABLE "patient_consents" ADD CONSTRAINT "patient_consents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

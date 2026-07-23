-- CreateEnum
CREATE TYPE "PortalPrivacyRequestType" AS ENUM ('DATA_EXPORT', 'ACCOUNT_DELETION');

-- CreateEnum
CREATE TYPE "PortalPrivacyRequestStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "portal_patient_settings" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "sms_notifications" BOOLEAN NOT NULL DEFAULT true,
    "email_notifications" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_patient_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_privacy_requests" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "request_type" "PortalPrivacyRequestType" NOT NULL,
    "status" "PortalPrivacyRequestStatus" NOT NULL DEFAULT 'QUEUED',
    "reason" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portal_privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "portal_patient_settings_patient_id_org_id_key" ON "portal_patient_settings"("patient_id", "org_id");

-- CreateIndex
CREATE INDEX "portal_patient_settings_org_id_patient_id_idx" ON "portal_patient_settings"("org_id", "patient_id");

-- CreateIndex
CREATE INDEX "portal_privacy_requests_org_id_patient_id_request_type_status_idx" ON "portal_privacy_requests"("org_id", "patient_id", "request_type", "status");

-- CreateIndex
CREATE INDEX "portal_privacy_requests_org_id_requested_at_idx" ON "portal_privacy_requests"("org_id", "requested_at");

-- AddForeignKey
ALTER TABLE "portal_patient_settings" ADD CONSTRAINT "portal_patient_settings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portal_privacy_requests" ADD CONSTRAINT "portal_privacy_requests_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

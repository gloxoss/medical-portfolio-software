/*
  Warnings:

  - A unique constraint covering the columns `[cmi_transaction_id]` on the table `invoices` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'CMI';

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "cmi_auth_code" TEXT,
ADD COLUMN     "cmi_transaction_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "invoices_cmi_transaction_id_key" ON "invoices"("cmi_transaction_id");

-- RenameIndex
ALTER INDEX "portal_privacy_requests_org_id_patient_id_request_type_status_i" RENAME TO "portal_privacy_requests_org_id_patient_id_request_type_stat_idx";

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('PENDING', 'COLLECTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "encounter_id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "ordered_by" TEXT NOT NULL,
    "panel_code" TEXT NOT NULL,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'PENDING',
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resulted_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lab_orders_org_id_patient_id_ordered_at_idx" ON "lab_orders"("org_id", "patient_id", "ordered_at");

-- CreateIndex
CREATE INDEX "lab_orders_org_id_encounter_id_ordered_at_idx" ON "lab_orders"("org_id", "encounter_id", "ordered_at");

-- CreateIndex
CREATE INDEX "lab_orders_org_id_facility_id_status_idx" ON "lab_orders"("org_id", "facility_id", "status");

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_ordered_by_fkey" FOREIGN KEY ("ordered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

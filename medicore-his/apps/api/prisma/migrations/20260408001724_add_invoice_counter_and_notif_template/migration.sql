-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "invoice_counter" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'sms',
    "language" TEXT NOT NULL DEFAULT 'fr',
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

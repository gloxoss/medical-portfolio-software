const fs = require('fs');
const path = 'c:/Users/zakio/Desktop/Work/Medical Portfolio Software Fetching and hooking/medicore-his/apps/api/prisma/schema.prisma';
const add = `
// ─── Service ──────────────────────────────────────────────────────────────────
model Service {
  id          String   @id @default(cuid())
  orgId       String   @map("org_id")
  name        String
  price       Decimal  @db.Decimal(10, 2)
  currency    String   @default("MAD")
  category    String?
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  org         Organization  @relation(fields: [orgId], references: [id], onDelete: Cascade)
  invoiceItems InvoiceItem[]

  @@map("services")
}

// ─── TaxConfig ────────────────────────────────────────────────────────────────
model TaxConfig {
  id          String   @id @default(cuid())
  orgId       String   @map("org_id")
  name        String
  rate        Decimal  @db.Decimal(5, 4)
  inclusive   Boolean  @default(false)
  isDefault   Boolean  @default(false) @map("is_default")

  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("tax_configs")
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
model Invoice {
  id                    String        @id @default(cuid())
  orgId                 String        @map("org_id")
  facilityId            String        @map("facility_id")
  patientId             String        @map("patient_id")
  encounterId           String?       @map("encounter_id")
  invoiceNo             String        @unique @map("invoice_no")
  status                InvoiceStatus @default(DRAFT)
  subtotal              Decimal       @default(0) @db.Decimal(10, 2)
  taxAmount             Decimal       @default(0) @map("tax_amount") @db.Decimal(10, 2)
  discount              Decimal       @default(0) @db.Decimal(10, 2)
  total                 Decimal       @default(0) @db.Decimal(10, 2)
  currency              String        @default("MAD")
  stripePaymentIntentId String?       @unique @map("stripe_payment_intent_id")
  paidAt                DateTime?     @map("paid_at")
  createdBy             String        @map("created_by")
  createdAt             DateTime      @default(now()) @map("created_at")
  updatedAt             DateTime      @updatedAt @map("updated_at")

  items    InvoiceItem[]
  payments Payment[]
  org      Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  facility Facility     @relation(fields: [facilityId], references: [id], onDelete: Cascade)
  creator  User         @relation("InvoiceCreator", fields: [createdBy], references: [id])

  @@map("invoices")
}

// ─── InvoiceItem ──────────────────────────────────────────────────────────────
model InvoiceItem {
  id          String   @id @default(cuid())
  invoiceId   String   @map("invoice_id")
  serviceId   String?  @map("service_id")
  description String
  quantity    Int      @default(1)
  unitPrice   Decimal  @map("unit_price") @db.Decimal(10, 2)
  total       Decimal  @db.Decimal(10, 2)

  invoice Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  service Service? @relation(fields: [serviceId], references: [id], onDelete: SetNull)

  @@map("invoice_items")
}

// ─── Payment ──────────────────────────────────────────────────────────────────
model Payment {
  id        String        @id @default(cuid())
  invoiceId String        @map("invoice_id")
  amount    Decimal       @db.Decimal(10, 2)
  method    PaymentMethod
  createdAt DateTime      @default(now()) @map("created_at")

  invoice Invoice @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  @@map("payments")
}

enum InvoiceStatus {
  DRAFT
  SENT
  PAID
  OVERDUE
  VOID
}

enum PaymentMethod {
  CASH
  STRIPE
  BANK_TRANSFER
  INSURANCE
}
`;
fs.appendFileSync(path, add);

const fs = require('fs');
const path = 'c:/Users/zakio/Desktop/Work/Medical Portfolio Software Fetching and hooking/medicore-his/apps/api/prisma/schema.prisma';
const add = `
// ─── NotificationTemplate ─────────────────────────────────────────────────────
model NotificationTemplate {
  id          String   @id @default(cuid())
  orgId       String   @map("org_id")
  event       String
  channel     String   @default("sms") // "sms" | "email"
  language    String   @default("fr")
  subject     String?
  body        String // Jinja2 template
  isActive    Boolean  @default(true) @map("is_active")
  createdAt   DateTime @default(now()) @map("created_at")

  org         Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@map("notification_templates")
}
`;
fs.appendFileSync(path, add);
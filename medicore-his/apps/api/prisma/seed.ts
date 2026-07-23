/**
 * MediCore HIS — Database Seed
 * Run: pnpm db:seed (from medicore-his root) or `npx prisma db seed` in apps/api
 *
 * Creates:
 *   - 1 Demo Organization (Cabinet Dr. El Amrani, Casablanca)
 *   - 1 Facility (Ain Diab Clinic)
 *   - 1 Super Admin user  (admin@medicore.ma / Admin1234!)
 *   - 1 ORG_ADMIN role assignment for the super admin
 *   - 1 Doctor user       (doctor@medicore.ma / Doctor1234!)
 *   - 1 Receptionist user (receptionist@medicore.ma / Recept1234!)
 */

import { PrismaClient, FacilityRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';

const prisma = new PrismaClient();
const BCRYPT_ROUNDS = 12;
const SEEDED_INVOICE_PREFIX = 'INV-2026-';

async function main(): Promise<void> {
  console.log('🌱 Seeding MediCore HIS database...');

  // Connect to MongoDB
  const mongoUri = process.env.MONGODB_URI ?? 'mongodb://medicore:medicore@localhost:27017/medicore_dev?authSource=admin';
  await mongoose.connect(mongoUri);
  console.log('📦 Connected to MongoDB');

  // Wipe MongoDB collections
  await mongoose.connection.collection('patients').deleteMany({});
  await mongoose.connection.collection('encounters').deleteMany({});
  await mongoose.connection.collection('audit_logs').deleteMany({});

  // ─── Organization ─────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'cabinet-el-amrani' },
    update: {},
    create: {
      name: 'Cabinet Dr. El Amrani',
      slug: 'cabinet-el-amrani',
      mrnPrefix: 'CEA',
      mrnCounter: 0,
      plan: 'CLINIC',
      status: 'ACTIVE',
      settings: {
        timezone: 'Africa/Casablanca',
        currency: 'MAD',
        language: 'fr',
        sessionTimeoutSeconds: 3600,
      },
    },
  });

  console.log(`✅ Organization: ${org.name} (${org.id})`);

  // ─── Facility ─────────────────────────────────────────────────────────────
  const facility = await prisma.facility.upsert({
    where: { id: 'seed-facility-001' },
    update: {},
    create: {
      id: 'seed-facility-001',
      orgId: org.id,
      name: 'Ain Diab Clinic',
      address: {
        line1: '123 Boulevard de la Corniche',
        city: 'Casablanca',
        region: 'Casablanca-Settat',
        postalCode: '20000',
        country: 'MA',
      },
      phone: '+212522123456',
      email: 'aindiab@medicore.ma',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Facility: ${facility.name} (${facility.id})`);

  // ─── Super Admin ──────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin1234!', BCRYPT_ROUNDS);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@medicore.ma' },
    update: {},
    create: {
      email: 'admin@medicore.ma',
      passwordHash: adminHash,
      orgId: org.id,
      nameFirst: 'Oussama',
      nameLast: 'Zaki',
      isSuperAdmin: true,
      status: 'ACTIVE',
      doctorSpecialties: [],
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: admin.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: admin.id,
      facilityId: facility.id,
      role: FacilityRole.ORG_ADMIN,
      isActive: true,
    },
  });

  console.log(`✅ Super Admin: ${admin.email} (Admin1234!)`);

  // ─── Doctor ───────────────────────────────────────────────────────────────
  const doctorHash = await bcrypt.hash('Doctor1234!', BCRYPT_ROUNDS);
  const doctor = await prisma.user.upsert({
    where: { email: 'doctor@medicore.ma' },
    update: {},
    create: {
      email: 'doctor@medicore.ma',
      passwordHash: doctorHash,
      orgId: org.id,
      nameFirst: 'Karim',
      nameLast: 'El Amrani',
      isSuperAdmin: false,
      status: 'ACTIVE',
      doctorSpecialties: ['General Medicine', 'Internal Medicine'],
      doctorLicenseNo: 'MED-2018-04521',
      doctorConsultFee: 200,
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: doctor.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: doctor.id,
      facilityId: facility.id,
      role: FacilityRole.DOCTOR,
      isActive: true,
    },
  });

  console.log(`✅ Doctor: ${doctor.email} (Doctor1234!)`);

  // ─── Receptionist ─────────────────────────────────────────────────────────
  const receptHash = await bcrypt.hash('Recept1234!', BCRYPT_ROUNDS);
  const receptionist = await prisma.user.upsert({
    where: { email: 'receptionist@medicore.ma' },
    update: {},
    create: {
      email: 'receptionist@medicore.ma',
      passwordHash: receptHash,
      orgId: org.id,
      nameFirst: 'Fatima',
      nameLast: 'Benali',
      isSuperAdmin: false,
      status: 'ACTIVE',
      doctorSpecialties: [],
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: receptionist.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: receptionist.id,
      facilityId: facility.id,
      role: FacilityRole.RECEPTIONIST,
      isActive: true,
    },
  });

  console.log(`✅ Receptionist: ${receptionist.email} (Recept1234!)`);

  // ─── Pharmacist ───────────────────────────────────────────────────────────
  const pharmaHash = await bcrypt.hash('Pharma1234!', BCRYPT_ROUNDS);
  const pharmacist = await prisma.user.upsert({
    where: { email: 'pharmacist@medicore.ma' },
    update: {},
    create: {
      email: 'pharmacist@medicore.ma',
      passwordHash: pharmaHash,
      orgId: org.id,
      nameFirst: 'Youssef',
      nameLast: 'Alami',
      isSuperAdmin: false,
      status: 'ACTIVE',
      doctorSpecialties: [],
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: pharmacist.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: pharmacist.id,
      facilityId: facility.id,
      role: FacilityRole.PHARMACIST,
      isActive: true,
    },
  });

  console.log(`✅ Pharmacist: ${pharmacist.email} (Pharma1234!)`);

  // ─── Nurse ────────────────────────────────────────────────────────────────
  const nurseHash = await bcrypt.hash('Nurse1234!', BCRYPT_ROUNDS);
  const nurse = await prisma.user.upsert({
    where: { email: 'nurse@medicore.ma' },
    update: {},
    create: {
      email: 'nurse@medicore.ma',
      passwordHash: nurseHash,
      orgId: org.id,
      nameFirst: 'Laila',
      nameLast: 'Tazi',
      isSuperAdmin: false,
      status: 'ACTIVE',
      doctorSpecialties: [],
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: nurse.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: nurse.id,
      facilityId: facility.id,
      role: FacilityRole.NURSE,
      isActive: true,
    },
  });

  console.log(`✅ Nurse: ${nurse.email} (Nurse1234!)`);

  // ─── Lab Technician ───────────────────────────────────────────────────────
  const labTechHash = await bcrypt.hash('Labtech1234!', BCRYPT_ROUNDS);
  const labTech = await prisma.user.upsert({
    where: { email: 'labtech@medicore.ma' },
    update: {},
    create: {
      email: 'labtech@medicore.ma',
      passwordHash: labTechHash,
      orgId: org.id,
      nameFirst: 'Adnane',
      nameLast: 'Fassi',
      isSuperAdmin: false,
      status: 'ACTIVE',
      doctorSpecialties: [],
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: labTech.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: labTech.id,
      facilityId: facility.id,
      role: FacilityRole.LAB_TECH,
      isActive: true,
    },
  });

  console.log(`✅ Lab Tech: ${labTech.email} (Labtech1234!)`);

  // ─── Accountant ───────────────────────────────────────────────────────────
  const accountantHash = await bcrypt.hash('Account1234!', BCRYPT_ROUNDS);
  const accountant = await prisma.user.upsert({
    where: { email: 'accountant@medicore.ma' },
    update: {},
    create: {
      email: 'accountant@medicore.ma',
      passwordHash: accountantHash,
      orgId: org.id,
      nameFirst: 'Samir',
      nameLast: 'Jaziri',
      isSuperAdmin: false,
      status: 'ACTIVE',
      doctorSpecialties: [],
    },
  });

  await prisma.userFacilityRole.upsert({
    where: { userId_facilityId: { userId: accountant.id, facilityId: facility.id } },
    update: {},
    create: {
      userId: accountant.id,
      facilityId: facility.id,
      role: FacilityRole.ACCOUNTANT,
      isActive: true,
    },
  });

  console.log(`✅ Accountant: ${accountant.email} (Account1234!)`);

  // ─── Tax Config ───────────────────────────────────────────────────────────
  const tax = await prisma.taxConfig.create({
    data: {
      orgId: org.id,
      name: 'TVA Standard',
      rate: 0.2000,
      inclusive: false,
      isDefault: true,
    },
  });

  // ─── Services Catalog ─────────────────────────────────────────────────────
  const service1 = await prisma.service.create({
    data: { orgId: org.id, name: 'Consultation Générale', price: 200, category: 'Consultation' },
  });
  const service2 = await prisma.service.create({
    data: { orgId: org.id, name: 'Échographie Abdominale', price: 450, category: 'Imagerie' },
  });
  const service3 = await prisma.service.create({
    data: { orgId: org.id, name: 'Bilan Sanguin Complet', price: 350, category: 'Laboratoire' },
  });

  // ─── Mongo Patients ───────────────────────────────────────────────────────
  const patientsCollection = mongoose.connection.collection('patients');
  const patientIds = [];
  
  for (let i = 1; i <= 5; i++) {
    const pId = new mongoose.Types.ObjectId();
    patientIds.push(pId.toString());
    await patientsCollection.insertOne({
      _id: pId,
      org_id: org.id,
      mrn: `CEA-2026-${String(i).padStart(5, '0')}`,
      name: { first: `Patient${i}`, last: `Test${i}`, display: `Patient${i} Test${i}` },
      gender: i % 2 === 0 ? 'female' : 'male',
      phone: `+21260000000${i}`,
      status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });
  }
  console.log(`✅ Seeded 5 MongoDB Patients`);

  // ─── Invoices & Payments ──────────────────────────────────────────────────
  // Keep seed rerunnable by clearing previously generated seed invoices.
  await prisma.invoice.deleteMany({
    where: {
      orgId: org.id,
      invoiceNo: { startsWith: SEEDED_INVOICE_PREFIX },
    },
  });

  let invoiceCounter = 0;
  
  // Create 15 invoices spread over the last 30 days to populate the chart
  for (let i = 0; i < 15; i++) {
    invoiceCounter++;
    const invDate = new Date();
    invDate.setDate(invDate.getDate() - Math.floor(Math.random() * 30));

    const isPaid = Math.random() > 0.3; // 70% paid
    const s1 = Math.random() > 0.5 ? service1 : service2;
    const s2 = Math.random() > 0.8 ? service3 : null;

    let subtotal = Number(s1.price);
    if (s2) subtotal += Number(s2.price);
    
    const taxAmount = subtotal * 0.20;
    const total = subtotal + taxAmount;

    const itemsData = [
      { description: s1.name, quantity: 1, unitPrice: s1.price, total: s1.price, serviceId: s1.id }
    ];
    if (s2) itemsData.push({ description: s2.name, quantity: 1, unitPrice: s2.price, total: s2.price, serviceId: s2.id });

    await prisma.invoice.create({
      data: {
        orgId: org.id,
        facilityId: facility.id,
        patientId: patientIds[i % patientIds.length],
        invoiceNo: `${SEEDED_INVOICE_PREFIX}${String(invoiceCounter).padStart(5, '0')}`,
        status: isPaid ? 'PAID' : 'DRAFT',
        subtotal,
        taxAmount,
        discount: 0,
        total,
        currency: 'MAD',
        createdBy: receptionist.id,
        createdAt: invDate,
        paidAt: isPaid ? invDate : null,
        items: {
          create: itemsData
        },
        payments: isPaid ? {
          create: [
            { amount: total, method: 'CASH', createdAt: invDate }
          ]
        } : undefined
      }
    });
  }
  console.log(`✅ Seeded 15 Invoices (with historical dates)`);

  console.log('\n🎉 Seed complete. Test credentials:');
  console.log('  Super Admin:   admin@medicore.ma / Admin1234!');
  console.log('  Doctor:        doctor@medicore.ma / Doctor1234!');
  console.log('  Receptionist:  receptionist@medicore.ma / Recept1234!');
  console.log('  Pharmacist:    pharmacist@medicore.ma / Pharma1234!');
  console.log('  Nurse:         nurse@medicore.ma / Nurse1234!');
  console.log('  Lab Tech:      labtech@medicore.ma / Labtech1234!');
  console.log('  Accountant:    accountant@medicore.ma / Account1234!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await mongoose.disconnect();
  });

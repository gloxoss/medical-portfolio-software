import { PrismaClient } from '@prisma/client';
import * as mongoose from 'mongoose';

const prisma = new PrismaClient();

async function main() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://medicore:medicore@localhost:27017/medicore_dev?authSource=admin';
  await mongoose.connect(mongoUri);
  
  // Get all patients from Mongo
  const patientsCollection = mongoose.connection.collection('patients');
  const patients = await patientsCollection.find({}).toArray();
  
  // Get encounters from Mongo
  const encountersCollection = mongoose.connection.collection('encounters');
  const encounters = await encountersCollection.find({}).toArray();

  console.log('=== DOCTOR DIRECT LINKS ===');
  console.log('\n--- Patients (EHR & Timeline) ---');
  patients.forEach(p => {
    console.log(`• Patient: ${p.name.first} ${p.name.last} (MRN: ${p.mrn}) (Phone: ${p.phone})`);
    console.log(`  Path: /patients/${p._id}`);
    console.log(`  Full URL: http://localhost:3000/patients/${p._id}`);
  });

  if (encounters.length > 0) {
    console.log('\n--- Encounters (Soap notes & prescriptions) ---');
    encounters.forEach(e => {
      console.log(`• Encounter for Patient ID: ${e.patient_id} (Date: ${e.visit_date})`);
      console.log(`  Path: /encounters/${e._id}`);
      console.log(`  Full URL: http://localhost:3000/encounters/${e._id}`);
    });
  } else {
    console.log('\n(No encounters are seeded by default; they are created when a doctor starts a consultation)');
  }

  await mongoose.disconnect();
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });

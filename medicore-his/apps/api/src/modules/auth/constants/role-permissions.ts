import { FacilityRole } from '@prisma/client';
import type { Permission } from '@medicore/shared-types';

// Permissions granted to each role. Additive — ORG_ADMIN gets everything.
// Keep in sync with packages/shared-types/src/index.ts Permission type.
export const ROLE_PERMISSIONS: Record<FacilityRole, Permission[]> = {
  ORG_ADMIN: [
    'patient.read', 'patient.write', 'patient.delete',
    'encounter.read', 'encounter.write', 'encounter.sign',
    'appointment.read', 'appointment.write', 'appointment.cancel',
    'billing.read', 'billing.write', 'billing.refund',
    'prescription.read', 'prescription.write', 'prescription.dispense',
    'lab.read', 'lab.write', 'lab.result',
    'radiology.read', 'radiology.write',
    'inventory.read', 'inventory.write',
    'report.read',
    'settings.read', 'settings.write',
    'user.read', 'user.write',
    'ai.read',
  ],

  FACILITY_ADMIN: [
    'patient.read', 'patient.write', 'patient.delete',
    'encounter.read', 'encounter.write', 'encounter.sign',
    'appointment.read', 'appointment.write', 'appointment.cancel',
    'billing.read', 'billing.write', 'billing.refund',
    'prescription.read', 'prescription.write', 'prescription.dispense',
    'lab.read', 'lab.write', 'lab.result',
    'radiology.read', 'radiology.write',
    'inventory.read', 'inventory.write',
    'report.read',
    'settings.read', 'settings.write',
    'user.read', 'user.write',
    'ai.read',
  ],

  DOCTOR: [
    'patient.read', 'patient.write',
    'encounter.read', 'encounter.write', 'encounter.sign',
    'appointment.read', 'appointment.write',
    'prescription.read', 'prescription.write',
    'lab.read', 'lab.write',
    'radiology.read', 'radiology.write',
    'billing.read',
    'report.read',
    'ai.read',
  ],

  NURSE: [
    'patient.read',
    'encounter.read', 'encounter.write',
    'appointment.read', 'appointment.write',
    'prescription.read',
    'lab.read', 'lab.write',
    'radiology.read',
  ],

  RECEPTIONIST: [
    'patient.read', 'patient.write',
    'appointment.read', 'appointment.write', 'appointment.cancel',
    'billing.read',
  ],

  LAB_TECH: [
    'patient.read',
    'lab.read', 'lab.write', 'lab.result',
  ],

  RADIOLOGIST: [
    'patient.read',
    'radiology.read', 'radiology.write',
  ],

  PHARMACIST: [
    'patient.read',
    'prescription.read', 'prescription.dispense',
    'inventory.read', 'inventory.write',
  ],

  ACCOUNTANT: [
    'billing.read', 'billing.write', 'billing.refund',
    'report.read',
  ],
};

// ─── MediCore HIS — Shared Types ────────────────────────────────────────────
// Imported by both apps/web and apps/api. Keep this pure TypeScript — no
// runtime logic, no framework imports.

export * from './lab';

// ─── Generic API Envelope ────────────────────────────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedRequest {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─── Tenant Context ───────────────────────────────────────────────────────────
// Every authenticated request carries org + facility scope. Derived from JWT —
// NEVER accepted from request body.
export interface TenantContext {
  orgId: string;
  facilityId: string;
  userId: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  facilities: UserFacility[];
}

export interface UserFacility {
  facilityId: string;
  facilityName: string;
  orgId: string;
  role: UserRole;
  permissions: Permission[];
}

export type UserRole =
  | 'SUPER_ADMIN'
  | 'ORG_ADMIN'
  | 'FACILITY_ADMIN'
  | 'DOCTOR'
  | 'NURSE'
  | 'RECEPTIONIST'
  | 'PHARMACIST'
  | 'LAB_TECHNICIAN'
  | 'RADIOLOGIST'
  | 'CASHIER'
  | 'PATIENT';

export type Permission =
  | 'patient.read'
  | 'patient.write'
  | 'patient.delete'
  | 'encounter.read'
  | 'encounter.write'
  | 'encounter.sign'
  | 'appointment.read'
  | 'appointment.write'
  | 'appointment.cancel'
  | 'billing.read'
  | 'billing.write'
  | 'billing.refund'
  | 'prescription.read'
  | 'prescription.write'
  | 'prescription.dispense'
  | 'lab.read'
  | 'lab.write'
  | 'lab.result'
  | 'radiology.read'
  | 'radiology.write'
  | 'inventory.read'
  | 'inventory.write'
  | 'report.read'
  | 'settings.read'
  | 'settings.write'
  | 'user.read'
  | 'user.write'
  | 'audit.read'
  | 'ai.read';  // AI clinical context — doctors and admins only

// ─── Organization / Tenant ────────────────────────────────────────────────────
export interface Organization {
  id: string;
  name: string;
  prefix: string; // used in MRN: "CEA-2026-00001"
  country: string;
  timezone: string;
  currency: string;
  logoUrl?: string;
  createdAt: string; // ISO 8601
}

export interface Facility {
  id: string;
  orgId: string;
  name: string;
  type: FacilityType;
  address: string;
  phone: string;
  email?: string;
  isActive: boolean;
  createdAt: string;
}

export type FacilityType =
  | 'HOSPITAL'
  | 'CLINIC'
  | 'DIAGNOSTIC_CENTER'
  | 'PHARMACY'
  | 'LABORATORY';

// ─── Patient ─────────────────────────────────────────────────────────────────
export interface Patient {
  id: string;
  mrn: string; // auto-generated, e.g. "CEA-2026-00001"
  firstName: string;
  lastName: string;
  dateOfBirth: string; // ISO date "YYYY-MM-DD"
  gender: Gender;
  bloodGroup?: BloodGroup;
  phone: string;
  email?: string;
  address?: PatientAddress;
  allergies: Allergy[];
  emergencyContact?: EmergencyContact;
  orgId: string;
  facilityId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Gender = 'male' | 'female' | 'other';

export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export interface PatientAddress {
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  country: string;
}

export interface Allergy {
  id: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  recordedAt: string;
}

export type AllergySeverity = 'mild' | 'moderate' | 'severe' | 'life-threatening';

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

// ─── Appointment ─────────────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  facilityId: string;
  orgId: string;
  scheduledAt: string; // ISO 8601
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  chiefComplaint?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'PROCEDURE' | 'LAB' | 'RADIOLOGY' | 'TELEMEDICINE';

export type AppointmentStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

// ─── Encounter / Clinical ─────────────────────────────────────────────────────
export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  facilityId: string;
  orgId: string;
  appointmentId?: string;
  type: EncounterType;
  status: EncounterStatus;
  chiefComplaint: string;
  soap?: SoapNote;
  diagnoses: Diagnosis[];
  orders: Order[];
  startedAt: string;
  completedAt?: string;
  signedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type EncounterType = 'OUTPATIENT' | 'INPATIENT' | 'EMERGENCY' | 'TELEMEDICINE';

export type EncounterStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED' | 'AMENDED';

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  lastSavedAt?: string;
}

export interface Diagnosis {
  id: string;
  icd10Code: string;
  description: string;
  type: 'PRIMARY' | 'SECONDARY' | 'DIFFERENTIAL';
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  recordedAt: string;
}

export interface Order {
  id: string;
  type: OrderType;
  status: OrderStatus;
  description: string;
  notes?: string;
  orderedAt: string;
}

export type OrderType = 'LAB' | 'RADIOLOGY' | 'PRESCRIPTION' | 'REFERRAL' | 'PROCEDURE';

export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// ─── Billing ─────────────────────────────────────────────────────────────────
export interface Invoice {
  id: string;
  invoiceNo: string;
  patientId: string;
  encounterId?: string;
  facilityId: string;
  orgId: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'PARTIAL' | 'CANCELLED' | 'REFUNDED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  total: number;
}

// ─── Health check ─────────────────────────────────────────────────────────────
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  version?: string;
  services?: Record<string, 'ok' | 'down'>;
}

// ─── Patient Portal ───────────────────────────────────────────────────────────

export interface PatientPortalUser {
  id: string;
  mrn: string;
  orgId: string;
  name: { first: string; last: string; display: string };
  phone: string;
  email?: string;
  gender: string;
  dob?: string;
  bloodType?: string;
  allergies: Array<{
    substance: string;
    type: string;
    severity: string;
    reaction?: string;
  }>;
  problemList: Array<{
    condition: string;
    icdCode?: string;
    status: string;
    onsetAt: string;
  }>;
}

export interface PortalAppointment {
  id: string;
  facilityId: string;
  facilityName: string;
  doctorId: string;
  doctorName: string;
  startsAt: string;
  endsAt: string;
  type?: string;
  status: string;
  notes?: string;
}

export interface PortalFacilityOption {
  id: string;
  name: string;
}

export interface PortalDoctorOption {
  id: string;
  name: string;
  specialties: string[];
}

export interface PortalAvailabilitySlot {
  start_time: string;
  end_time: string;
  available: boolean;
}

export type TelemedicineSessionStatus =
  | 'created'
  | 'waiting'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface TelemedicineSessionSummary {
  session_id: string;
  appointment_id: string;
  encounter_id: string | null;
  room_url: string;
  status: TelemedicineSessionStatus;
  recording_enabled: boolean;
  scheduled_start_at: string;
  started_at: string | null;
  ended_at: string | null;
  duration_minutes: number | null;
  doctor_joined: boolean;
  patient_joined: boolean;
  doctor_joined_at: string | null;
  patient_joined_at: string | null;
}

export interface TelemedicineDoctorJoinResponse extends TelemedicineSessionSummary {
  doctor_token: string;
}

export interface TelemedicinePatientJoinResponse extends TelemedicineSessionSummary {
  patient_token: string;
}

export interface PortalInvoice {
  id: string;
  invoiceNo: string;
  status: string;
  total: number;
  subtotal: number;
  taxAmount: number;
  currency: string;
  createdAt: string;
  paidAt?: string;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export interface PortalEncounter {
  id: string;
  facilityId: string;
  facilityName?: string;
  doctorId: string;
  doctorName?: string;
  startedAt: string;
  status: string;
  chiefComplaint?: string;
  diagnoses: Array<{ code: string; description: string }>;
}

export interface PortalSettings {
  sms_notifications: boolean;
  email_notifications: boolean;
  ai_consent: boolean;
}

export interface PortalSettingsUpdateInput {
  sms_notifications?: boolean;
  email_notifications?: boolean;
  ai_consent?: boolean;
}

export interface PortalPrivacyRequestAccepted {
  status: 'queued';
  request_id: string;
  request_type: 'data_export' | 'delete_account';
  message: string;
}

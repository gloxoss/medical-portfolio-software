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
export interface TenantContext {
    orgId: string;
    facilityId: string;
    userId: string;
}
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
export type UserRole = 'SUPER_ADMIN' | 'FACILITY_ADMIN' | 'DOCTOR' | 'NURSE' | 'RECEPTIONIST' | 'PHARMACIST' | 'LAB_TECHNICIAN' | 'RADIOLOGIST' | 'CASHIER' | 'PATIENT';
export type Permission = 'patient.read' | 'patient.write' | 'patient.delete' | 'encounter.read' | 'encounter.write' | 'encounter.sign' | 'appointment.read' | 'appointment.write' | 'appointment.cancel' | 'billing.read' | 'billing.write' | 'billing.refund' | 'prescription.read' | 'prescription.write' | 'prescription.dispense' | 'lab.read' | 'lab.write' | 'lab.result' | 'radiology.read' | 'radiology.write' | 'inventory.read' | 'inventory.write' | 'report.read' | 'settings.read' | 'settings.write' | 'user.read' | 'user.write';
export interface Organization {
    id: string;
    name: string;
    prefix: string;
    country: string;
    timezone: string;
    currency: string;
    logoUrl?: string;
    createdAt: string;
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
export type FacilityType = 'HOSPITAL' | 'CLINIC' | 'DIAGNOSTIC_CENTER' | 'PHARMACY' | 'LABORATORY';
export interface Patient {
    id: string;
    mrn: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
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
export interface Appointment {
    id: string;
    patientId: string;
    doctorId: string;
    facilityId: string;
    orgId: string;
    scheduledAt: string;
    durationMinutes: number;
    type: AppointmentType;
    status: AppointmentStatus;
    chiefComplaint?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
export type AppointmentType = 'CONSULTATION' | 'FOLLOW_UP' | 'PROCEDURE' | 'LAB' | 'RADIOLOGY';
export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'CHECKED_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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
export interface Invoice {
    id: string;
    invoiceNumber: string;
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
export interface HealthCheckResponse {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    version?: string;
    services?: Record<string, 'ok' | 'down'>;
}

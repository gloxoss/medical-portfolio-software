// ─── Lab Module Shared Contracts ─────────────────────────────────────────────

export type LabStatus =
  | 'pending'
  | 'collected'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type LabFlag = 'normal' | 'low' | 'high' | 'critical';

export interface LabComponent {
  name: string;
  value: number | string;
  unit: string;
  refRangeLow?: number;
  refRangeHigh?: number;
  flag: LabFlag;
}

export interface LabOrder {
  id: string;
  patientId: string;
  encounterId: string;
  orgId: string;
  facilityId: string;
  orderedBy: string;
  panelCode: string;
  status: LabStatus;
  orderedAt: string;
  resultedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LabResult {
  id: string;
  orderId: string;
  patientId: string;
  encounterId?: string;
  panelCode: string;
  components: LabComponent[];
  freetextNote?: string;
  resultedBy: string;
  resultedAt: string;
  orgId: string;
  facilityId: string;
}

export interface PlaceLabOrderDto {
  patientId: string;
  encounterId: string;
  panelCode: string;
  notes?: string;
}

export interface ListLabOrdersQuery {
  patientId?: string;
  encounterId?: string;
  status?: LabStatus;
}

export interface UpdateLabOrderStatusDto {
  status: LabStatus;
}

export interface RecordLabResultDto {
  components: LabComponent[];
  freetextNote?: string;
}
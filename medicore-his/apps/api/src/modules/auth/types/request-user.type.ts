// The object attached to req.user after JWT validation
export interface RequestUser {
  id: string;
  email: string;
  orgId: string;
  isSuperAdmin: boolean;
}

// JWT payload shape (what we sign)
export interface JwtPayload {
  sub: string;       // userId
  email: string;
  orgId: string;
  isSuperAdmin: boolean;
}

// ─── Patient Portal Types ─────────────────────────────────────────────────────

export interface PatientRequestUser {
  patientId: string;
  orgId: string;
  phone: string;
}

export interface PatientJwtPayload {
  sub: string;       // patientId
  orgId: string;
  phone: string;
  role: 'PATIENT';
}

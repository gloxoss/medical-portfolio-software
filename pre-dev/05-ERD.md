# Phase 5 — Entity Relationship Diagram

## MediCore HIS — ERD (Hybrid Database)

---

## PostgreSQL ERD

```mermaid
erDiagram
    Organization ||--o{ Facility : "has"
    Organization ||--o{ User : "employs"
    Organization ||--o{ Invoice : "owns"
    Organization ||--o{ Service : "catalogs"
    Organization ||--o{ TaxConfig : "configures"
    Organization ||--o{ NotificationTemplate : "templates"

    Facility ||--o{ UserFacilityRole : "assigns"
    Facility ||--o{ DoctorSchedule : "schedules"
    Facility ||--o{ Invoice : "generates"

    User ||--o{ UserFacilityRole : "has roles"
    User ||--o{ RefreshToken : "authenticates"
    User ||--o{ DoctorSchedule : "works"

    Invoice ||--o{ InvoiceItem : "contains"
    Invoice ||--o{ Payment : "receives"
    InvoiceItem }o--|| Service : "references"

    Organization {
        string id PK "cuid()"
        string name
        string slug UK
        string logo_url
        string mrn_prefix
        int mrn_counter
        enum plan "SOLO CLINIC HOSPITAL DIAGNOSTICS"
        enum status "ACTIVE TRIAL SUSPENDED CANCELLED"
        datetime trial_ends_at
        string stripe_customer_id UK
        string stripe_subscription_id UK
        json settings
    }

    Facility {
        string id PK "cuid()"
        string org_id FK
        string name
        json address
        string phone
        string email
        json settings
        enum status "ACTIVE INACTIVE"
    }

    User {
        string id PK "cuid()"
        string email UK
        string password_hash
        string org_id FK
        string name_first
        string name_last
        string phone
        boolean is_super_admin
        enum status "ACTIVE INACTIVE SUSPENDED"
        string[] doctor_specialties
        string doctor_license_no
        decimal doctor_consult_fee
    }

    UserFacilityRole {
        string id PK
        string user_id FK
        string facility_id FK
        enum role "ORG_ADMIN FACILITY_ADMIN DOCTOR NURSE RECEPTIONIST LAB_TECH RADIOLOGIST PHARMACIST ACCOUNTANT"
        boolean is_active
    }

    RefreshToken {
        string id PK
        string user_id FK
        string token_hash UK
        datetime expires_at
        boolean revoked
    }

    DoctorSchedule {
        string id PK
        string doctor_id FK
        string facility_id FK
        int day_of_week "0-6"
        string start_time
        string end_time
        int slot_minutes "default 15"
        json breaks
        boolean is_active
    }

    Service {
        string id PK
        string org_id FK
        string name
        decimal price
        string currency "default MAD"
        string category
        boolean is_active
    }

    TaxConfig {
        string id PK
        string org_id FK
        string name
        decimal rate
        boolean inclusive
        boolean is_default
    }

    Invoice {
        string id PK
        string org_id FK
        string facility_id FK
        string patient_id "Mongo ObjectId"
        string encounter_id "Mongo ObjectId"
        string invoice_no UK
        enum status "DRAFT SENT PAID OVERDUE VOID"
        decimal subtotal
        decimal tax_amount
        decimal discount
        decimal total
        string currency
        string stripe_payment_intent_id UK
        datetime paid_at
        string created_by "User.id"
    }

    InvoiceItem {
        string id PK
        string invoice_id FK
        string service_id FK
        string description
        int quantity
        decimal unit_price
        decimal total
    }

    Payment {
        string id PK
        string invoice_id FK
        decimal amount
        enum method "CASH STRIPE BANK_TRANSFER INSURANCE"
        enum status "PENDING COMPLETED FAILED REFUNDED"
        string reference
        datetime paid_at
        string created_by "User.id"
    }

    NotificationTemplate {
        string id PK
        string org_id FK
        string event
        string channel "sms email"
        string language "default fr"
        string subject
        string body "Jinja2 template"
        boolean is_active
    }

    AuditLog {
        string id PK
        string org_id
        string facility_id
        string user_id
        string action
        string entity_type
        string entity_id
        json changes
        string ip_address
        datetime created_at
    }
```

---

## MongoDB ERD

```mermaid
erDiagram
    Patient ||--o{ Encounter : "has visits"
    Patient ||--o{ Appointment : "books"
    Appointment ||--|| Encounter : "generates"

    Patient {
        ObjectId _id PK
        ObjectId org_id "tenant scope"
        string mrn UK "per org"
        object name "first last display"
        date dob
        string gender "male female other"
        string blood_type
        string phone
        string email
        string national_id
        object address
        object emergency_contact
        array allergies "substance type reaction severity"
        array problem_list "condition icd_code status"
        array documents "name type url uploaded_at"
        string status "active deceased transferred"
    }

    Appointment {
        ObjectId _id PK
        ObjectId org_id "tenant scope"
        ObjectId facility_id
        ObjectId patient_id FK
        string doctor_id "PG User.id"
        datetime start_time
        datetime end_time
        string type "consultation followup emergency"
        string status "booked confirmed checked_in in_progress completed cancelled no_show"
        string queue_token "T-042"
        string cancel_reason
        array status_history "status changed_at changed_by"
        string notes
    }

    Encounter {
        ObjectId _id PK
        ObjectId org_id "tenant scope"
        ObjectId facility_id
        ObjectId patient_id FK
        string doctor_id "PG User.id"
        ObjectId appointment_id FK UK
        date visit_date
        string status "draft in_progress signed_off archived"
        object vitals "bp hr temp weight height bmi spo2"
        object soap "subjective objective assessment plan"
        array diagnoses "icd_code description type"
        array prescriptions "drug_name form strength dosage frequency duration"
        array lab_orders "test_name ordered_at result_status"
        object ai_context "summary_shown differentials_shown feedback"
        string invoice_id "PG Invoice.id"
        datetime signed_off_at
        string signed_off_by "PG User.id"
    }
```

---

## Cross-Database References

| Source (DB) | Field | Target (DB) | Field | Type |
|-------------|-------|-------------|-------|------|
| Invoice (PG) | `patient_id` | Patient (Mongo) | `_id` | String reference (no foreign key) |
| Invoice (PG) | `encounter_id` | Encounter (Mongo) | `_id` | String reference |
| Encounter (Mongo) | `doctor_id` | User (PG) | `id` | String reference |
| Encounter (Mongo) | `invoice_id` | Invoice (PG) | `id` | String reference (set after billing event) |
| Appointment (Mongo) | `doctor_id` | User (PG) | `id` | String reference |
| Patient (Mongo) | `org_id` | Organization (PG) | `id` | ObjectId (cast from cuid) |

> **Note**: Cross-database references are **string-based, not enforced by a foreign key**. Application logic in the repository layer is responsible for ensuring referential integrity. The outbox pattern (see `02-database-strategy.md`) handles the critical Encounter → Invoice cross-DB write.

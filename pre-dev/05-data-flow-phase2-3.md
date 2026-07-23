# Phase 2 & 3 — Data Flow Diagrams

## MediCore HIS — Key Data Flows for Extended Modules

---

## 1. Patient Portal — OTP Login Flow

```mermaid
flowchart TD
    A["Patient enters phone number<br/>POST /portal/auth/otp/request"] --> B["NestJS: Validate phone format"]
    B --> C["Redis: SET otp:{phone} = 6-digit code<br/>TTL 10 minutes"]
    C --> D["Twilio: Send SMS<br/>'Your MediCore code is 123456'"]
    D --> E["Patient enters OTP code<br/>POST /portal/auth/otp/verify"]
    E --> F["Redis: GET otp:{phone}"]
    F --> G{"Code matches?"}
    G -->|No| H["401: Invalid code"]
    G -->|Yes| I{"Patient registered?"}
    I -->|Yes| J["MongoDB: Fetch patient by phone"]
    I -->|No| K["MongoDB: Create patient record<br/>(minimal: name + phone)"]
    K --> J
    J --> L["Issue JWT with role=PATIENT<br/>Payload: { sub: patient_id, org_id, role: PATIENT }"]
    L --> M["200: { access_token, patient }"]

    style C fill:#FF9800,color:#fff
    style L fill:#4CAF50,color:#fff
```

---

## 2. Lab Order → Result → Billing Flow

```mermaid
flowchart TD
    A["Doctor in encounter editor<br/>Clicks 'Order Lab'"] --> B["Searches lab catalog<br/>Selects: CBC + CRP"]
    B --> C["POST /encounters/:id/lab-orders<br/>{tests: ['CBC', 'CRP']}"]
    C --> D["MongoDB: Create LabOrder<br/>status: ordered"]
    D --> E["Redis: Publish<br/>lab.order.created"]
    E --> F["Lab tech sees order in /lab/queue"]

    F --> G["Lab tech: Specimen collection<br/>PATCH /lab/orders/:id/specimen<br/>{specimen_id: 'SPL-2026-00042'}"]
    G --> H["MongoDB: Update LabOrder<br/>status: specimen_collected"]

    H --> I["Lab tech: Enter results<br/>PUT /lab/orders/:id/results"]
    I --> J["System: Compare values to normal ranges<br/>Auto-flag abnormal"]
    J --> K["MongoDB: Update LabOrder<br/>status: completed<br/>results: [{...}]"]

    K --> L["Supervisor: Authorize<br/>POST /lab/orders/:id/authorize"]
    L --> M["MongoDB: Update LabOrder<br/>status: authorized<br/>authorized_by, authorized_at"]
    M --> N["Redis: Publish<br/>lab.result.authorized"]

    N --> O["Billing subscriber:<br/>Auto-add lab charges to invoice"]
    N --> P["Communication subscriber:<br/>Notify doctor of results"]
    N --> Q["Encounter subscriber:<br/>Attach results to encounter timeline"]

    style D fill:#4CAF50,color:#fff
    style J fill:#FF9800,color:#fff
    style O fill:#9C27B0,color:#fff
```

---

## 3. Pharmacy — Prescription to Dispensing Flow

```mermaid
flowchart TD
    A["Doctor signs off encounter<br/>Encounter has prescriptions"] --> B["Redis: Publish<br/>pharmacy.rx.received"]
    B --> C["Pharmacy subscriber:<br/>Create dispensing queue entry"]

    C --> D["Pharmacist opens /pharmacy/queue<br/>Sees pending Rx"]
    D --> E["Pharmacist clicks 'Dispense'"]
    E --> F["System: Check stock<br/>GET pharmacy inventory for drug + facility"]
    F --> G{"Sufficient stock?"}
    G -->|No| H["Alert: Insufficient stock<br/>Flag as 'Pending Restock'"]
    H --> I["Auto-suggest Purchase Order"]
    G -->|Yes| J["Pharmacist verifies:<br/>Drug, dose, patient allergies"]
    J --> K{"Allergy concern?"}
    K -->|Yes| L["Warning banner<br/>(same as encounter Rx check)"]
    K -->|No| M["Pharmacist confirms dispensing<br/>POST /pharmacy/dispense"]
    L -->|Override| M
    M --> N["MongoDB: Create DispensingLog"]
    N --> O["PG: Decrement PharmacyInventory.quantity"]
    O --> P["Redis: Publish<br/>pharmacy.dispensed"]
    P --> Q["Billing subscriber:<br/>Add dispensing charge to invoice"]
    P --> R["Check: quantity < reorder_level?"]
    R -->|Yes| S["Redis: Publish pharmacy.stock.low"]
    S --> T["Communication: Email admin"]

    style N fill:#4CAF50,color:#fff
    style O fill:#FF9800,color:#fff
```

---

## 4. IPD — Admission to Discharge Flow

```mermaid
flowchart TD
    A["Doctor or Receptionist<br/>POST /ipd/admit"] --> B["Check available beds<br/>PG: Beds WHERE status=AVAILABLE AND ward_id=X"]
    B --> C{"Beds available?"}
    C -->|No| D["422: No beds available in selected ward"]
    C -->|Yes| E["PG: Update Bed<br/>status → OCCUPIED<br/>current_admission_id set"]
    E --> F["MongoDB: Create Admission<br/>status: admitted"]
    F --> G["Redis: Publish ipd.patient.admitted"]
    G --> H["Billing subscriber:<br/>Start daily bed charge counter"]

    H --> I["Daily cron at midnight"]
    I --> J["For each active admission:<br/>Add 1 day bed charge to invoice"]
    J --> K["System: Auto-create/update invoice<br/>bed_charge × 1 day"]

    F --> L["Nursing station sees patient"]
    L --> M["Nurse records vitals<br/>PATCH /ipd/admissions/:id/vitals"]
    L --> N["Nurse administers medication<br/>PATCH /ipd/admissions/:id/medication"]

    F --> O["Doctor daily rounds<br/>POST /ipd/admissions/:id/round-notes"]
    O --> P["MongoDB: Append to round_notes[]"]

    P --> Q["Doctor decides: Discharge<br/>POST /ipd/admissions/:id/discharge"]
    Q --> R["Generate discharge summary<br/>(follow-up, medications, instructions)"]
    R --> S["MongoDB: Update Admission<br/>status → discharged<br/>discharge: {summary, discharged_at}"]
    S --> T["PG: Update Bed<br/>status → AVAILABLE<br/>current_admission_id → null"]
    T --> U["Redis: Publish ipd.patient.discharged"]
    U --> V["Billing subscriber:<br/>Finalize bed charges, add to total invoice"]
    U --> W["Communication:<br/>Send discharge instructions to patient"]

    style F fill:#4CAF50,color:#fff
    style T fill:#FF9800,color:#fff
```

---

## 5. Telemedicine — Video Consultation Flow

```mermaid
flowchart TD
    A["Appointment type = 'telemedicine'<br/>Appointment time approaches"] --> B["System: Create Daily.co room<br/>POST daily.co/v1/rooms"]
    B --> C["MongoDB: Create VideoSession<br/>room_url, status: created"]
    C --> D["Communication:<br/>SMS patient with join link<br/>Email doctor with session link"]

    D --> E["Patient opens /portal/telemedicine/:sessionId"]
    E --> F["Waiting room UI<br/>'Doctor will join shortly'"]

    D --> G["Doctor opens /clinical/telemedicine/:sessionId"]
    G --> H["Doctor joins room<br/>PATCH /telemedicine/sessions/:id/join"]
    H --> I["VideoSession status → in_progress"]
    I --> J["Both see video feed (Daily.co SDK)"]

    J --> K["Doctor has encounter sidebar<br/>Can record vitals, SOAP, diagnosis, Rx"]
    K --> L["Doctor ends call<br/>POST /telemedicine/sessions/:id/end"]
    L --> M["VideoSession status → completed<br/>duration_minutes calculated"]
    M --> N["Redis: Publish telemedicine.session.ended"]
    N --> O["Billing: Add telemedicine charge to invoice"]

    style C fill:#4CAF50,color:#fff
    style M fill:#FF9800,color:#fff
```

---

## 6. Triage Chatbot Flow

```mermaid
flowchart TD
    A["Patient opens /triage/[orgSlug]<br/>No auth required"] --> B["Select symptoms from list<br/>or free-text input"]
    B --> C["POST /triage/session<br/>{facility_id, symptoms[]}"]
    C --> D["MongoDB: Create TriageSession<br/>status: in_progress"]
    D --> E["AI Sidecar: Symptom analysis<br/>POST /ai/triage/assess"]
    E --> F["AI returns follow-up questions"]
    F --> G["Patient answers questions<br/>(2-3 rounds max)"]
    G --> H["AI determines urgency"]
    H --> I{"Urgency level?"}
    I -->|Red| J["🔴 URGENT: 'Go to ER immediately'<br/>Show nearest hospital"]
    I -->|Amber| K["🟡 SOON: 'Book appointment within 24h'<br/>→ Booking flow"]
    I -->|Green| L["🟢 ROUTINE: 'Book at your convenience'<br/>→ Booking flow"]
    K --> M["Triage data attached to appointment<br/>Doctor sees triage summary in encounter"]
    L --> M

    style H fill:#9C27B0,color:#fff
```

---

## 7. Workflow Automation Flow (Phase 3)

```mermaid
flowchart TD
    A["Any module publishes event<br/>e.g., encounter.signed_off"] --> B["Workflow Engine subscriber<br/>receives event"]
    B --> C["Query active workflows<br/>WHERE trigger_event = event_type AND org_id = event.org_id"]
    C --> D{"Matching workflows found?"}
    D -->|No| E["No action"]
    D -->|Yes| F["For each workflow:<br/>Evaluate conditions"]
    F --> G{"Conditions met?<br/>e.g., icd_code matches 'E11.*'"}
    G -->|No| H["Log: conditions not met"]
    G -->|Yes| I["Execute actions sequentially"]
    I --> J["Action 1: send_sms<br/>→ Communication module"]
    I --> K["Action 2: create_task<br/>→ Task system"]
    I --> L["Action 3: flag_patient<br/>→ Patients module"]
    J & K & L --> M["Log execution result<br/>MongoDB: WorkflowExecution"]
    M --> N["Redis: Publish<br/>workflow.action.executed"]
    N --> O["Audit log update"]

    style I fill:#4CAF50,color:#fff
```

---

## 8. Ambient Audio AI Flow (Phase 2)

```mermaid
flowchart TD
    A["Doctor opens encounter<br/>Clicks 'Record' 🎙️"] --> B["Browser: MediaRecorder API<br/>Captures audio stream"]
    B --> C["Audio chunks sent to backend<br/>WebSocket or chunked upload"]
    C --> D["FastAPI AI Sidecar:<br/>Receives audio chunks"]
    D --> E["Forward to Deepgram/Whisper<br/>Speech-to-text API"]
    E --> F["Transcription returned<br/>(streaming or batch)"]
    F --> G["AI: Process transcription<br/>Extract structured SOAP"]
    G --> H["Return SOAP draft to frontend<br/>{ subjective, objective, assessment, plan }"]
    H --> I["Doctor reviews SOAP<br/>(labeled 'AI transcription — verify')"]
    I --> J{"Accept or Edit?"}
    J -->|Accept| K["Save to encounter"]
    J -->|Edit| L["Doctor modifies → save"]

    A --> M["Audio file saved to R2<br/>(if recording consent = true)"]
    M --> N["Encounter: audio_url field updated"]

    style E fill:#9C27B0,color:#fff
    style G fill:#4CAF50,color:#fff
```

---

## 9. Internal Messaging Flow (Phase 2)

```mermaid
flowchart TD
    A["User opens /clinical/messaging"] --> B["Load conversations<br/>GET /messaging/conversations"]
    B --> C["Display conversation list<br/>with last message preview"]

    C --> D["User clicks conversation or 'New'"]
    D --> E["Load messages<br/>GET /messaging/conversations/:id/messages"]
    E --> F["Display message thread"]

    F --> G["User types message → Send"]
    G --> H["POST /messaging/conversations/:id/messages<br/>{content, patient_id?}"]
    H --> I["MongoDB: Create Message"]
    I --> J["WebSocket: Push to recipient(s)<br/>Real-time delivery"]
    J --> K["Recipient sees new message<br/>Badge count updates"]

    H --> L["Redis: Publish messaging.new_message"]
    L --> M["Push notification service<br/>(for mobile app — Phase 3)"]

    style I fill:#4CAF50,color:#fff
    style J fill:#FF9800,color:#fff
```

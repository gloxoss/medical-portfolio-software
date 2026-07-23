# Phase 2 & 3 — User Journey Maps

## MediCore HIS — Extended Journey Maps for New Personas

---

## 1. Patient (Fatima) — Portal Self-Service Journey

```mermaid
flowchart TD
    A["📱 Fatima receives SMS<br/>'Your portal is ready'"] --> B["Opens portal.medicore.app"]
    B --> C["Enters phone number"]
    C --> D["Receives OTP via SMS"]
    D --> E["Enters OTP → Logged in"]

    E --> F["🏠 Dashboard"]
    F --> G{"What does she need?"}

    G -->|View records| H["📋 My Records"]
    H --> I["Sees past visits list"]
    I --> J["Clicks visit → sees vitals, diagnosis, Rx"]
    J --> K["Downloads prescription PDF"]

    G -->|Book appointment| L["📅 Book Appointment"]
    L --> M["Selects facility"]
    M --> N["Selects Dr. Youssef"]
    N --> O["Picks available slot"]
    O --> P["Confirms booking"]
    P --> Q["✅ SMS confirmation received"]

    G -->|Pay bill| R["💰 My Invoices"]
    R --> S["Sees unpaid 500 MAD invoice"]
    S --> T["Clicks 'Pay Now'"]
    T --> U["Stripe payment form"]
    U --> V["Payment successful"]
    V --> W["✅ Receipt downloadable"]

    G -->|Cancel appointment| X["📅 My Appointments"]
    X --> Y["Clicks 'Cancel'"]
    Y --> Z["Provides optional reason"]
    Z --> AA["✅ Appointment cancelled<br/>Slot freed for others"]

    style E fill:#4CAF50,color:#fff
    style V fill:#4CAF50,color:#fff
```

**Touchpoints**: SMS, Web Portal, Stripe
**Pain Points Addressed**: No phone calls to clinic, no waiting, no cash-only constraints
**Emotions**: Empowered (self-service), Relieved (transparent billing), Confident (can see own records)

---

## 2. Lab Technician (Hassan) — Lab Order to Result Journey

```mermaid
flowchart TD
    A["🔬 Hassan opens /lab/queue<br/>Start of shift"] --> B["Sees pending orders<br/>3 new, 2 in-progress"]
    B --> C["Clicks first order:<br/>Patient Ahmed - CBC + CRP"]

    C --> D["Collects blood sample"]
    D --> E["Scans specimen tube<br/>Enters specimen ID: SPL-2026-00042"]
    E --> F["Clicks 'Specimen Collected'<br/>Status → specimen_collected"]

    F --> G["Runs tests on analyzer"]
    G --> H["Opens order detail"]
    H --> I["Enters results:<br/>WBC: 15,000 — FLAGGED ABNORMAL<br/>RBC: 4.8M — Normal<br/>CRP: 45 — FLAGGED ABNORMAL"]

    I --> J["Clicks 'Submit for Authorization'"]
    J --> K["Supervising Dr. Amina gets notification"]
    K --> L["Dr. Amina reviews results"]
    L --> M{"Approve?"}
    M -->|Yes| N["✅ Authorized<br/>Results → encounter timeline<br/>Charges → patient invoice"]
    M -->|Reject| O["❌ Re-do requested<br/>Notes: 'Rerun CRP, value seems too high'"]
    O --> G

    style I fill:#FF9800,color:#fff
    style N fill:#4CAF50,color:#fff
```

**Touchpoints**: Lab queue dashboard, specimen scanner, result entry form
**Pain Points Addressed**: No paper lab sheets, auto-abnormal flagging, authorized before visible to patient
**Emotions**: Efficient (structured workflow), Confident (abnormal flags catch errors)

---

## 3. Pharmacist (Nadia) — Dispensing Journey

```mermaid
flowchart TD
    A["💊 Nadia opens /pharmacy/queue<br/>New Rx from Dr. Youssef"] --> B["Sees prescription:<br/>Amoxicillin 500mg x 30<br/>Patient: Ahmed, Allergy: Penicillin"]

    B --> C["⚠️ ALERT: Patient allergic to Penicillin<br/>Amoxicillin is a penicillin derivative!"]
    C --> D{"Contact prescriber?"}
    D -->|Yes| E["Messages Dr. Youssef via messaging"]
    E --> F["Dr. Youssef changes Rx to Azithromycin"]
    F --> G["Updated Rx arrives in queue"]

    D -->|Override| H["Enter override reason"]

    G --> I["Checks stock: Azithromycin 250mg<br/>Stock: 120 tablets, Batch: AZ-2026-003"]
    I --> J["Selects batch → Enters quantity: 18"]
    J --> K["Clicks 'Dispense'"]
    K --> L["✅ Stock decremented: 120 → 102"]
    L --> M["Dispensing charge → invoice"]
    M --> N["Patient picks up medication"]

    K --> O{"Stock below reorder?"}
    O -->|Yes| P["⚠️ Low stock alert<br/>Auto-suggest Purchase Order"]
    O -->|No| Q["Continue"]

    style C fill:#F44336,color:#fff
    style L fill:#4CAF50,color:#fff
```

**Touchpoints**: Pharmacy queue, allergy checker, stock manager, messaging
**Pain Points Addressed**: Allergy cross-checking prevents harm, auto stock alerts prevent stockouts
**Emotions**: Safe (allergy checks), Proactive (automated restock suggestions)

---

## 4. Nurse (Khadija) — IPD Nursing Station Journey

```mermaid
flowchart TD
    A["👩‍⚕️ Khadija opens /ipd/nursing-station<br/>Morning shift 07:00"] --> B["Sees 6 active patients"]

    B --> C["Patient card: Mr. Ben Ali<br/>Room: Ward A - Bed 3"]
    C --> D["Tasks due:"]

    D --> E["🩺 Vitals at 07:00 ✓<br/>BP: 130/82, HR: 78, Temp: 37.0"]
    D --> F["💊 Amoxicillin 500mg at 08:00"]
    D --> G["💊 Metformin 850mg at 08:00"]
    D --> H["📋 Doctor's order:<br/>'Increase IV drip rate to 80ml/hr'"]

    E --> I["Records vitals in form<br/>→ Saved to admission record"]

    F --> J["08:00: Administers medication"]
    J --> K["Checks: Amoxicillin 500mg ✓<br/>Records: administered at 08:05<br/>By: Nurse Khadija"]
    G --> L["Administers Metformin<br/>Records: administered at 08:10"]

    K & L --> M["All morning tasks complete ✓"]
    M --> N["Next tasks appear:<br/>Vitals at 12:00<br/>Amoxicillin at 14:00"]

    H --> O["Adjusts IV drip rate<br/>Notes: 'Rate increased per Dr. orders'"]

    I --> P["📊 Vitals chart updates<br/>BP trending downward (good)"]

    style M fill:#4CAF50,color:#fff
    style P fill:#2196F3,color:#fff
```

**Touchpoints**: Nursing station dashboard, vitals entry, medication log
**Pain Points Addressed**: No paper medication charts, no missed medications (timed tasks), vitals trend visible
**Emotions**: Organized (clear task list), Accountable (everything timestamped)

---

## 5. Admin (Karim) — Workflow Automation Journey (Phase 3)

```mermaid
flowchart TD
    A["⚙️ Karim opens /admin/workflows"] --> B["Sees template library"]
    B --> C["Selects template:<br/>'Diabetes Follow-up Reminder'"]
    C --> D["Template auto-fills:"]

    D --> E["Trigger: encounter.signed_off"]
    D --> F["Condition: diagnosis contains E11.*"]
    D --> G["Action: send_sms after 7 days<br/>'Reminder: follow-up visit for diabetes'"]

    E & F & G --> H["Karim clicks 'Test with sample'"]
    H --> I["Dry run result:<br/>'Conditions MET — SMS would send to patient phone'"]

    I --> J["Karim activates workflow"]
    J --> K["✅ Workflow is live"]

    K --> L["A week later:<br/>Dr. Youssef signs off encounter<br/>Diagnosis: E11.2 (Type 2 Diabetes)"]
    L --> M["Workflow engine:<br/>Trigger matched ✓<br/>Condition met ✓"]
    M --> N["After 7 days:<br/>Patient receives SMS reminder"]

    N --> O["Karim checks workflow log:<br/>12 executions, 100% success"]

    style I fill:#FF9800,color:#fff
    style K fill:#4CAF50,color:#fff
```

**Touchpoints**: Workflow builder, template library, execution log
**Pain Points Addressed**: Manual follow-up calls eliminated, consistent patient outreach
**Emotions**: Powerful (automation), In-control (execution log proves it works)

---

## 6. Doctor (Dr. Youssef) — Telemedicine Journey

```mermaid
flowchart TD
    A["📅 Telemedicine appointment<br/>Scheduled for 14:00"] --> B["13:55: System creates Daily.co room"]
    B --> C["Patient gets SMS:<br/>'Join video at 14:00: [link]'"]
    B --> D["Doctor gets notification:<br/>'Video session ready: [link]'"]

    C --> E["Patient opens link → Waiting room<br/>'Doctor will join shortly'"]

    D --> F["Dr. Youssef clicks link at 14:00"]
    F --> G["Both see video feed ✅"]

    G --> H["Split-screen view:<br/>📹 Video on left<br/>📝 Encounter form on right"]

    H --> I["Records vitals (patient reports)<br/>Types SOAP notes<br/>Clicks AI copilot → SOAP expanded"]
    I --> J["Adds diagnosis + prescription"]
    J --> K["Ends call"]

    K --> L["Duration: 18 minutes"]
    L --> M["Telemedicine charge: 300 MAD<br/>Added to invoice"]
    M --> N["Patient receives invoice in portal"]
    N --> O["Patient pays online ✅"]

    style G fill:#4CAF50,color:#fff
    style O fill:#4CAF50,color:#fff
```

**Touchpoints**: Video room, encounter sidebar, portal billing
**Pain Points Addressed**: Remote patients served, no travel, integrated documentation during call
**Emotions**: Modern (video consultation), Efficient (encounter + video in one screen)

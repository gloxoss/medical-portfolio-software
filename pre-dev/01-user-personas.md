# Phase 1 — User Personas

## MediCore HIS — Target User Profiles

> Personas synthesized from: R1/Grok (behavioral profiles), R2/Gemini (psychographic analysis, tech comfort mapping), R3/Perplexity (MENA-specific names, regional context), his-predev (Moroccan clinic realities).

---

## Persona 1: Dr. Youssef El Amrani — The Solo Practitioner

### Profile

| Field | Detail |
|-------|--------|
| **Age** | 35–50 |
| **Location** | Casablanca suburb (Ain Diab or Hay Hassani) |
| **Practice** | Private general practice, solo clinic |
| **Patient volume** | 15–25 patients/day |
| **Staff** | 1 part-time receptionist, no IT support |
| **Current tools** | Paper records, Excel for billing, WhatsApp for reminders |
| **Monthly tech budget** | $50–80 max |
| **Languages** | French (clinical), Darija (patients), some English (conferences) |

### Goals
1. **Leave the clinic by 7pm** — not 10pm after finishing handwritten notes
2. **Stop losing revenue** to untracked consultations and forgotten billing
3. **Look professional** to patients — a modern system instead of paper folders
4. **Get AI help with documentation** — doesn't want to type 500 words per patient

### Frustrations
- Spends **1.5–2 hours every evening** transcribing paper notes into a digital format for record-keeping ("temps de pyjama")
- Tried a CodeCanyon script once — it crashed, data was lost, no one answered support emails
- Athenahealth/Tebra are priced for American incomes — $350/mo is half his receptionist's salary
- Hates complex dropdown-heavy interfaces — "I'm a doctor, not an IT consultant"
- Genuinely scared about data security after hearing about ransomware attacks on Moroccan businesses

### Tech Comfort
**Low-to-Mid.** Uses Spotify, Instagram, WhatsApp daily. Comfortable with modern consumer apps. Gets frustrated immediately with dense dashboards, excessive settings pages, or interfaces that require training.

### How He Discovers MediCore
- Word of mouth from fellow doctors at a Casablanca Medical Society meeting
- A LinkedIn post about AI-powered documentation catches his attention
- Free trial — signs up alone, onboards in 30 minutes

### What Makes Him Stay
- AI copilot actually saves him 30–45 minutes per evening
- Receptionist learned the booking system in one day (no training needed)
- Monthly cost is comparable to his mobile phone bill
- His patients receive SMS reminders — they stop calling to confirm appointments

### Implications for MediCore Design
- **Onboarding must be self-service** — no demo calls, no implementation consultants
- **AI copilot must produce usable SOAP notes from bullet points**, not just grammar corrections
- **French-first UI** with Darija-friendly labels where possible
- **Price MUST stay under $50/mo** for solo tier — this is Youssef's hard ceiling
- **Mobile-responsive** — he sometimes charts on his iPad between patients

---

## Persona 2: Dr. Amina Benabdallah — The Polyclinic Director

### Profile

| Field | Detail |
|-------|--------|
| **Age** | 42–55 |
| **Location** | Rabat, operating 3 clinics across Rabat-Salé-Kénitra |
| **Practice** | Multi-specialty polyclinic network (dermatology, cardiology, general medicine, pediatrics) |
| **Providers** | 8 doctors + 4 nurses across 3 locations |
| **Support staff** | 6 receptionists, 1 billing clerk, 1 IT-adjacent office manager |
| **Patient volume** | 120–180 patients/day across all sites |
| **Current tools** | Mix of Excel, WhatsApp groups, one location uses an old Access database, paper in the other two |
| **Monthly tech budget** | $200–500 |
| **Languages** | French (business/clinical), Arabic (patients), English (medical literature) |

### Goals
1. **Standardize workflows** across all 3 locations — same booking flow, same encounter template, same billing rules
2. **See consolidated revenue** in one dashboard — not 3 separate Excel files
3. **Prevent revenue leakage** — she suspects 10–15% of consultations aren't billed correctly because each clinic tracks differently
4. **Reduce patient wait times** — the queue at her Rabat flagship is chaotic, with manual token systems
5. **Scale to 5 clinics** without the software becoming a bottleneck

### Frustrations
- Cannot get a unified patient view — if a patient visits Clinic A then goes to Clinic B, the doctor at Clinic B has no history
- Billing discrepancies between locations cost her an estimated $2,000–3,000/month
- Tried implementing a hospital management system — the implementation team wanted $15,000 and 4 months. She abandoned it
- Her IT "person" is actually the office manager who can use Excel but not configure APIs or servers
- Insurance reconciliation is nearly impossible with her current fragmented setup

### Tech Comfort
**Mid.** Understands the value of cloud software — uses Zoho for some internal processes. Needs high-level analytics dashboards, not raw data. Delegates daily operations to receptionists; she monitors and makes decisions.

### How She Discovers MediCore
- Searches Google for "logiciel gestion clinique Maroc" or "clinic management software multi-site"
- A feature comparison article or a targeted Facebook/LinkedIn ad
- Wants a demo with her specific multi-clinic scenario, but doesn't want a 6-month implementation

### What Makes Her Stay
- One dashboard for all 3 clinics — real revenue data, real patient counts
- Patients booked at any location are visible from any other location
- Billing auto-fires on encounter sign-off — no more missed charges
- The AI copilot becomes a recruitment pitch — "Come work at our clinic, we use AI"
- Queue management system with real-time display reduces lobby complaints

### Implications for MediCore Design
- **Multi-tenancy is the killer feature** — org_id + facility_id isolation must be flawless
- **Facility switcher** must be 1 click, always visible in the nav
- **Revenue dashboard** with filters by facility, date range, doctor, service type
- **Pricing at $149–199/mo flat** (not per-provider) — she'll compare against per-seat alternatives
- **Onboarding must support batch user creation** — she needs to add 8 doctors + 6 receptionists in one session
- **The system must handle 120+ concurrent users** across 3 locations without degradation

---

## Persona 3: Fatima Zahra Idrissi — The Receptionist

### Profile

| Field | Detail |
|-------|--------|
| **Age** | 22–35 |
| **Location** | Works at one of Dr. Amina's clinics in Salé |
| **Role** | Front desk — booking, check-in, initial patient registration, billing collection |
| **Tech exposure** | Uses TikTok, Instagram, WhatsApp. Has never used professional software beyond Excel |
| **Work hours** | 8am–6pm, 6 days/week |
| **Language** | Darija (primary), French (clinic system), some Arabic |

### Goals
1. **Register patients quickly** — the lobby is full, doctors are waiting
2. **Book appointments without double-booking** — currently uses a paper agenda and calls sometimes conflict
3. **Print/send invoices on the spot** after the doctor finishes
4. **Not get blamed** when billing errors happen — she wants the system to catch mistakes

### Frustrations
- The paper appointment book has no conflict detection — double-bookings happen weekly
- She manually writes patient info 3 times: paper folder, Excel, doctor's notes request
- When a patient calls to reschedule, she has to physically flip through the paper book
- The billing clerk audits her work monthly and finds errors that aren't always hers
- She doesn't understand why some patients get charged differently at different locations

### Tech Comfort
**Low.** Very comfortable with mobile apps (consumer). Has never used a desktop web application for work. Needs an interface that feels as intuitive as Instagram — big buttons, clear status indicators, zero jargon.

### How She Uses MediCore
- She doesn't discover or choose MediCore — Dr. Amina or the office manager introduces it
- Her first experience is registering a patient and booking an appointment during a 15-minute training session
- If she can't figure it out in that session, she'll quietly resist using it

### What Makes Her Stay
- Patient registration takes 90 seconds instead of 5 minutes
- The calendar shows real-time availability — no more calling doctors to check
- Check-in generates a queue token automatically — patients stop asking her "when is my turn?"
- Invoice auto-populates after the doctor signs off — she just confirms and prints

### Implications for MediCore Design
- **Registration form must be <= 8 fields** on the initial screen (name, phone, DOB, gender, national ID — the rest optional)
- **Appointment booking must be visual** — calendar view with click-to-book, not a form
- **Queue management must have large, obvious buttons** — "Check In" should be the biggest element on screen
- **No English or French jargon in the receptionist view** — labels should be plain and clear
- **Zero configuration required** — she should never see a settings page
- **Error prevention > error messages** — don't let her book an occupied slot; grey it out

---

## Persona 4: Karim Berrada — The IT-Minded Office Manager

### Profile

| Field | Detail |
|-------|--------|
| **Age** | 30–45 |
| **Location** | Works for a 10-doctor clinic group in Casablanca (or a mid-sized regional hospital considering MediCore for their outpatient department) |
| **Role** | Office manager with de facto IT responsibility |
| **Tech exposure** | Self-taught: manages the clinic's network, email, and current software (usually a pirated CodeCanyon script or an old Access database). Reads API documentation. Understands databases at a conceptual level |
| **Languages** | French, English (for technical reading), Darija |

### Goals
1. **System uptime > 99.5%** — the old script crashes every 2 weeks and he's the one who gets the 10pm calls
2. **Data security** — he's read about ransomware and data breaches. He wants encryption, RBAC, and audit logs
3. **Easy deployment** — if MediCore is SaaS, he doesn't want to manage Docker containers or Linux servers
4. **API access** — he wants to eventually integrate MediCore with the lab information system and the accounting software (Sage)
5. **Predictable costs** — no usage-based billing surprises

### Frustrations
- The current CodeCanyon script hasn't been updated in 18 months — PHP 7.4 dependencies are breaking
- He's the only person who can restart the server when it goes down — no redundancy
- Data is on a single $10/mo VPS with no automated backups — he loses sleep over this
- The script's "API" is a collection of undocumented AJAX endpoints that break between versions
- He spent 3 weeks trying to set up HTTPS properly on the VPS

### How He Discovers MediCore
- Forums (Reddit r/healthIT, Stack Overflow), Twitter/X technical communities
- Searches for "open API EHR SaaS affordable" or "NestJS health information system"
- Evaluates the API documentation before even trying the product

### What Makes Him Stay
- **SaaS = zero server management** — no more 10pm server restarts
- **Railway/Vercel/Atlas** = automatic backups, automatic scaling, automatic SSL
- **REST API documented** — he can build custom integrations
- **RBAC with audit logs** — he can prove to Dr. Amina who accessed what
- **Flat, predictable pricing** — he can put it in the monthly budget line item

### Implications for MediCore Design
- **API documentation must be excellent** — Swagger/OpenAPI auto-generated from NestJS decorators
- **Audit log page** accessible to org admins — who did what, when
- **No self-hosting in Phase 1** — he'll ask. The answer is "SaaS only for now, self-hosted option planned"
- **Webhook support** (even basic) so he can push events to external systems
- **Status page** with uptime monitoring (even a simple one via Railway or Betteruptime)
- **The export feature matters** — he'll want to export patient data, invoices, encounters as CSV/JSON

---

## Persona Priority for MVP

| Persona | Priority | Reason |
|---------|----------|--------|
| Dr. Youssef (Solo) | **P0** | First paying customer will be a solo doctor. Entire onboarding + encounter flow must work for him |
| Fatima Zahra (Receptionist) | **P0** | If the receptionist can't use it, the doctor won't use it. Booking + check-in UX is critical |
| Dr. Amina (Polyclinic) | **P1** | Second customer type. Multi-tenancy must work, but she'll come after the solo doctor validates |
| Karim (IT Manager) | **P2** | Important for retention and expansion, but he's not the decision-maker for purchase |

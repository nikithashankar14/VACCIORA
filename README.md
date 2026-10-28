# Vacciora — AI-Based Childhood Immunization Management & Predictive Reminder System

**Vacciora** is a production-shaped healthcare web platform engineered to eliminate missed childhood immunizations. It tracks India's Universal Immunization Programme (UIP) schedule, detects drop-out risks using a trained Machine Learning model, and dispatches multi-channel smart reminders via Twilio (SMS & WhatsApp) with automatic fallback.

---

## Absolute Compliance & Architectural Rules

- **Zero Demo Data**: No placeholder records, fake profiles, or pre-seeded children or facilities.
- **Strict MongoDB Persistence**: MongoDB via Mongoose is the only persistence layer. If the database connection fails or `MONGO_URI` is missing, the backend strictly refuses to start and exits with code 1.
- **One Exception (Real UIP Reference Data)**: The national immunization schedule is seeded once via `npm run seed:schedule`.
- **Admin Bootstrap Protocol**: Staff and admin accounts cannot self-register. The initial super-administrator is provisioned via the one-time interactive CLI script `backend/scripts/bootstrapAdmin.js`. All subsequent staff/admin accounts undergo the UI workflow: `Request Access -> Admin Approval -> Cryptographic Temporary Password -> Forced Password Change`.

---

## System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Frontend: React + Vite                   │
│   (Port 5173 - Theme: Soft Teal/Sage & Lora/Inter)     │
└───────────────┬────────────────────────┬───────────────┘
                │ HTTP REST (Bearer JWT) │
                ▼                        ▼
┌────────────────────────────────────────────────────────┐
│             Backend: Node.js + Express                 │
│      (Port 5000 - JWT Auth, Schedule & Reminder)       │
└───────┬───────────────────┬────────────────────┬───────┘
        │                   │                    │
        ▼                   ▼                    ▼
┌──────────────┐    ┌──────────────┐     ┌──────────────┐
│   MongoDB    │    │ Python Flask │     │  Twilio SDK  │
│ Persistence  │    │  ML Service  │     │ SMS/WhatsApp │
│ (Port 27017) │    │ (Port 5001)  │     │ Notification │
└──────────────┘    └──────────────┘     └──────────────┘
```

---

## Getting Started: Execution Sequence

### Prerequisites
- Node.js (v18+) & npm
- Python (3.10+)
- MongoDB running on `mongodb://127.0.0.1:27017`

### Step 1: Database Seed (Universal Immunization Programme Reference Data)
```bash
cd backend
npm install
npm run seed:schedule
```
This populates the `vaccineSchedule` collection with all official doses from birth through 16 years.

### Step 2: Provision Initial Administrator (Bootstrap Problem)
Because staff and admins cannot self-register, provision the initial super-admin:
```bash
npm run bootstrap-admin
```
You can pass environment variables or enter values interactively when prompted:
- `BOOTSTRAP_ADMIN_NAME="System Administrator"`
- `BOOTSTRAP_ADMIN_EMAIL="admin@vacciora.health"`
- `BOOTSTRAP_ADMIN_MOBILE="+919999000001"`
- `BOOTSTRAP_ADMIN_PASSWORD="YourSecurePassword"`

*Note: The script refuses to run if an administrator already exists.*

### Step 3: Set Up & Run the AI Risk Prediction Service
```bash
cd ../ml-service
python -m venv .venv
# On Windows:
.\.venv\Scripts\pip install -r requirements.txt
# Generate bootstrap training dataset and train GradientBoosting model:
.\.venv\Scripts\python training/generate_synthetic_data.py
.\.venv\Scripts\python training/train_model.py
# Start microservice on port 5001:
.\.venv\Scripts\python app.py
```
Health endpoint: `GET http://localhost:5001/health`

### Step 4: Run Node.js Backend API
```bash
cd ../backend
npm start
```
Runs on `http://localhost:5000`. Health endpoint: `GET http://localhost:5000/api/health`.

### Step 5: Run Vite React Frontend
```bash
cd ../frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## Twilio SMS & WhatsApp Configuration

Vacciora utilizes a unified Twilio SDK integration for both SMS and WhatsApp. In `backend/.env`:

```env
# Twilio Account SID & Auth Token (from Twilio Console: Console > Account Info)
TWILIO_ACCOUNT_SID=ACXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
TWILIO_AUTH_TOKEN=your_auth_token_here

# SMS Sender Number (E.164 format, e.g. +1234567890)
TWILIO_SMS_FROM=+1234567890

# WhatsApp Sandbox Sender Number (defaults to +14155238886)
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Approved Twilio Content API Template SID (for production outside 24h window)
TWILIO_WHATSAPP_CONTENT_SID=HXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Prototyping vs Production WhatsApp Sandbox Journey
1. **Local Prototyping (Mock Delivery)**: If Twilio credentials are blank, Vacciora logs messages to the server console and stores delivery status as `"mock"` in the `reminders` collection. Local development never breaks.
2. **Twilio WhatsApp Sandbox**:
   - Join Twilio WhatsApp sandbox on your test phone by messaging `join <sandbox-keyword>` to `+1 415 523 8886`.
   - Sandbox supports free-text messages during early development and verification.
3. **Production Template Approval (Twilio Content API)**:
   - For business-initiated reminders outside a 24-hour window, WhatsApp requires pre-approved templates.
   - Template Name: `vaccination_reminder`
   - Content:
     ```
     Hello {{1}},

     Reminder: {{2}}'s {{3}} vaccination is due on {{4}}.

     Please visit your vaccination centre on the scheduled date.

     - Vacciora
     ```
   - Set the approved template SID in `TWILIO_WHATSAPP_CONTENT_SID`.
   - Switch `TWILIO_WHATSAPP_FROM` to your verified business phone number once provisioned.

---

## Core Operational Lifecycles

### 1. Newborn Registration & Day-0 Immunization
- Healthcare staff log into `/staff`.
- Under **Register Birth Record**, enter newborn name, date of birth, gender, and mother's mobile number.
- Enable **Log & Verify Day-0 Birth Doses** to automatically log BCG, OPV-0, and HepB-0 with SHA-256 cryptographic signatures.
- A permanent UID formatted `CHD-YYYY-XXXXXX` is generated.

### 2. Parent Account Linking
- Parents self-register at `/register` with explicit informed consent.
- In the Parent Portal (`/parent`), click **Link Hospital Record**, entering the `childUid` and the mobile number registered at delivery.
- The parent dashboard immediately displays calculated age, next due dose, UIP immunization timeline, and active AI risk classification.

### 3. Smart Cadence Reminders & Automatic Fallback
- Cadence escalation table automatically evaluates days remaining before dose:
  - `7+ days`: WhatsApp notification.
  - `2-3 days`: WhatsApp + SMS.
  - `Due Date`: WhatsApp + SMS.
  - `Overdue`: WhatsApp + SMS (with immediate out-of-cycle trigger if AI risk is high).
- **Automatic Fallback**: If WhatsApp delivery fails or returns an error, the engine immediately dispatches an SMS backup, recording `fallbackFrom: "whatsapp"` in the `reminders` collection.

### 4. Cryptographic SHA-256 Certificates
- Parents and staff can generate and download signed immunization certificates.
- Each certificate computes a SHA-256 cryptographic hash across child UID, record details, facility, and date.
- Certificates can be verified publicly at `/verify` or by scanning the certificate QR code.

---

## Verification & Automated Test Suite

To verify all 14 integration endpoints against real MongoDB, ML model, and notification fallback:
```bash
cd backend
node scripts/testEndToEnd.js
```
The test suite validates:
1. Bootstrapped admin authentication.
2. Staff access request submission.
3. Admin approval with cryptographic temporary password delivery.
4. Mandatory password change protocol on first login.
5. Newborn birth registration & Day-0 doses.
6. Parent self-registration with informed consent.
7. Parent-child linking via UID and mobile verification.
8. Real-time UIP schedule computation and grace period logic.
9. ML risk prediction with cold-start gating.
10. Multi-channel reminder dispatch and fallback logging.
11. Digital QR Pass issuance and clinic resolution.
12. PDF certificate generation with SHA-256 digital signature verification.
13. Admin notification health metrics and audit trail queries.

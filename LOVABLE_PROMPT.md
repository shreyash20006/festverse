# CampusConnect – Multi-College Event Management SaaS (Master Prompt)

Build **CampusConnect**, a production-ready **multi-tenant Event Management SaaS** for colleges and universities. 

The platform allows every college to create its own branded event portal, manage registrations, collect payments, issue rolling QR tickets, scan attendance, and generate reports. The system must support thousands of colleges from a single application.

---

# User Roles & Dashboards

## 1. Super Admin (Platform Owner)
* Controls the entire platform from a global dashboard.
* **Permissions**:
  * Create Colleges, Delete Colleges, Suspend Colleges.
  * View all colleges, all events, and all payments.
  * Monitor global platform analytics and system audit logs.
  * Suspend college payment integrations if required.
  * *Super Admin must never have access to withdraw college funds.*

## 2. College Admin
* Manages settings and fests for their specific college portal.
* **Permissions**:
  * Customize branding (name, colors, logo).
  * Configure custom Razorpay/Cashfree API key credentials.
  * Upload CSV registers to verify student PRNs.
  * View transactions, download financial reports, and grant organizer/scanner roles.

## 3. Organizer
* Manages assigned events.
* **Permissions**:
  * Create, edit, and publish events (technical, cultural, sports, workshops).
  * Manage registrations and export participant list CSVs.
  * View attendance list and trigger participation certificates.

## 4. Volunteer (Scanner)
* Accesses only the rolling QR code attendance scanner.
* **Lockout**: Restrict access strictly to the scanner view page (`/admin/scanner`); Volunteers cannot view dashboards or edit settings.

## 5. Student
* Interacts with a clean, simplified Student Dashboard containing:
  * **My QR Tickets**: Dynamic rolling QR tickets that refresh every 30 seconds with a countdown bar.
  * **My Registrations**: History of fests registered, payment details, and approval statuses.
  * **Profile**: Edit university credentials (PRN, Name, Phone, Department).

---

## 💳 Razorpay Payment Gateway Integration (Production Ready)

Implement a complete **Razorpay Payment Gateway** integration for CampusConnect.

The platform must support **both Free and Paid events**.

### Free Events
* **Flow**: Student ➔ Register ➔ QR Ticket Generated ➔ Confirmation Email. No payment required.

### Paid Events
* **Flow**: Student opens Event ➔ Clicks Register ➔ Create Razorpay Order (Server-side) ➔ Open Razorpay Checkout ➔ Student completes payment ➔ Verify payment signature on the server ➔ Verify payment using Razorpay APIs ➔ Create registration ➔ Generate secure QR Ticket ➔ Send confirmation email.
* *Never create a registration before payment verification.*

---

## Multi-College Payment Support

CampusConnect is a multi-tenant SaaS. Every college should be able to connect **its own Razorpay Merchant Account**.
* Do NOT hardcode Razorpay credentials.
* Create a **Payment Settings** page where each College Admin can configure:
  * Razorpay Key ID
  * Razorpay Key Secret
  * Webhook Secret
  * Company Name
  * Company Logo
  * Support Email
  * Support Contact
* Encrypt all secrets before storing.
* Only Super Admin can view connected payment status.
* Never expose secrets to the frontend.

---

## Database Schema

Create and maintain:

### colleges
* id (uuid, pk)
* slug (text, unique)
* name (text)
* primary_color (text)
* logo_url (text)
* is_active (boolean)
* created_at (timestamptz)

### user_roles
* id (uuid, pk)
* user_id (uuid)
* role (app_role: 'super_admin', 'college_admin', 'organizer', 'scanner', 'student')
* college_id (uuid, references colleges)
* granted_by (uuid)
* created_at (timestamptz)

### subscriptions
* id (uuid, pk)
* college_id (uuid, references colleges)
* plan_name (text: 'free', 'pro', 'enterprise')
* status (text)
* expires_at (timestamptz)
* created_at (timestamptz)

### google_forms
* id (uuid, pk)
* event_id (uuid, references events)
* form_url (text)
* config (jsonb)

### payment_providers
* id (uuid, pk)
* college_id (uuid, references colleges)
* provider (text: e.g. 'razorpay', 'cashfree')
* key_id (text)
* encrypted_key_secret (text)
* encrypted_webhook_secret (text)
* status (text)
* created_at (timestamptz)
* updated_at (timestamptz)

### payments
* id (uuid, pk)
* college_id (uuid, references colleges)
* event_id (uuid, references events)
* registration_id (uuid)
* student_id (uuid)
* razorpay_order_id (text)
* razorpay_payment_id (text)
* razorpay_signature (text)
* amount (numeric)
* currency (text)
* payment_method (text)
* payment_status (text)
* invoice_number (text)
* created_at (timestamptz)

### payment_webhooks
* id (uuid, pk)
* college_id (uuid, references colleges)
* event (text)
* payload (jsonb)
* verified (boolean)
* processed (boolean)
* created_at (timestamptz)

### settlements
* id (uuid, pk)
* college_id (uuid, references colleges)
* provider (text)
* settlement_id (text)
* amount (numeric)
* status (text)
* settlement_date (timestamptz)

---

## Webhooks

Handle the following events:
* `payment.captured`
* `payment.failed`
* `order.paid`
* `refund.created`

Verify webhook signatures before processing. Implement idempotency so duplicate webhooks never create duplicate registrations.

---

## QR Generation

Generate QR Ticket **only after**:
1. Payment Successful
2. Signature Verified
3. Registration Created

QR should contain only a secure encrypted ticket token. Never store student details inside the QR code.

---

## Admin Dashboard (Payment Module)

Dashboard Cards:
* Total Revenue
* Today's Revenue
* Successful Payments
* Failed Payments
* Pending Payments
* Refunded Amount

Payment Table:
* Student (Name/Email)
* Event
* Amount
* Payment Status
* Razorpay Payment ID
* Razorpay Order ID
* Invoice
* Date

Actions:
* View details
* Export CSV / Export Excel
* Download Invoice PDF

---

## Security & Architecture

1. **Tenancy Resolution**: Detect college context from `window.location.hostname` (extracting subdomain, e.g. `collegeslug.campusconnect.app`) with subpath fallback (`/c/collegeslug`) for local development.
2. **Modular Gateways**: The integration must be modular so that **Cashfree, PhonePe, Stripe, or other gateways** can be added later without changing the registration workflow. Use a provider abstraction/interface.
3. **Data Protection**: Enforce Row Level Security (RLS) on all tables checking tenant isolation constraints. Rotate QR validation tokens every 30 seconds to prevent ticket sharing.

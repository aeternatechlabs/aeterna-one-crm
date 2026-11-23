# Architectural & Operational Evaluation Report: `Management-software`
> **Document:** Deep-Scan Technical Audit & Architecture Extraction  
> **Source Directory:** `d:\devil_code\aeterana\aeterna-one-crm\Management-software`  
> **Target CRM Integration:** Aeterna One CRM (`aeterna-one-crm`)  
> **Date of Evaluation:** 20 November 2026  
> **Auditor:** Antigravity AI Engine

---

## Executive Summary

A comprehensive deep-scan of the `Management-software` codebase was conducted. The project is an enterprise-grade ERP/CRM system built with **React 19 + Vite (Frontend)** and **Node.js + Express + MongoDB (Backend)** with integration into `devil-backend-nodejs` and `devil-frontend`.

The codebase contains four battle-tested operational subsystems directly relevant to Aeterna One CRM's upcoming development milestones:
1. **Employee Management Subsystem** (Multi-tier lifecycle, soft-deletion, trash recovery, scope isolation)
2. **Secure Attendance Subsystem** (Dual-layer security: Office IP/CIDR verification + WebAuthn/FIDO2 hardware biometric binding)
3. **Lead Management Subsystem** (Multi-source ingestion, automated next-action status engine, activity timeline, reminder queues)
4. **Email Dispatch & Forgot Password Subsystem** (Dual Brevo API + Gmail OAuth2 engine, dynamic variable substitution, 3-step animated OTP verification wizard)

Below is the detailed architectural breakdown of each system, highlighting strengths, implementation patterns, and exact integration strategies for Aeterna One CRM.

---

## 1. Employee Management Subsystem

### 1.1 Architecture & Data Models
- **Primary Model (`backend/src/models/Employee.js`):**
  - Unique company identifier: `employee_code` (e.g. `EMP-001`, indexed & required).
  - Identity linkage: `user_id` (ref: `User`), creating separation between personal profile and authentication credentials.
  - Operational fields: `department`, `designation`, `manager_id` (hierarchical reporting ref: `Employee`), `joining_date`, `employment_status` (`Active`, `On Leave`, `Terminated`, `Probation`).
  - Contact & Safety: `contact_info` with emergency contact details.
  - Document attachments: Document repository with verification metadata.
- **Audit & Deletion Archive (`backend/src/models/DeletedEmployeeHistory.js`):**
  - Maintains immutable historical snapshots when staff members are removed, capturing past attendance records, daily work reports (DWR), and task metrics.

### 1.2 Access Control & Role Guards
- **Strict Role Gating (`backend/src/routes/employeeRoutes.js`):**
  - Enforced via `checkRole('Super Admin', 'HR')`.
  - Mutation & deletion operations require `requirePermission('HR', 'EMPLOYEES', 'DELETE')`.
  - Permanent destruction (`permanentDeleteEmployee`) is strictly restricted to `Super Admin`.
- **Scope Escalation Protection (`rejectScopeEscalation`):**
  - Middleware rejects any attempt by tenant/branch users to escalate permissions or set scope to `PLATFORM`.
- **Subscription / License Limiting (`enforceUserLimit`):**
  - Enforces hard ceilings on the total number of provisioned active users.

### 1.3 Two-Tier Deletion & Recovery Architecture
```
[Active Employee]
       │
       ▼ (Soft Delete)
[Trash Bin (/trash)] ───► Can be Restored (POST /:id/restore)
       │
       ▼ (Archive to History)
[DeletedEmployeeHistory] ───► Deep Archive with full audit snapshot
       │
       ▼ (Permanent Delete - Super Admin Only)
[Hard Deletion from DB]
```

### 1.4 Key Strengths & Takeaways for Aeterna One CRM
- Separation between `Employee` (staff employment profile) and `User` (system auth entity).
- Trash bin recovery mechanism preventing accidental staff loss.
- Immediate session termination upon deactivation.

---

## 2. Secure Attendance Subsystem

The attendance subsystem in `Management-software` features one of the most advanced enterprise security models, combining network containment with biometric hardware device binding to eliminate proxy attendance ("buddy punching").

### 2.1 Layer 1: Network & IP Containment (`backend/src/utils/ipCheck.js`)
- **Robust IP Normalization:**
  - Handles IPv4 and IPv6 formatting (strips `::ffff:` wrappers and port suffixes).
  - Resolves client IPs behind modern reverse proxies: evaluates `cf-connecting-ip` (Cloudflare), `x-forwarded-for` (standard multi-hop proxies), and `x-real-ip`.
- **CIDR BlockList Verification (`buildBlockList`):**
  - Parses CIDR notations (e.g., `192.168.1.0/24`, `10.0.0.0/8`) using Node's native `net.BlockList`.
  - Ensures employees can only check in when physically connected to the authorized branch Wi-Fi or office subnet.

### 2.2 Layer 2: WebAuthn / FIDO2 Biometric Hardware Device Binding
Implemented in `backend/src/models/AttendanceWebAuthnCredential.js` and `AttendanceDeviceVerification.js`:
- **Hardware Passkey Registration:**
  - Uses the WebAuthn standard (W3C / FIDO2) to register the employee’s physical device (FaceID, TouchID, Windows Hello, or hardware security key).
  - Stores `credentialId`, `publicKey`, `counter`, `transports`, and `deviceName`.
- **Anti-Proxy Challenge/Response Protocol:**
  1. Employee initiates check-in.
  2. Server issues a cryptographically random, short-lived challenge (`authenticationChallenge` with 5-minute expiry).
  3. The device signs the challenge with its hardware enclave private key.
  4. Server verifies the signature and validates the counter to prevent replay attacks.
- **Admin Approval & Reset Workflows:**
  - When an employee changes devices, a `DEVICE_REREGISTRATION` request is created and requires explicit Admin approval (`approveDeviceRegistration`).
  - Admins can trigger device reset (`adminResetEmployeeDevice`) or revoke compromised devices.

### 2.3 Key Strengths & Takeaways for Aeterna One CRM
- Physical branch isolation can leverage this to restrict counsellors/officers to checking in from `bengaluru`, `mysuru`, or `belagavi` office networks.
- Prevents remote unauthorized logins or buddy punching without requiring expensive physical biometric card readers.

---

## 3. Lead Management Subsystem

### 3.1 Data Architecture (`backend/src/models/CrmLead.js`)
- **Multi-Source Ingestion:**
  - Native support for: `pdf_upload` (AI/Regex parsed from leadsheet documents), `google_sheet` sync, `link_import`, and `manual` creation.
- **Key Entity Attributes:**
  - Contact: `name`, `phone_number` (indexed), `email`.
  - Lead Intelligence: `department`, `priority` (`low`, `medium`, `high`), `notes`, `source`.
  - State Tracking: `current_status` (validated against canonical status list).
  - Allocation: `assigned_to` (ref: `User`), `assigned_by`, `assigned_at`.

### 3.2 Automated Next-Action & Reminder Engine (`backend/src/services/statusEngine.js`)
- Deterministic state machine linking each lead status transition to its operational consequence:
  - **`New` / `Assigned`:** Automatically triggers instant `new_lead` reminder for the assignee.
  - **`Attempted` / `No Answer` / `Busy` / `Switched Off`:** Automatically queues an outreach retry policy with configured delay.
  - **`Interested`:** Prompts counsellor to schedule a formal follow-up.
  - **`Not Interested`:** Automatically cancels all active reminders to prevent spamming staff.

### 3.3 Activity & Audit Trail
- **`CrmLeadActivity.js`:** Logs every call outcome, remark, assignment modification, and manual note with timestamp and author.
- **`CrmStatusHistory.js`:** Captures full timestamped state transitions to calculate lead turnaround time and drop-off analytics.

### 3.4 Key Strengths & Takeaways for Aeterna One CRM
- Direct alignment with Aeterna One’s 16-stage pipeline: a qualified lead can convert seamlessly with a single click into `PipelineStudent`.
- Clean integration with the daily reach-out queue (`wa.me`, `tel:`, `mailto:`) built in Phase B4.

---

## 4. Email Dispatch & Forgot Password Subsystem

### 4.1 Dual Email Architecture
1. **Transactional Brevo API Service (`backend/src/services/emailService.js`):**
   - Integrates directly with `devil-backend-nodejs` (`sendBrevo`).
   - Clean, lightweight, and serverless-resilient (no SMTP socket timeouts or port blocking).
   - Pre-built transactional templates:
     - `sendOTPEmail(to, otp)`: Sends a high-contrast, clean 6-digit OTP code card with 10-minute validity.
     - `sendWelcomeEmail(to, name, email, password, planName, orgName)`: Dispatches secure initial credentials upon staff provisioning.
2. **Direct Gmail OAuth2 Delivery (`backend/src/controllers/gmailSendController.js`):**
   - Connects to Google Workspace via OAuth2 (`getGmailClient`).
   - Constructs standard RFC 2822 MIME messages with base64url encoding.
   - Dynamic template engine (`renderTemplate`): Substitutes variables (`{{name}}`, `{{phone}}`, `{{status}}`, etc.) safely.
   - Logs full outbound audit history (`EmailHistory.js`).

### 4.2 3-Step Wizard Forgot Password Flow
- **Frontend Architecture (`frontend/src/public/ForgotPasswordPage.jsx`):**
  - **Step 1: Email Submission:** User submits email address -> Triggers `POST /auth/forgot-password`.
  - **Step 2: 6-Digit OTP Verification:** User enters OTP received in mailbox -> Triggers `POST /auth/verify-otp`. Includes 10-minute timer and resend trigger.
  - **Step 3: New Password:** User sets new password with confirm check and length validation -> Triggers `POST /auth/reset-password`.
  - Motion transitions using Framer Motion with step-indicator dots and 256-bit encryption badge.
- **Backend Security Guards (`backend/src/controllers/authController.js`):**
  - Dedicated rate limiter: `passwordResetLimiter`.
  - OTP hashed with bcrypt: `await bcrypt.hash(otp, 10)` before storage in database (`resetOTP`).
  - Strict expiration: `resetOTPExpires = Date.now() + 10 * 60 * 1000`.
  - Clears refresh tokens and resets session tokens upon password change.

---

## 5. Architectural Recommendations for Aeterna One CRM

| Subsystem | Recommendation for Aeterna One CRM |
| :--- | :--- |
| **Employee Management** | Mount `/settings/employees` restricted to `super_admin`. Adapt the soft-delete and active/deactive toggle with `tokenVersion` invalidation. |
| **Secure Attendance** | Adopt the office IP / branch CIDR validation (`bengaluru`, `mysuru`, `belagavi`) to prevent remote proxy clock-in. |
| **Lead Management** | Mount `/leads` utilizing the status next-action engine and 1-Click "Convert to Student" to bridge Phase B1 directly into the 16-stage admissions pipeline. |
| **Forgot Password** | Implement the 3-step OTP flow (`POST /api/v1/auth/forgot-password`, `/verify-otp`, `/reset-password`) using `sendBrevo` and Aeterna's luxury champagne gold & royal maroon email template. |
| **Institution Directory** | Build the Counsellor-driven School, College & University master directory, linking directly into Student 360° shortlist workflows. |

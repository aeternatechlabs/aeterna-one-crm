# Aeterna One CRM — Student 360° Profile & Documents Vault
## Data Classification, Section Specifications & RBAC Requirements (`docs/STUDENT_360_DATA_CLASSIFICATION_AND_REQUIREMENTS.md`)

> **Document Type:** System Architecture & Data Governance Specification (Deliverable for Phase B3 Day 31)  
> **Target System:** Aeterna One CRM (`aeterna-one-crm`)  
> **Compliance Alignment:** India Digital Personal Data Protection (DPDP) Act 2023, GDPR Article 6 & 9, FERPA & International Student Data Regulations  
> **Applicable Physical Branches:** Bengaluru (HQ), Mysuru, Belagavi  
> **Source Files & Policies:** `RULES.md` (Rules 1, 10, 18, 20), `docs/ROLE_PERMISSION_MATRIX.md`, `client/src/config/permissions.js`, `server/src/config/constants.js`  
> **Date:** 18 November 2026 (Phase B3 Day 31 Milestone)  

---

## 1. Executive Summary & Architecture Purpose

In international overseas education consultancy, a candidate is not merely a pipeline card; they are an applicant with complex academic credentials, standardized testing histories, financial guarantees, immigration documentation, and institutional preferences. 

The **Student 360° Profile & Documents Vault (Phase B3, Days 31–45)** provides a unified single source of truth for every student enrolled with Aeterna Education. It replaces fragmented WhatsApp chats, scattered email attachments, and physical paper files with an auditable, branch-isolated, field-level governed repository.

Day 31 establishes the **formal data classification, profile section taxonomy, field-level access control rules, and compliance retention lifecycle** required prior to database schema implementation (Day 32) and API development (Day 33).

---

## 2. The 8 Core Student 360° Profile Sections

The Student 360° record is partitioned into eight functional sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   AETERNA ONE — STUDENT 360° RECORD                    │
├───────────────────┬───────────────────┬────────────────────────────────┤
│ 1. Identity &     │ 2. Academic       │ 3. Test Scores &               │
│    Contact        │    History        │    Language Proficiency        │
├───────────────────┼───────────────────┼────────────────────────────────┤
│ 4. Study Abroad   │ 5. Financial &    │ 6. University Shortlist        │
│    Preferences    │    Budget Profile │    & Target Matrix             │
├───────────────────┴───────────────────┴────────────────────────────────┤
│ 7. Active University Applications & Immigration Tracking               │
├────────────────────────────────────────────────────────────────────────┤
│ 8. Unified Counselling Notes, Audit Timeline & Activity Log            │
└────────────────────────────────────────────────────────────────────────┘
```

### Section 1: Core Identity & Contact Details (`identity_contact`)
* **Purpose:** Primary identification, communication channels, and emergency contact details.
* **Fields:** Student Full Name, Primary Email, Mobile Number (with country code), WhatsApp Number, Date of Birth, Gender, Nationality, Passport Number, Passport Expiry Date, Current Residential Address, City, State, Pin Code, Emergency Contact Person, Emergency Contact Phone & Relationship.
* **Integrity Constraints:** Email and normalized phone must be unique within active branch records; passport expiry must be valid $\ge 6$ months for visa eligibility.

### Section 2: Comprehensive Academic History (`academics`)
* **Purpose:** Historical scholastic trajectory evaluated by foreign university admissions committees.
* **Fields:** 
  * **Secondary (10th Standard / GCSE / Equivalent):** Institution Name, Board of Education, Year of Passing, Aggregate Percentage / CGPA.
  * **Higher Secondary (12th Standard / A-Levels / Equivalent):** Institution Name, Stream (Science / Commerce / Arts), Board, Passing Year, Percentage / CGPA, Key Subject Marks (e.g., Mathematics, English).
  * **Undergraduate Degree (Bachelor's / Diploma):** Degree Name (e.g., B.Tech Computer Science, B.Com, B.Sc), University / College Name, Country, Graduation Year, Final CGPA / Percentage, Number of Backlogs (Total & Active), Medium of Instruction (MOI).
  * **Postgraduate Degree (if applicable):** Master's Degree Name, University, CGPA, Passing Year.
  * **Work Experience:** Employing Organization, Designation, Employment Duration (Months), Nature of Work, Relieving Letter / Experience Proof status.

### Section 3: Standardized Test Scores (`test_scores`)
* **Purpose:** Quantitative aptitude and English language benchmarks required for university matriculation and visa approval.
* **Fields:**
  * **English Language Tests:** IELTS (Overall Band, Listening, Reading, Writing, Speaking, Test Date, TRF Number); TOEFL iBT (Total Score, Section Scores); PTE Academic (Overall, Communicative Skills); Duolingo English Test (DET).
  * **Aptitude & Graduate Tests:** GRE (Quantitative, Verbal, Analytical Writing, Date); GMAT (Overall Score, Quant, Verbal, IR, AWA); SAT / ACT (for undergraduate admissions).
  * **Status Tracking:** `not_taken`, `registered_scheduled`, `score_available`, `waived_by_institution`.

### Section 4: Study Abroad Preferences (`preferences`)
* **Purpose:** Strategic objectives guiding counsellor recommendations and university matching.
* **Fields:** Target Destination Countries (Primary: UK, USA, Canada, Australia, Ireland, Germany, Europe), Target Intake Term (e.g., Fall 2027, Spring 2028), Target Degree Level (Bachelor's, Master's, MBA, PhD), Target Study Areas (e.g., Data Analytics, International Business, Mechanical Engineering), Special Accommodations, Previous Visa Refusal History (Country, Year, Category).

### Section 5: Financial Capability & Budget Profile (`budget_financial`)
* **Purpose:** Funding viability assessment to prevent unviable applications and visa rejections.
* **Fields:** Maximum Annual Tuition Budget (INR / Foreign Currency equivalent), Maximum Annual Living Expense Budget, Planned Funding Sources (Family Savings, Education Loan, Government Scholarship, Institutional Bursary, Sponsorship), Education Loan Sanction Status (Not Applied, In Process, Sanctioned, Amount, Sanctioning Bank), Sponsor Relationship (Self, Father, Mother, Sibling, Relative).

### Section 6: University Shortlist & Selection Matrix (`shortlist`)
* **Purpose:** Structured tiered selection of institutions matched against student credentials.
* **Structure:** Tiered groupings (Ambitious / High-Reach, Moderate / Target, Safe / Safety-Net).
* **Fields per entry:** University Name, Target Program, Country, Campus Location, Estimated Tuition Fees, Application Deadline, Application Fee Required / Waived, Current Status (`draft`, `approved_by_student`, `applying`, `discarded`).

### Section 7: Active University Applications & Immigration Tracking (`applications`)
* **Purpose:** Operational pipeline execution tracking individual admissions submissions, conditional offers, and visa filings.
* **Fields per application:** University Name, Course Title, Portal Application ID, Date of Submission, Current Stage (`submitted`, `under_review`, `conditional_offer`, `unconditional_offer`, `rejected`, `withdrawn`), Offer Deadline, Deposit Amount & Due Date, CAS / I-20 / COE Number, Visa File Date, Visa Decision (`approved`, `refused`, `under_administrative_processing`).

### Section 8: Internal Notes, Activity Timeline & Audit Trail (`notes_timeline`)
* **Purpose:** Chronological, immutable audit events and counsellor advisory remarks.
* **Fields:** Event Timestamp, Staff Actor ID, Staff Actor Role, Event Type (`stage_transition`, `document_uploaded`, `document_verified`, `counsellor_note`, `call_logged`, `email_sent`), Note Content, Visibility Flag (`internal_staff_only`, `student_visible`).

---

## 3. Four-Tier Data Sensitivity Classification Model

Aeterna Overseas Education classifies all candidate data into four distinct sensitivity tiers. This model enforces the principle of least privilege (PoLP) and minimizes compliance exposure:

```
┌────────────────────────────────────────────────────────────────────────┐
│               DATA SENSITIVITY CLASSIFICATION MODEL                    │
├────────┬───────────────────────────┬───────────────────────────────────┤
│ Tier 1 │ Public / Operational Meta │ Low Sensitivity                   │
│ Tier 2 │ Internal CRM & Academics  │ Medium Sensitivity (Internal Only)│
│ Tier 3 │ Sensitive PII & Identity  │ High Sensitivity (Restricted PII) │
│ Tier 4 │ Financial & Confidential  │ Critical Sensitivity (SPI / Vault)│
└────────┴───────────────────────────┴───────────────────────────────────┘
```

### Tier 1: Public / Operational Metadata (Low Sensitivity)
* **Scope:** Information routinely shared with university representatives and non-confidential operational metadata.
* **Data Fields:** Candidate First Name & Initial, Target Country, Target Degree Level, Target Intake, Current Pipeline Stage, Assigned Branch.
* **Access Rules:** Visible to all authenticated staff (except Marketing who only view aggregated pipeline counts). Safe for kanban board preview cards.

### Tier 2: Internal CRM & Educational Records (Medium Sensitivity)
* **Scope:** Non-identifying scholastic records, test results, and general counselling notes.
* **Data Fields:** Academic grades, 10th/12th/Degree percentages, IELTS/GRE scores, University Shortlist, Application Status, Non-sensitive Counsellor remarks.
* **Access Rules:** Scoped strictly by branch. Visible to Branch Manager, Assigned Counsellor, and Application Officer. Excluded from public endpoints and marketing users.

### Tier 3: Sensitive Personally Identifiable Information — PII (High Sensitivity)
* **Scope:** Direct personal identifiers protected by privacy statutes (India DPDP Act 2023, GDPR Article 6).
* **Data Fields:** Full Legal Name, Personal Email, Direct Phone Number, Date of Birth, Complete Residential Address, Passport Number, National Identity Numbers, Emergency Contact details.
* **Access Rules:** Strict branch isolation. Visible only in full Student 360° drawer to authorized branch staff. Masked in general list projections (`email: p***@domain.com`, `passport: XXXX-XXXX-1234`). Never logged in security or application console logs.

### Tier 4: Confidential Financial & Document Vault Assets (Critical Sensitivity)
* **Scope:** Sensitive financial capabilities, bank statements, income affidavits, loan letters, and immigration refusal records.
* **Data Fields:** Bank account balances, sponsor tax records, salary slips, loan sanction letters, visa refusal letters, medical examination reports.
* **Access Rules:** Maximum restriction. Super Admin and Branch Manager have full view/download rights. Application Officers can view and verify for filing purposes. Education Counsellors view status only (`loan_sanctioned: true`, `funding_verified: true`) without direct exposure to raw financial statements. Download URLs are pre-signed with short TTL (max 15 minutes) and audited.

---

## 4. Field-by-Field Data Dictionary & Access Control

| Section | Field Name | Data Type | Sensitivity Tier | Counsellor | Application Officer | Branch Manager | Super Admin | Marketing |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity** | `studentName` | String | Tier 1 | View / Edit | View | View / Edit | View / Edit | Denied |
| **Identity** | `email` | String (Email) | Tier 3 (PII) | View / Edit | View | View / Edit | View / Edit | Denied |
| **Identity** | `phone` | String (E.164) | Tier 3 (PII) | View / Edit | View | View / Edit | View / Edit | Denied |
| **Identity** | `dob` | Date | Tier 3 (PII) | View / Edit | View | View / Edit | View / Edit | Denied |
| **Identity** | `passportNumber` | String | Tier 3 (PII) | Masked View | View / Edit | View / Edit | View / Edit | Denied |
| **Identity** | `passportExpiry` | Date | Tier 3 (PII) | View | View / Edit | View / Edit | View / Edit | Denied |
| **Academics** | `tenthScore` | Number / String| Tier 2 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Academics** | `twelfthScore` | Number / String| Tier 2 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Academics** | `undergradCgpa` | Number / String| Tier 2 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Academics** | `activeBacklogs` | Number | Tier 2 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Test Scores**| `ieltsOverall` | Number | Tier 2 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Test Scores**| `greTotal` | Number | Tier 2 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Preferences**| `destination` | String | Tier 1 | View / Edit | View | View / Edit | View / Edit | Denied |
| **Preferences**| `targetIntake` | String | Tier 1 | View / Edit | View | View / Edit | View / Edit | Denied |
| **Preferences**| `visaRefusals` | Boolean / Text | Tier 3 (PII) | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Financial** | `annualBudget` | Number | Tier 3 | View / Edit | View | View / Edit | View / Edit | Denied |
| **Financial** | `loanStatus` | Enum | Tier 3 | View / Edit | View / Edit | View / Edit | View / Edit | Denied |
| **Financial** | `bankStatements`| Vault Document | Tier 4 (Crit) | Status Only | View / Verify| Full / Download| Full / Download| Denied |
| **Shortlist** | `shortlistItems`| Array<Object> | Tier 2 | View / Edit | View | View / Edit | View / Edit | Denied |
| **Applications**|`portalAppIds` | String | Tier 2 | View | View / Edit | View / Edit | View / Edit | Denied |
| **Applications**|`casI20Number` | String | Tier 3 (PII) | View | View / Edit | View / Edit | View / Edit | Denied |
| **Notes** | `internalNotes` | Array<Object> | Tier 2 | View / Add | View / Add | View / Add | View / Add | Denied |

---

## 5. Branch Isolation & Multi-Branch Governance

Aeterna One operates physical operations in **Bengaluru (HQ)**, **Mysuru**, and **Belagavi**. The student data governance framework strictly enforces branch containment:

1. **Assigned Branch Immutable Binding:**
   * Every student record is bound to an official operating branch (`branch: 'bengaluru' | 'mysuru' | 'belagavi'`).
   * A counsellor or branch manager in Mysuru cannot search, read, select, or mutate students registered under Bengaluru or Belagavi.
   * Cross-branch access attempts are caught by `requireBranchAccess()` and return **HTTP 403 Forbidden**.
2. **Super Admin Cross-Branch Authority:**
   * `super_admin` possesses global visibility (`req.branchScope = null`).
   * Super Admins can filter across all branches or scope down to a specific branch via query parameter `?branch=mysuru` without hard-switching user sessions.
3. **Student Branch Transfer Protocol:**
   * If a student physically relocates (e.g., student registered in Belagavi moves to Bengaluru for university mock interviews), branch reassignment is an administrative event:
   * Only `super_admin` or `branch_manager` can execute a branch transfer.
   * Transfer triggers an immutable audit log entry: `Branch transferred from [Belagavi] to [Bengaluru] by [Manager Name] on [Date]`.

---

## 6. Data Retention, Anonymization & Soft-Delete Lifecycle

In compliance with international educational records standards and data privacy mandates:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      STUDENT DATA LIFECYCLE                            │
├───────────────┬───────────────────────────────┬────────────────────────┤
│ Active        │ Enrolled / Archived           │ Anonymized             │
│ (0 – 2 Years) │ (2 – 5 Years Post-Enrollment) │ (5+ Years Post-Exit)   │
├───────────────┼───────────────────────────────┼────────────────────────┤
│ Active CRUD   │ Read-Only Compliance Archive  │ PII Scubbed, Analytics │
│ by Branch     │ Restricted to Branch Managers │ Aggregate Preserved    │
└───────────────┴───────────────────────────────┴────────────────────────┘
```

1. **Active Recruitment Window (0–2 Years):** Full operational access for admissions processing, document collection, visa filing, and pre-departure support.
2. **Regulatory Retention Window (2–5 Years Post-Enrollment):** Records archived in read-only state for university commission reconciliation, accreditation audits, and student re-application / alumni tracking.
3. **Right to Erasure / Anonymization (Post-5 Years or on Valid Request):**
   * Sensitive PII fields (`email`, `phone`, `passportNumber`, `dob`, `address`, `emergencyContact`) are permanently scrubbed and overwritten with cryptographic hashes (`student_anon_8f9e...`).
   * High-level non-identifiable demographic and performance data (Destination, Programme, Passing Year, Intake, Branch) is preserved in aggregate reporting collections for conversion funnel benchmarking (satisfying Rule 20 data minimization).
4. **Soft-Delete Only:** Direct hard-deletes (`deleteMany()` or raw collection drops) are strictly forbidden in production. Records set `isDeleted: true`, recording deleting actor and reason.

---

## 7. Phase B3 Implementation Roadmap (Days 32–35)

With the requirements, field dictionary, data tiers, and RBAC rules formally specified on Day 31, Phase B3 proceeds according to the following schedule:

* **Day 32: Student Profile Model & Lead Conversion Architecture**
  * Implement Mongoose schema `server/src/modules/students/student.model.js` reflecting the 8 core sections.
  * Define automated conversion pipeline: converting an admissions pipeline candidate to a full Student 360° record with preserved audit history.
  * Establish compound indexes: `{ branch: 1, studentName: 1 }`, `{ branch: 1, email: 1 }`, `{ 'academics.graduationYear': 1 }`.
* **Day 33: Student Profile APIs & Field Projections**
  * Implement `GET /api/v1/students` (paginated, branch-scoped, projection allowlisted).
  * Implement `GET /api/v1/students/:id` with field filtering based on requester role.
  * Implement `PATCH /api/v1/students/:id` with immutable system field protections.
* **Day 34: Student 360° Overview UI**
  * Build responsive slide-over drawer and comprehensive student overview page in `client/src/pages/StudentDetailPage.jsx`.
  * Deliver tabbed interface matching the 8 sections with loading skeletons and empty states.
* **Day 35: Standardized Test Scores & Academic History Verification**
  * Add validation rules for IELTS bands (0–9), TOEFL (0–120), GRE (260–340), and CGPA conversions.
  * Build unit and integration tests asserting schema integrity and role-level field masking.

---

## 8. Verification & Acceptance Sign-Off

* [x] **Section Architecture Approved:** All 8 profile sections (Identity, Academics, Tests, Preferences, Financial, Shortlist, Applications, Notes) fully documented with field names and data types.
* [x] **Four-Tier Sensitivity Classification:** Established clear boundaries from Public Metadata (Tier 1) through Confidential Financial Assets (Tier 4).
* [x] **Role Matrix Verified:** Exact alignment with `docs/ROLE_PERMISSION_MATRIX.md` and `permissions.js`; Marketing role strictly denied access to student profiles.
* [x] **Branch Governance Defined:** Bengaluru, Mysuru, Belagavi isolation enforced; Super Admin global authority documented.
* [x] **Retention Policy Established:** 5-year compliance archive with soft-delete and PII anonymization standards.

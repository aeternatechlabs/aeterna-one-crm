# End-to-End Workflows

Verified by the OpenCode test suite (HTTP-level, ephemeral listener,
`server/test/opencode-*.test.js`) — see `testing.md`.

## 1. Login

```
POST /api/v1/auth/login { email, password }        (public, rate-limited)
  → email format validated (400 on malformed)
  → findOne(+password).select('+password')
  → unknown email OR wrong password → identical 401
    "Invalid email or password." (no user enumeration)
  → isActive=false → 403 "account deactivated"
  → bcrypt.compare OK
  → devil generateTokens(user) → access (HS256, JWT_SECRET) + refresh
  → res.cookie('accessToken', ..., httpOnly, sameSite, maxAge) + refresh cookie
  → 200 { success, statusCode, message, token, refreshToken, user:{role,branch,...no password} }
Client: NO localStorage token (F-02 fixed — httpOnly cookie only);
axios is `withCredentials` and sends `Bearer` if a token is in memory;
401 → interceptor clears cached user → `isAuthenticated=false`.
```

Session death paths (all → 401/403 with clean JSON, no stack outside dev):
missing token, garbage token, wrong secret, `exp` past, `alg:none`,
tampered payload, deleted user (401 "user no longer exists"),
deactivated user (403), missing JWT_SECRET (500 fail-closed).

## 2. Staff registration (super-admin only)

```
POST /api/v1/auth/register  (protect → requireRole(super_admin) → validate)
  anon                → 401
  non-super role      → 403 (RBAC runs BEFORE body validation — invalid
                         bodies from non-super also get 403; no user created)
  super + valid body  → 201, User doc with bcrypt hash (cost 10),
                         NO token issued (cannot hijack admin session)
  duplicate email     → 409
  branch:'all'+non-super role → 400 (cross-field validator)
  bad role/branch/short password → 400
```

## 3. Pipeline read (branch-scoped)

```
GET /api/v1/pipeline?branch=&stage=&search=&page=&limit=&fields=
  protect → requireBranchAccess() → requireRole(4 roles) → getPipeline

requireBranchAccess resolution (Day 4 hardened — types normalized first):
  super or branch='all':
      raw = query.branch || params.branch || x-branch header
      branchScope = string → trim/lowercase | string[] → [0] | else → null
  restricted user:
      raw = query.branch || params.branch || body.branch
      requested = string → trim/lowercase | else → String(raw)
                  ('[object object]', 'a,b' for arrays)
      if requested && requested !== own && requested !== 'all' → 403
      branchScope = own branch  (x-branch ignored; ?branch=all forced own)
  net effect: ?branch[$ne]=..., branch[]=..., body { $gt:'' } / ['x'] are
  all neutralised — object/array inputs never reach the Mongo filter.

controller: filter by branchScope (when set) + stage + search (escaped +
validated → 400 — F-08 fixed), projection = fields allowlist (F-06/F-06R
fixed) or -stageHistory -__v,
devil paginate(page, limit capped at 100 in user.controller — F-05 fixed).
marketing role → 403 at requireRole.
```

## 4. Stage move (guarded write & 16-stage state machine)

```
PATCH /api/v1/pipeline/:id/stage  { stage (or toStage), reason?, expectedStage?, simulateError?, deferredIntake? }
  protect → requireBranchAccess() → requireRole(super, manager, counsellor)

  x-simulate-validation-error header OR simulateError:true → 400
    "Stage transition rejected: Simulated validation error..." (no mutation — rollback demo)
  invalid stage (not in PIPELINE_STAGES) → 400
  id not ObjectId → 400; not found → 404
  record branch ≠ user branch (non-super, branchScope≠'all') → 403
  
  State Machine & Document Gate Validation (Day 30 verified):
  - 16-stage lifecycle: New → Contacted → Qualified → Counselling Booked →
    Counselling Completed → Shortlisted → Application Started → Documents Complete →
    Submitted → Offer Received → Deposit Paid → Visa Filed → Visa Decision →
    Pre-departure → Enrolled / Deferred / Lost.
  - Document verification gate: target is submission stage (submitted, application_submitted)
    without documentsVerified:true → 400 ("student documents must be verified first").
  - Exit stages (lost, deferred): reason missing or <5 chars → 400.
  - Deferred optional intake: deferredIntake string persisted to record.
  - Reopening gate: candidate currently in lost or deferred cannot be reopened
    by counsellor, marketing, or application_officer → 403 ("Only Super Admin or Branch Manager can reopen").
  - Concurrency conflict (SEC-07): client expectedStage ≠ DB stage → 409 Conflict.
  - Atomic commit: findOneAndUpdate with atomicFilter guarantees state and documentsVerified in single DB op.
  → update stage, $push stageHistory {fromStage,toStage,changedAt,changedBy,reason}
  → 200 { student updated, stage, branch, documentsVerified }
```

Docs toggle: `PATCH /:id/documents` — roles super/manager/application_officer
(counsellor & marketing 403); 404 / branch record guard; explicit boolean else toggle.

## 5. Create pipeline student

```
POST /api/v1/pipeline  { studentName, email, programme, destination, branch? }
  super: may pass any valid branch; super with NO branch in body hits
         model enum ['bengaluru','mysuru','belagavi'] (no 'all') → 400
         "Validation Error" (quirk — tested)
  restricted: forced to own branch; body branch='all'/other → 403
  missing required fields → 400
  → 201 with created doc (no stageHistory/__v in default response)
```

## 6. User directory

```
GET /api/v1/users?page=&limit=&search=&role=&branch=&fields=
  protect → requireRole(super, branch_manager) → requireBranchAccess()
    → getUsers. branchScope filters branch. Marketing 403, anon 401.
  password never serialized (schema select:false — independent of F-07).
```

## 7. Frontend session flow

1. App mounts → `AuthProvider` calls `GET /me` with cookie.
2. 200 → `user` set (role/branch drive NAV_ITEMS + ProtectedRoute).
   401 → interceptor clears localStorage → `isAuthenticated=false`.
3. `ProtectedRoute`: loading spinner → no auth → `/login` (state.from) →
   role not in `allowedRoles` → `/unauthorized`.
4. Pipeline mutations: optimistic cache move → server confirm/rollback.

## 8. Health

`GET /health` (outside rate limiter) and `GET /api/v1/health` →
200 JSON with `database: 'connected'` and `status: 'healthy'`, or
**503** with `status: 'unhealthy'` when the DB is down (F-03 fixed).

## 9. Student 360° Profile & Data Classification Lifecycle (Phase B3 Day 31)

```
8 Profile Sections:
  1. Identity & Contact (Core PII, Tier 3)
  2. Academic History (Tier 2)
  3. Standardized Test Scores (Tier 2)
  4. Financial Capability & Budget (Confidential Financial Assets, Tier 4)
  5. Study Abroad Preferences (Operational, Tier 2)
  6. University Shortlist (Operational, Tier 2)
  7. Active Applications (Operational, Tier 2)
  8. Internal Notes & Timeline (Internal CRM, Tier 2)

4-Tier Data Sensitivity Model (India DPDP Act 2023 / GDPR / FERPA):
  - Tier 1: Public / Operational Metadata (studentId, branch, status)
  - Tier 2: Internal CRM & Academic History (degrees, GPA, test scores, shortlists)
  - Tier 3: Sensitive PII (passport, national ID, full DOB, residential address)
  - Tier 4: Confidential Financial / Vault Assets (bank statements, sponsor affidavits, ITRs)

RBAC & Branch Containment:
  - Super Admin: full access across all 4 tiers and all branches.
  - Branch Manager: full access within own branch; masked Tier 4 view.
  - Counsellor: read/write Tier 1-3, view-only Tier 4 within own branch.
  - Application Officer: full read across Tier 1-4 for visa filing; no delete.
  - Marketing: 0 access (strictly forbidden across all 4 tiers).

Retention & Deletion Lifecycle:
  - Active: Enrolled + 5 years compliance retention.
  - Inactive / Lost: Soft-delete + DPDP/GDPR PII anonymization after 180 days retention.
```

## 10. Lead-to-Student Conversion & Attribution Engine (Phase B3 Day 32)

```
Lead Conversion Flow:
  convertLeadToStudent({ lead, user, conversionNotes, additionalProfileData })
    │
    ├── 1. Branch Authorization Guard
    │     Non-super user branch ≠ lead.branch → 403 / CROSS_BRANCH_CONVERSION_FORBIDDEN
    │
    ├── 2. Duplicate Check Rule A (Lead Already Converted)
    │     lead.convertedToStudent OR Student.findOne({ 'conversionSource.originalLeadId': lead._id })
    │     → duplicate: true, code: 'LEAD_ALREADY_CONVERTED'
    │
    ├── 3. Duplicate Check Rule B (Same-Branch Email Collision)
    │     Student.findOne({ branch: lead.branch, email: normalizedEmail, isDeleted: false })
    │     → duplicate: true, code: 'DUPLICATE_STUDENT_EMAIL'
    │
    ├── 4. Unique Student ID Generation
    │     AET-{BRANCH_CODE}-{YEAR}-{4_HEX_CHARS} (e.g., AET-BLR-2026-9E3F)
    │
    ├── 5. 8-Section Profile Assembly
    │     - identity (studentName, email, phone, dob, address, passport)
    │     - academics (degrees, GPA, backlogs, records)
    │     - testScores (IELTS, TOEFL, PTE, GRE, GMAT, etc.)
    │     - financial (annual budget, funding source, loan status, sponsor)
    │     - preferences (countries, degree level, fields of study, intakes)
    │     - shortlist (target universities mapped from candidate lead)
    │     - applications (active application status if stage >= application_started)
    │     - notes (consolidated lead notes + conversion remarks)
    │
    ├── 6. Immutable Source Attribution
    │     - originalLeadId, originalSource, convertedAt, convertedBy, convertedByName,
    │       initialStageAtConversion, leadCreatedAt
    │
    └── 7. Atomic Backlink & Audit Log
          - lead.convertedToStudent = student._id
          - lead.stageHistory.push("Lead converted to Student 360 profile (studentId)")
```

## 11. Student 360° Overview UI Workflow (Phase B3 Day 34)

```
Student 360° Frontend Flow:
  1. Route Access (/students & /students/:id):
     - Double-guarded by ProtectedRoute: super_admin, branch_manager, counsellor, application_officer.
     - Marketing strictly redirected to /unauthorized.
  2. Directory Mode:
     - Search input with global caret typing animation.
     - Branch filter (super_admin has 'all', branch staff restricted to own branch).
     - Status filter (active, enrolled, archived, withdrawn).
     - Responsive student cards displaying studentId, destination, and counsellor.
  3. Detailed Profile Mode (/students/:id):
     - StudentHeader: studentId badge, status, branch dot, email/phone contact pills, action buttons.
     - StudentKeyFacts: 6-card summary (Destination, Degree, CGPA/Backlogs, Tests, Budget/Loan, Applications).
     - StudentTabs: 8 section panels (Overview, Academics, Tests, Preferences, Shortlist, Applications, Financial, Notes).
     - Role-Based Field Masking:
       * Counsellor: passportNumber masked ('****1234'), sponsor income hidden.
       * Branch Manager & Super Admin: full unmasked access.
     - AddNoteModal: category select + consultation remarks submitted via TanStack mutation.
     - Shimmer Skeletons: rendered during initial fetch and cache transitions.
```

## 12. Document Vault & Verification Gate Workflow (Phase B3 Days 35–44)

```
Document Vault & Compliance Gate Flow:
  1. File Upload (Days 37-38):
     - Client requests upload intent: POST /api/v1/students/:id/vault/upload-intent
     - Server validates MIME allowlist (PDF, JPEG, PNG, WEBP), 10MB ceiling, and generates canonical private storageKey:
       vault/{branch}/{studentId}/{category}/{timestamp}_{random}_{sanitizedFileName}
     - Client uploads file buffer via secure proxy POST /api/v1/students/:id/vault/upload
     - Server inspects binary magic bytes (%PDF-, 0xFFD8FF, 0x89PNG, RIFF...WEBP) to prevent MIME spoofing
     - Buffer written to storage adapter (Cloudflare R2/S3 or Sandboxed Local Driver)
     - Document record saved (isVerified: false); DOCUMENT_UPLOADED audit event logged.

  2. Secure Viewing & Download (Day 39):
     - Client calls GET /api/v1/students/:id/vault/:docId/download or /preview
     - Server checks role & branch containment, creates HMAC-SHA256 signed access token (15-minute TTL)
     - Signed delivery endpoint GET /api/v1/vault-storage/file?token=... verifies token signature with timingSafeEqual
     - Streams file with strict headers:
       * Content-Disposition: attachment; filename="..." (or scoped inline)
       * Cache-Control: private, no-store
       * X-Content-Type-Options: nosniff

  3. Verification Gate & Pipeline Synchronization (Day 40):
     - Reviewer calls PATCH /api/v1/students/:id/vault/:docId/verify
     - Role Check: Super Admin, Branch Manager, Application Officer allowed; Counsellor receives 403 Forbidden.
     - Document marked isVerified: true, verifiedBy: req.user._id, verifiedAt: new Date().
     - syncPipelineDocumentGate checks if mandatory categories (passport_identity, academic_transcripts, financial_affidavits) are all verified.
     - When all 3 are verified, linked PipelineStudent.documentsVerified is atomically updated to true, unlocking the admissions submission gate!

  4. Retention & Soft-Deletion Lifecycle (Day 42):
     - DELETE /api/v1/students/:id/vault/:docId restricted to Super Admin & Branch Manager (403 for Counsellor & Officer).
     - Document marked isDeleted: true, deletedAt: new Date(), deletedBy: req.user._id.
     - Pipeline document gate re-evaluated; DOCUMENT_SOFT_DELETED audit event logged.
```

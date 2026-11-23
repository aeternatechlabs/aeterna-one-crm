# API Reference (v1)

Mounts: `/api/v1/*` (primary) and `/api/*` (alias — same router).
All responses: `{ success: true|false, statusCode, message?, ...payload }`
(devil `ApiResponse` spread — payload at TOP level; read with dual pattern
`data?.data?.x || data?.x`). Errors: `{ success:false, statusCode, message,
errors?, stack? (dev only) }` → **F-04 fixed:** `stack` is NEVER serialized in
any environment (dev stacks go to `console.error` only).

Legend: 🔓 public · 🔒 protect · roles = `requireRole` · branch = `requireBranchAccess`.

## Auth — `modules/auth/auth.routes.js`

| Method & Path | Chain | Notes |
| :-- | :-- | :-- |
| `POST /auth/login` | 🔓 + validator | Body `{email,password}`; generic 401; inactive 403; sets httpOnly cookies; returns `token`, `refreshToken`, `user` |
| `POST /auth/register` | 🔒 → roles[super_admin] → validator | Creates staff, NO token; 201/403/401/409/400; cross-field `branch:'all'` super-only |
| `GET /auth/me` | 🔒 | Current user (DB lookup, no password) |
| `POST /auth/logout` | 🔓 | Clears cookies |

## Users — `modules/users/user.routes.js`

| Method & Path | Chain | Notes |
| :-- | :-- | :-- |
| `GET /users` | 🔒 → roles[super_admin, branch_manager] → branch | Query: `page` (invalid → 1), `limit` (default 10, capped at 100 — F-05 fixed), `search` (regex name/email, escaped + validated → 400 — OBS-1 fixed), `role`, `branch`, `fields` (allowlisted — F-07 fixed); returns `{data, pagination:{total,page,limit,totalPages}}` |

## Pipeline — `modules/pipeline/pipeline.routes.js`

Chain order: 🔒 → branch → roles → controller.

| Method & Path | Roles | Notes |
| :-- | :-- | :-- |
| `GET /pipeline` | super_admin, branch_manager, counsellor, application_officer | Filters `branch`, `stage`, `search` (escaped + validated → 400 — F-08 fixed), `page`, `limit`, `fields` (allowlisted — F-06/F-06R fixed); default excludes `stageHistory`, `__v` |
| `POST /pipeline` | super_admin, branch_manager, counsellor | Requires `studentName`, `email`, `programme`, `destination`; restricted forced own branch (403 on cross); super w/o body branch → 400 enum quirk |
| `PATCH /pipeline/:id/stage` | super_admin, branch_manager, counsellor | Body `{stage, reason?, expectedStage?, simulateError?, deferredIntake?}`; header `x-simulate-validation-error`; 16-stage state machine matrix check; docs-gate requires `documentsVerified:true` for submission; exit stages (`lost`/`deferred`) require reason ≥ 5 chars; reopening `lost`/`deferred` restricted to super_admin and branch_manager (counsellor 403); optimistic concurrency returns 409 Conflict on stage mismatch; record-branch 403; appends `stageHistory` |
| `PATCH /pipeline/:id/documents` | super_admin, branch_manager, application_officer | Body `{documentsVerified}` optional (toggle if absent); 404 + record-branch guard; counsellor → 403 |

## Students — `modules/students/student.routes.js`

Chain order: 🔒 → branch → roles → controller.

| Method & Path | Roles | Notes |
| :-- | :-- | :-- |
| `GET /students` | super_admin, branch_manager, counsellor, application_officer | Paginated, branch-scoped student directory. Query: `page`, `limit` (max 100), `search` (escaped regex), `branch`, `status`, `fields` (allowlist validated → 400 on illegal fields). Excludes soft-deleted (`isDeleted: false`). Role-based masking applied. |
| `GET /students/:id` | super_admin, branch_manager, counsellor, application_officer | Full Student 360° profile. Record-level branch containment guard (403 on foreign branch). Counsellor role receives masked passport (`****1234`) and sanitized sponsor income. |
| `POST /students` | super_admin, branch_manager, counsellor | Direct student profile creation. Auto-generates unique `studentId` (`AET-BLR-2026-XXXX`). Restricted staff forced to own branch (403 on foreign branch). System-managed fields strictly rejected (400). Duplicate email within branch rejected (409). |
| `PATCH /students/:id` | super_admin, branch_manager, counsellor | Update profile sections (`identity`, `academics`, `testScores`, `financial`, `preferences`, `shortlist`, `applications`). System-managed fields (`studentId`, `branch`, `conversionSource`) strictly rejected with 400. Administrative fields (`status`, staff assignment) restricted to Manager/Super (counsellor 403). Foreign branch record returns 403. |
| `POST /students/:id/notes` | super_admin, branch_manager, counsellor | Add internal note to timeline. Body: `{content, category?}`. Branch-scoped (403 on foreign). Captures author ID and name. |
| `POST /students/convert-lead` | super_admin, branch_manager, counsellor | Convert pipeline lead into Student 360° record via conversion engine. Preserves immutable source attribution, updates source lead with backlink and stage history audit, rejects duplicate conversions (409). |
| `POST /students/:id/academics` | super_admin, branch_manager, counsellor | Add qualification record (10th, 12th, Bachelor's, GPA, backlogs). Validated against academic standards (`academicValidation.js`). Audit event `ACADEMIC_RECORD_ADDED`. |
| `POST /students/:id/test-scores` | super_admin, branch_manager, counsellor | Add standardized test score (IELTS, TOEFL, PTE, Duolingo, GRE, GMAT). Rigorous score range & chronological date validation. Audit event `TEST_SCORE_ADDED`. |
| `PATCH /students/:id/test-scores/:scoreId/verify` | super_admin, branch_manager, application_officer | Verify standardized test score & TRF number. Counsellor strictly 403. Audit event `TEST_SCORE_VERIFIED`. |
| `PATCH /students/:id/financial` | super_admin, branch_manager, counsellor | Update budget, currency, funding sources, loan status, sponsor details, visa refusal disclosure. Currency validated. Loan sanction/disbursal gate restricted to Manager/Admin (counsellor 403). Audit events `FINANCIAL_BUDGET_UPDATED`, `LOAN_SANCTION_UPDATED`, `VISA_REFUSAL_UPDATED`. |
| `PATCH /students/:id/preferences` | super_admin, branch_manager, counsellor | Update destination countries, degree levels, study fields, target intake. Audit event `PREFERENCES_UPDATED`. |
| `POST /students/:id/applications` | super_admin, branch_manager, counsellor, application_officer | Add multi-university target application record (Day 43). Tracks university, programme, country, portal ID, submission date, status. |
| `PATCH /students/:id/applications/:appId` | super_admin, branch_manager, application_officer | Update application status, conditional/unconditional offers, CAS/I-20 identifiers, and visa progress (Day 43). |

## Document Vault & Storage — `modules/vault/vault.routes.js`

Chain order: 🔒 → branch → roles → controller. Mounted at `/api/v1/students/:id/vault/*` and `/api/v1/vault-storage/*`.

| Method & Path | Roles | Notes |
| :-- | :-- | :-- |
| `POST /students/:id/vault/upload-intent` | super_admin, branch_manager, counsellor, application_officer | Generate short-lived signed upload token (15m TTL). Validates file metadata allowlists (PDF, JPEG, PNG, WEBP, max 10MB). Audit event `DOCUMENT_UPLOAD_INTENT`. |
| `POST /students/:id/vault/upload` | super_admin, branch_manager, counsellor, application_officer | Secure upload proxy with binary magic byte signature verification (`verifyFileMagicBytes`), path traversal prevention, and private bucket keying (`vault/{branch}/{studentId}/{category}/{prefix}_{name}`). Audit event `DOCUMENT_UPLOADED`. |
| `GET /students/:id/vault` | super_admin, branch_manager, counsellor, application_officer | List student vault documents with checklist status. Computes `isChecklistComplete` for mandatory categories (`passport_identity`, `academic_transcripts`, `financial_affidavits`). |
| `GET /students/:id/vault/:docId/download` | super_admin, branch_manager, counsellor, application_officer | Generates HMAC-SHA256 signed download URL with 15-minute TTL and `Content-Disposition: attachment`. Audit event `DOCUMENT_DOWNLOAD_REQUESTED`. |
| `GET /students/:id/vault/:docId/preview` | super_admin, branch_manager, counsellor, application_officer | Generates HMAC-SHA256 signed preview URL with 15-minute TTL and scoped `Content-Disposition: inline`. Audit event `DOCUMENT_PREVIEW_REQUESTED`. |
| `PATCH /students/:id/vault/:docId/verify` | super_admin, branch_manager, application_officer | Verification gate. Counsellor and marketing strictly 403. Automatically synchronizes pipeline submission stage gate (`PipelineStudent.documentsVerified`). Audit event `DOCUMENT_VERIFIED` / `DOCUMENT_VERIFICATION_REJECTED`. |
| `DELETE /students/:id/vault/:docId` | super_admin, branch_manager | Document soft-delete lifecycle. Application officer and counsellor strictly 403. Re-evaluates pipeline documents gate. Audit event `DOCUMENT_SOFT_DELETED`. |
| `GET /vault-storage/file` | 🔓 (Signed Token Auth) | Constant-time HMAC-SHA256 signed token verification with expiry validation. Serves binary with strict `nosniff`, `Cache-Control: private, no-store`, and sanitized `Content-Disposition`. |

## Health — `modules/health/health.routes.js`

| Method & Path | Auth | Notes |
| :-- | :-- | :-- |
| `GET /health` | 🔓 | Top-level mount (NOT under `/api`, outside rate limiter) |
| `GET /api/v1/health` | 🔓 | Same handler; `status` derived from live DB state — 200 `healthy` / 503 `unhealthy` (F-03 fixed) |

## Cross-cutting HTTP behavior (verified)

- **Rate limit:** 100 req / 15 min / IP on all `/api` paths (both mounts);
  429 JSON + `RateLimit-*` headers (`X-RateLimit-*` disabled).
- **Security headers:** helmet 7.2 → `Content-Security-Policy`,
  `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy`, etc.
  No `X-Powered-By` (express `x-powered-by` off/absent — verified, not a finding).
- **CORS:** `credentials: true`; allowlist `http://localhost:3000`,
  `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`
  + `CLIENT_URL`/`FRONTEND_URL` (folded in at load time); **dev wildcard is
  opt-in only** — `CORS_ALLOW_ALL_DEV=true` AND `NODE_ENV==='development'`
  (F-01 fixed, default deny); unknown origin → 500 `Not allowed by CORS
  policy` JSON w/o stack.
- **404:** JSON `{success:false, statusCode:404, message:'API endpoint <m> <u> does not exist'}`.
- **Branch parameter (Day 4 hardened):** `branch` is read from query, params,
  body — and `x-branch` header **only on the super/global path**. Every value
  is type-normalized before use (string → trim+lowercase; array → first
  element for super, `String()` join for restricted; object → `null` for
  super, `'[object Object]'` for restricted). A restricted user sending
  `?branch=all`, a foreign branch, `?branch[]=x`, `?branch[$ne]=null`, or a
  JSON body `branch` object/array gets **403**; with no param their scope is
  forced to `req.user.branch`. Record-level writes re-check the DB row, so a
  spoofed `x-branch` on a mutation still 403s.
- **Preflight:** `Access-Control-Allow-Headers` = `Content-Type,
  Authorization, Accept, X-Requested-With, x-branch` (no
  `x-simulate-validation-error` — that header is not CORS-gated on
  same-origin dev requests).

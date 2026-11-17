# AETERNA ONE CRM — Master 90-Day Task Tracker (`task.md`)

**Project:** Aeterna One CRM (`aeterna-one-crm`)  
**Business:** Aeterna Overseas Education Consultancy (Bengaluru HQ, Mysuru, Belagavi)  
**Architecture:** Production MERN Stack (React 19 + Vite 8, Node.js 22 + Express, MongoDB + Mongoose)  
**Mandatory Packages:** `devil-backend-nodejs` (v4.1.0) & `devil-frontend` (v1.0.4)  
**Rules & Contracts:** `RULES.md` (20 mandatory architectural rules) & `AETERNA_ONE_90_DAY_DETAILED_ROADMAP.md`  
**Last Updated:** 16 November 2026 (API Shield & Smart Error Engine Implemented)  

---

## 📊 Executive Progress Dashboard

| Milestone / Phase | Day Range | Scope | Status | Completion % |
| :--- | :--- | :--- | :--- | :--- |
| **Phase P0 (Security)** | — | Critical Security Audit Remediation & Hardening | **COMPLETED & VERIFIED** | **100%** |
| **P0-VERIFY (Independent)** | — | OpenCode HTTP-Level Security Verification & Knowledge Base | **COMPLETED & VERIFIED** | **100%** |
| **P1-VERIFY (F-01/F-05)** | — | Independent Verification of P1 Hardening Fixes | **COMPLETED & VERIFIED** | **100%** |
| **Phase P2 (Hardening Batch)** | — | Remediate 7 Findings (F-04, F-03, F-06, F-08, F-07, F-09, F-02, P3) | **COMPLETED & VERIFIED** | **100%** |
| **P2-VERIFY (Independent)** | — | OpenCode Independent Verification of P2 Batch | **COMPLETED (8 PASS / 0 FAIL)** | **100%** |
| **LOGIN-UI-VERIFY (Section 6)** | — | Independent Verification of Premium Login Page UI/UX Redesign | **COMPLETED (58/58 PASS)** | **100%** |
| **REFRESH-VERIFY (Section 7)** | — | Independent Verification of Day 3 Session Refresh & Invalidation | **COMPLETED (16/16 PASS)** | **100%** |
| **DAY4-BE-VERIFY** | — | Independent Verification of Day 4 Backend Authorization Hardening | **COMPLETED (24/24 + 30/30 PROBE)** | **100%** |
| **Phase A (Foundation)** | **Days 1–5** | Architecture Foundation & Base Infrastructure | **COMPLETED & VERIFIED (Days 1–5)** | **100%** |
| ↳ Day 1 | Day 1 | Repository Baseline & Architecture Confirmation | **COMPLETED & VERIFIED** | 100% |
| ↳ Day 2 | Day 2 | Server Foundation & Environment Safety | **COMPLETED & VERIFIED** | 100% |
| ↳ Day 3 | Day 3 | Authentication & Session Lifecycle | **COMPLETED & VERIFIED** | 100% |
| ↳ Day 4 | Day 4 | RBAC, Branch Isolation & Reusable UI Foundation | **COMPLETED & VERIFIED** | 100% |
| ↳ Day 5 | Day 5 | Foundation Verification & Handover | **COMPLETED & VERIFIED** | 100% |
| **Phase B1 (Lead Management)** | **Days 6–18** | Multi-Channel Ingestion, Lead Scoring & Routing | **UNLOCKED — PENDING DISPATCH** | **0%** |
| **Phase B2 (Admissions Pipeline)** | **Days 19–30** | 16-Stage Pipeline, Kanban Engine & Document Gates | **PROTOTYPE STAGED (Days 19–30 Gates Pending)** | **Stage Engine 80% / Gates 0%** |
| **Phase B3 (Student 360° & Vault)** | **Days 31–45** | Student 360° Profile, Cloud Object Storage & Vault | **PENDING** | **0%** |
| **Phase B4 (Tasks & Comms)** | **Days 46–60** | Tasks Queue, SLA Escalations & Provider Readiness | **PENDING** | **0%** |
| **Phase B5 (Reports & Analytics)** | **Days 61–75** | Branch Scorecards, Funnel Analytics & Optimization | **PENDING** | **0%** |
| **Phase B6 (Hardening & Pilot)** | **Days 76–90** | Security Regression, UAT, Staff Training & Launch | **PENDING** | **0%** |

---

## 🛡️ COMPLETED SECURITY AUDITS & FOUNDATION REMEDIATIONS

### Phase P0: Critical Security Audit Remediation & Hardening (COMPLETED & VERIFIED)

- [x] **P0-TEST-000: Node.js Built-in Test Runner & Test Harness**
  - [x] Replaced no-op echo script in `server/package.json` with native `node --test test/**/*.test.js`.
  - [x] Built test harness (`server/test/helpers/testApp.js`) with isolated in-memory `mockReqRes` utility (0 external socket dependencies, sandbox-resilient).
  - [x] Verified test runner executes assertions and exits nonzero on failure (`server/test/p0-security-harness.test.js`).

- [x] **P0-SEC-003: Fail-Closed Secrets & Removal of Unsafe Demo Behavior**
  - [x] Removed hardcoded fallback signing key (`aeterna_default_jwt_secret_key_2026`) across server modules (`auth.controller.js`, `authMiddleware.js`).
  - [x] Enforced fail-closed validation on startup (`server/src/server.js`): missing `PORT`, `MONGO_URI`, or `JWT_SECRET` immediately stops server with `process.exit(1)`.
  - [x] Removed automatic `seedDemoUsers()` on startup from `server/src/server.js`.
  - [x] Removed automatic demo user provisioning on failed login in `auth.controller.js`.
  - [x] Removed `ensureSeedStudents()` data pollution from `GET /api/v1/pipeline`.
  - [x] Enforced strict projection allowlist on `fields` in `user.controller.js` ensuring `-password -__v` can never be selected or leaked.
  - [x] Verified zero occurrences of fallback secret in codebase (`server/test/p0-sec-003.config-demo.test.js`).

- [x] **P0-SEC-001: Safe Staff Provisioning & Public Privilege Escalation Elimination**
  - [x] Protected `POST /api/v1/auth/register` behind `protect` and `requireRole(ROLES.SUPER_ADMIN)` in `auth.routes.js`.
  - [x] Unauthenticated registration requests are rejected with 401; non-super-admin requests are rejected with 403 Forbidden.
  - [x] Added cross-field validator in `auth.validator.js`: staff cannot be assigned `branch: 'all'` unless role is `super_admin`.
  - [x] `register` controller provisions staff without issuing or setting tokens to overwrite administrator session.
  - [x] Verified all authorization matrix cases in `server/test/p0-sec-001.authz.test.js`.

- [x] **P0-SEC-002: Pipeline RBAC & Record-Level Branch Isolation**
  - [x] Attached `requireRole` across all pipeline routes (`pipeline.routes.js`):
    - `GET /api/v1/pipeline`: Super Admin, Branch Manager, Counsellor, Application Officer (Marketing denied with 403).
    - `POST /api/v1/pipeline`: Super Admin, Branch Manager, Counsellor.
    - `PATCH /api/v1/pipeline/:id/stage`: Super Admin, Branch Manager, Counsellor.
    - `PATCH /api/v1/pipeline/:id/documents`: Super Admin, Branch Manager, Application Officer (Counsellor denied with 403).
  - [x] Added record-level branch check to `toggleDocumentsVerified` in `pipeline.controller.js`: non-super-admin cannot toggle documents for a student belonging to another branch (returns 403 Forbidden).
  - [x] Added branch check to `updateStage`: non-super-admin cannot move stages for another branch's candidate.
  - [x] Restricted `createStudent` branch assignment: non-super-admin users are scoped to their own branch.
  - [x] Aligned client UI: `PipelineCard.jsx` checks user roles and branches, disabling document verification and stage move actions if unauthorized; `AppRoutes.jsx` guards `/pipeline` route against unauthorized roles.
  - [x] Verified all RBAC and branch isolation cases in `server/test/p0-sec-002.pipeline-authz.test.js`.

### Phase P0-VERIFY: Independent Security Verification & Knowledge Base (OpenCode, COMPLETED & VERIFIED)

- [x] **P0-VERIFY-000: Independent HTTP-Level Test Suite (OpenCode)**
  - [x] Wrote 6 new test files (`server/test/opencode-*.test.js`) using `app.listen(0)` + Node 22 `fetch` (real HTTP; zero npm install).
  - [x] `opencode-http-auth.test.js` (22 tests), `opencode-rbac-matrix.test.js` (6 tests), `opencode-branch-isolation.test.js` (15 tests), `opencode-pipeline-validation.test.js` (15 pass / 4 todo), `opencode-http-hardening.test.js` (9 pass / 4 todo), `opencode-frontend-contract.test.js` (13 pass / 2 todo).
  - [x] Harness verified: deliberate failure exits 1; full `npm test` = **109 tests, 99 pass, 0 fail, 10 todo, exit 0**.
- [x] **P0-VERIFY-001: `brain/` Knowledge Base (OpenCode)**
  - [x] Created `brain/` with 8 core docs: `README`, `backend`, `frontend`, `workflows`, `api-reference`, `security`, `file-map`, `testing`.

### Phase P1: Security Hardening (F-01 CORS & F-05 Pagination Cap) — VERIFIED (OpenCode, 13 Nov 2026)

- [x] **F-01: Development CORS Unrestricted Origin Remediation (`server/src/app.js`)**
  - [x] Removed blind `process.env.NODE_ENV === 'development'` origin allow wildcard.
  - [x] Enforced explicit allowlist (`http://localhost:3000`, `http://127.0.0.1:3000`, `http://localhost:5173`, `http://127.0.0.1:5173`, `CLIENT_URL`, `FRONTEND_URL`).
  - [x] Gated wildcard dev origin behind explicit `CORS_ALLOW_ALL_DEV === 'true'` (default off).
- [x] **F-05: Unbounded Pagination Limit Defense (`server/src/modules/users/user.controller.js`)**
  - [x] Enforced pagination ceiling: `safeLimit` = fallback 10 when `isNaN || <= 0`, else `Math.min(parseInt(limit, 10), 100)`.
  - [x] Enforced page floor: `safePage = isNaN||<=0 ? 1 : parseInt(page, 10)`.

### Phase P2: Security Hardening Batch & Final Re-Check — VERIFIED (13 Nov 2026)

- [x] **F-04: Stack Trace Leak Suppression (`server/src/middleware/errorHandlerMiddleware.js`)**
- [x] **F-03: Degraded Health Status & 503 on DB Disconnect (`server/src/modules/health/health.controller.js`)**
- [x] **P3: X-Powered-By Suppression (`server/test/opencode-http-hardening.test.js`)**
- [x] **F-06 / F-06R: Pipeline Pure Inclusion Projection Fix (`server/src/modules/pipeline/pipeline.controller.js`)**
- [x] **F-08: Pipeline Search Regex Hardening & Syntax Error Handling (`pipeline.controller.js`)**
- [x] **OBS-1: Users Search Regex Hardening (`server/src/modules/users/user.controller.js`)**
- [x] **F-07: User Controller Projection Enforcement (`server/src/modules/users/user.controller.js`)**
- [x] **F-09: Demo Credentials Bundling Elimination (`client/src/config/constants.js`)**
- [x] **F-02: Auth Token localStorage Removal (`client/src/services/api.js`, `client/src/context/AuthContext.jsx`)**
- [x] Full Suite Re-Verification: **114 tests, 114 pass, 0 fail, 0 todo (exit 0)**.

### Phase LOGIN-UI-VERIFY: Premium Login Page UI/UX Redesign — VERIFIED (OpenCode, 13 Nov 2026)

- [x] Verified responsive layout, micro-interactions, gold focus ring, Vidhana Soudha watermark, a11y labels, autocomplete, and dev-quick login: **58 pass / 0 fail / 0 skipped**.

### Phase REFRESH-VERIFY: Day 3 Session Refresh & Invalidation — VERIFIED (OpenCode, 13 Nov 2026)

- [x] Verified `POST /api/v1/auth/refresh`, cookie rotation, expired/tampered rejection, deactivated 403, and Axios response interceptor auto-replay: **16 pass / 0 fail, exit 0**.

### Phase DAY4-BE-VERIFY: Day 4 Backend Authorization Hardening — VERIFIED (OpenCode, 16 Nov 2026)

- [x] **Source review** of `server/src/middleware/branchMiddleware.js`: super/global path normalizes scope (string trimmed/lowercased, string-array first element, everything else → `null`, so object params can never reach Mongo); restricted path stringifies any non-string (`'[object Object]'`, comma-joined arrays) before the deny check; `req.branchScope` forced to `req.user.branch`; `x-branch` read only on the super path; record guards compared against the DB-loaded row.
- [x] **Dedicated Day 4 suite:** `node --test server/test/day4-backend-authz.test.js` → **24 pass / 0 fail**.
- [x] **Full backend regression:** `npm --prefix server test` → **142 pass / 0 fail / 0 todo, exit 0**.
- [x] **Frontend contract:** `node --test server/test/opencode-frontend-contract.test.js` → **15 pass / 0 fail**.
- [x] **Client production build:** `npm run build:client` → green (vite 8.3.8, 2239 modules, 4.48s); `client/dist/assets/*.js` scan for `Password@123` / demo emails / `DEMO_CREDENTIALS` → **0 matches**.
- [x] **Independent adversarial HTTP probe** (own harness, outside repo, DB dropped after run) → **30 pass / 0 fail**: HPP duplicate `branch` params (both orders) + `branch[]`; `?branch[$ne]`, `?branch[$regex]`, `?stage[$ne]`, `?role[$ne]`; JSON body `branch` as `{ $gt: '' }`, array, and `'all'` (201 with forced own branch); `x-branch` spoof on stage + documents writes with DB re-read; full 5-role `GET /users` matrix; anonymous + garbage-token 401.
- [x] **Findings:** 0 blocking. `D4-OBS-1`, `D4-OBS-2` informational (no privilege gain, non-exploitable, recorded in `brain/security.md`); `D4-DOC-1` role-name typo corrected in `NEW_TASK.md`. Verifier modified **no application source**.

---

## 📅 90-DAY DETAILED MASTER IMPLEMENTATION PLAN

---

### PHASE A: Architecture Foundation (Days 1–5)

#### Day 1: Repository Baseline and Architecture Confirmation (COMPLETED & VERIFIED)
- [x] **Backend Entry Point & Architecture**
  - [x] Inspect Express application entry point (`server/src/server.js`) and app bootstrap (`server/src/app.js`).
  - [x] Middleware ordering confirmed: CORS allowlist → Helmet → JSON parser → Cookie parser → Morgan → Rate limit → Routes → 404 → Centralized Error Handler.
  - [x] Database connection lifecycle with Mongoose events and graceful shutdown on `SIGINT`/`SIGTERM` (`server/src/config/db.js`).
  - [x] Standardized API response format (`ApiResponse`) and centralized error handler (`errorHandlerMiddleware.js`).
- [x] **Frontend Architecture & Setup**
  - [x] React 19 Single Page Application configured with Vite 8 (`client/package.json`).
  - [x] Declarative code-split route tree with `React.lazy()` and `Suspense` (`AppRoutes.jsx`).
  - [x] `ProtectedRoute` guard enforcing authentication state and role access (`ProtectedRoute.jsx`).
  - [x] `AuthProvider` managing user state and tokenless session lifecycle (`AuthContext.jsx`).
  - [x] Core design tokens in `client/src/styles/variables.css` (Royal Maroon, Imperial Gold, Warm Canvas).
- [x] **Cross-Cutting Roles & Branches**
  - [x] Five authorized roles confirmed: `super_admin`, `branch_manager`, `counsellor`, `marketing`, `application_officer`.
  - [x] Three branches confirmed: `bengaluru`, `mysuru`, `belagavi` + global `all` (super_admin only).
  - [x] Branch scoping middleware (`branchMiddleware.js`) enforcing record-level and route-level isolation.
- [x] **Verification Evidence:** `opencode-frontend-contract.test.js`, `opencode-rbac-matrix.test.js`, `opencode-branch-isolation.test.js`.

#### Day 2: Server Foundation and Environment Safety (COMPLETED & VERIFIED)
- [x] **Modular Structure & Environment Safety**
  - [x] Modular route/controller/service/model boundaries verified (`server/src/modules/` — `auth`, `users`, `pipeline`, `health`).
  - [x] Fail-closed startup: missing secrets prevent unsafe server boot (`server.js`). Tested in `p0-sec-003.config-demo.test.js`.
  - [x] Zero occurrences of fallback signing keys across codebase.
- [x] **Security Middleware Suite**
  - [x] Strict CORS origin allowlist (`CLIENT_URL` + explicit localhost/127.0.0.1 ports 3000 & 5173); untrusted origins receive 500/403 policy errors.
  - [x] Helmet security headers active (`X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `X-DNS-Prefetch-Control`). `X-Powered-By` permanently stripped.
  - [x] Rate limiting active: 100 requests per 15 minutes per IP on `/api` returning structured 429 JSON.
  - [x] Request payload body limits enforced: 10MB JSON and URLencoded.
  - [x] Stack trace elimination: error handler never serializes `err.stack` or raw secrets into HTTP responses.
- [x] **Frontend Environment & Build Safety**
  - [x] Environment-specific base URL handling via `VITE_API_URL` or `/api/v1` proxy fallback (`api.js`).
  - [x] Client source scan confirms 0 backend secrets in `client/src`.
  - [x] Development demo helpers strictly gated behind `import.meta.env.DEV` in `LoginPage.jsx`.
  - [x] Production build scan (`client/dist/assets/*.js`) confirms zero matches for demo passwords.

#### Day 3: Authentication and Session Lifecycle (COMPLETED & VERIFIED)
- [x] **Authentication Engine & Cookie Lifecycle**
  - [x] Login endpoint (`POST /api/v1/auth/login`) with bcrypt password verification, active-user validation, lastLogin update, and generic 401 error message.
  - [x] Secure cookie storage: sets `accessToken` and `refreshToken` with `httpOnly: true`, `secure: production`, `sameSite: production ? 'strict' : 'lax'`.
  - [x] Current-user profile endpoint (`GET /api/v1/auth/me`) protected by `protect` middleware; returns sanitized user object without password or `__v`.
  - [x] Dedicated Session Refresh endpoint (`POST /api/v1/auth/refresh`): extracts refresh token from httpOnly cookie or body, validates against `JWT_SECRET`, checks active status (`!user.isActive` returns 403), rotates tokens, and sets fresh cookies.
  - [x] Frontend transparent token refresh: Axios response interceptor in `api.js` automatically catches 401 on expired tokens, requests `POST /auth/refresh`, and transparently retries the failed request before falling back to login redirect.
  - [x] Logout endpoint (`POST /api/v1/auth/logout`) clears both `accessToken` and `refreshToken` cookies with matching options.
  - [x] Staff provisioning (`POST /api/v1/auth/register`) strictly restricted to Super Admin (`protect` + `requireRole('super_admin')`).
  - [x] Deactivated account enforcement: `!user.isActive` returns 403 on login, profile retrieval, and token refresh.
  - [x] Frontend token security (F-02 remediation): `aeterna_token` removed from `localStorage`; application relies exclusively on `httpOnly` cookie with `withCredentials: true`.
  - [x] Verified baseline: 118 passing tests, 0 failures, 0 todos.

#### Day 4: RBAC, Branch Isolation & Reusable UI Foundation (COMPLETED & VERIFIED — 16 Nov 2026)
- [x] **Backend Authorization Hardening — INDEPENDENTLY VERIFIED (OpenCode, 16 Nov 2026)**
  - [x] Verify centralized role permissions and branch-scope middleware across all route trees.
    - Evidence: `server/test/day4-backend-authz.test.js` **24/24 pass, 0 fail**; full suite `npm --prefix server test` **142/142 pass, 0 fail, 0 todo (exit 0)**.
    - Evidence: independent 30-case adversarial HTTP probe (own harness, outside repo, DB dropped after run) **30/30 pass** — HPP duplicate `branch` params, `?branch[$ne]`/`?branch[$regex]`/`?stage[$ne]` object params, JSON body `branch` object/array, spoofed `x-branch` header on writes, full 5-role matrix on `GET /users`, anonymous + garbage-token negatives.
  - [x] Confirm branch scope is derived from authenticated identity and cannot be widened via query/body parameters (`?branch=all` or `x-branch`).
    - Evidence: restricted users have `req.branchScope` **forced to `req.user.branch`**; `?branch=all` → own-branch data; `x-branch` ignored for restricted users (header only read on the super/global path); `?branch=mysuru&branch=bengaluru` → 200 scoped to own branch; `?branch=bengaluru&branch=mysuru` → 403; `?branch[]=mysuru` → 403.
  - [x] Ensure record-level authorization applies to all read and mutation endpoints.
    - Evidence: cross-branch stage move & documents toggle → **403 with DB unchanged** (verified against `stage`/`documentsVerified` re-read), including attempts carrying a spoofed `x-branch: mysuru` header; `application_officer` stage move → 403; `counsellor` documents verify → 403; `marketing` stage move → 403; body `branch: { $gt: '' }` / `branch: ['mysuru','bengaluru']` → 403; body `branch: 'all'` on create → 201 persisted with forced own branch.
- [x] **Frontend Component Formalization & Accessibility Matrix — INDEPENDENTLY VERIFIED (OpenCode, 16 Nov 2026)**
  - [x] Verify permission-aware navigation, protected routes, and action visibility based on authenticated role.
    - Evidence: `server/test/opencode-frontend-contract.test.js` **15/15 pass** — `AppRoutes` role parity, `PERMISSIONS.pipeline/students` == backend sets, `NAV_ITEMS` == backend, client/server `ROLES` literal identity, `ProtectedRoute` redirect logic, zero secrets in client source.
  - [x] Verify and formalize reusable UI component library in `client/src/components/common/`:
    - [x] `Button.jsx`, `Input.jsx`, `Badge.jsx`, `Card.jsx`, `Modal.jsx`, `ConfirmDialog.jsx`, `LoadingSpinner.jsx`, `StatCard.jsx`.
    - [x] Custom luxury keyboard-accessible `Select.jsx` dropdown engine.
    - [x] Complete formal test matrix verifying keyboard accessibility and focus management across all common components.
      - Evidence: `npm --prefix client test` → **10 test files, 41/41 pass, 0 fail (exit 0)** in `client/src/components/common/__tests__/` (Button, Input, Select, Modal, ConfirmDialog, Card, StatCard, LoadingSpinner, Badge, ErrorBoundary).
      - Focus management verified: `useFocusTrap` hook wired to `Modal.jsx` and `ConfirmDialog.jsx` (mutation-proven load bearing).
- [x] **Deliverables & Acceptance — COMPLETE**
  - [x] Backend denies unauthorized actions even if frontend controls are manually invoked — **verified (24/24 + 30/30 probe)**.
  - [x] Cross-branch read/write attempts are rejected — **verified (record guard asserts 403 + unchanged DB)**.
  - [x] Role/permission matrix and branch-access matrix document — **delivered & verified exact (`docs/ROLE_PERMISSION_MATRIX.md`)**.
  - [x] Shared component inventory documentation — **delivered (`docs/COMPONENT_INVENTORY.md`)**.
  - [x] Shared components use consistent design tokens and accessible states — **verified by client a11y suite (41/41)**.

#### Day 5: Foundation Verification and Handover (COMPLETED & VERIFIED — 16 Nov 2026)
- [x] **Backend & Frontend Automated Verification — VERIFIED (16 Nov 2026)**
  - [x] Run full backend automated tests, lint/static checks, and production frontend build.
    - Evidence: `npm --prefix server test` **11 suites / 150 tests PASS, 0 fail, 0 todo (exit 0)**.
    - Evidence: `npm --prefix client test` **10 files / 41 tests PASS, 0 fail (exit 0)**.
    - Evidence: `node --test server/test/opencode-frontend-contract.test.js` **15/15 tests PASS (exit 0)**.
    - Evidence: `npm run build:client` **Vite v8.3.8 build green (2240 modules, 3.35s)**.
    - Evidence: `npm --prefix client run lint` **0 errors (exit 0)**.
    - Evidence: bundle secret scan (`Password@123`) **0 matches (clean)**.
  - [x] Exercise health endpoints (`/api/v1/health` and `/health`) with database connected (200) and disconnected (503).
    - Evidence: `server/test/day5-foundation-verification.test.js` **8/8 tests PASS** — `/health` and `/api/v1/health` return 200 healthy when DB is connected, degrade to 503 unhealthy when DB is disconnected, and recover to 200 upon reconnection.
  - [x] Verify route-level code splitting and global error/loading behavior.
    - Evidence: production build emits separate route chunks (`LoginPage-*.js`, `DashboardPage-*.js`, `PipelinePage-*.js`, `UnauthorizedPage-*.js`, `NotFoundPage-*.js`).
    - Evidence: `App.jsx` wrapped in accessible `ErrorBoundary`; `AppRoutes.jsx` wrapped in `Suspense` with accessible `LoadingSpinner`.
- [x] **OpenCode Independent Review & Handover — VERIFIED (16 Nov 2026)**
  - [x] Independently review authentication, RBAC, branch isolation, environment safety, and test coverage.
  - [x] Update `brain/` architecture, security, testing, and file-map documents.
- [x] **Deliverables & Acceptance — COMPLETE**
  - [x] Phase A verification report, known-issues list, and prioritized Phase B backlog delivered: [`docs/PHASE_A_VERIFICATION_REPORT.md`](file:///d:/devil_code/aeterana/aeterna-one-crm/docs/PHASE_A_VERIFICATION_REPORT.md).
  - [x] Acceptance: Zero unresolved critical security issues; all remaining items logged with severity, owner, and next action. Phase A is **100% complete**. Project Owner ready to dispatch Phase B1 (Lead Management).

#### Day 5 Follow-up: API Shield & Smart Error Response System (COMPLETED & VERIFIED — 16 Nov 2026)
- [x] **API Shield Global & Module-wise Protection Foundation**
  - [x] Global baseline rate limiter on `/api` (100 req / 15 min per IP; standard `RateLimit-*` headers; standard 429 response with `retryAfter`).
  - [x] Stricter module rate limiters: Authentication (`/api/v1/auth/login`, `/setup-super-admin`: 10 req / 15 min in prod/dev); Users (`/api/v1/users`: 100 req / 15 min); Pipeline (`/api/v1/pipeline`: 120 req / 15 min); Reports (30 req / 15 min); Uploads (20 req / 15 min).
  - [x] Request payload ceiling enforced: JSON body limit capped at 1MB (configurable via `SHIELD_JSON_LIMIT`; replaces unmetered 10MB default); HTTP 413 response with machine-readable code `PAYLOAD_TOO_LARGE`.
  - [x] Malformed JSON syntax trap: unparseable request bodies caught cleanly and returned as HTTP 400 with code `INVALID_JSON`.
  - [x] Unsupported Content-Type shield: mutation requests (`POST`, `PUT`, `PATCH`) with non-standard bodies rejected with HTTP 415 and code `UNSUPPORTED_FILE_TYPE`.
  - [x] Request correlation tracking: `requestIdMiddleware` generates `req.id` (UUID format) and attaches `X-Request-Id` response header.
  - [x] Structured security logging: `securityLogger.js` logs 4xx/5xx security events with client IP, timestamp, endpoint, status, and role, while strictly redacting passwords, tokens, developer keys, Authorization headers, and cookies.
- [x] **Smart English-Only Error Response Engine**
  - [x] Centralized error catalogue (`server/src/shield/errorCatalogue.js`) covering 18 categories across 3 personality styles:
    - **FUNNY (Humorous & entertaining):** `RATE_LIMIT_EXCEEDED` (429), `RATE_LIMIT_LOGIN` (429), `NOT_FOUND` (404), `METHOD_NOT_ALLOWED` (405), `CONFLICT` (409), `RESOURCE_LOCKED` (423).
    - **FRIENDLY (Helpful & polite):** `VALIDATION_ERROR` (400), `INVALID_JSON` (400), `PAYLOAD_TOO_LARGE` (413), `FILE_TOO_LARGE` (413), `UNSUPPORTED_FILE_TYPE` (415), `SERVICE_UNAVAILABLE` (503), `MAINTENANCE_MODE` (503).
    - **PROFESSIONAL (Direct & clear):** `UNAUTHORIZED` (401), `SESSION_EXPIRED` (401), `FORBIDDEN` (403), `ACCOUNT_DISABLED` (403), `INTERNAL_SERVER_ERROR` (500).
  - [x] Strict English-Only policy: zero Hindi translations, no language selectors, no browser/locale language detection.
  - [x] Target met: 5–10 distinct variations per category (total 112 curated English messages).
  - [x] Non-repeating random selection with deterministic index option for unit testing and safe fallback.
- [x] **Frontend Integration & Compatibility**
  - [x] Preserved existing `client/src/services/apiErrorHandler.js` and `client/src/services/errorMessages.js` contract.
  - [x] Backend message field mapped transparently to frontend toast alerts with zero duplicate toasts and zero stack trace exposure.
- [x] **Automated Test Coverage & Verification**
  - [x] Dedicated test suite: `server/test/day5-api-shield.test.js` (**9/9 tests PASS**).
  - [x] Full backend test suite: `npm --prefix server test` (**165/165 tests PASS across 11 suites, 0 fail**).
  - [x] Client accessibility suite: `npm --prefix client test` (**41/41 tests PASS, 0 fail**).
  - [x] Client contract suite: `node --test server/test/opencode-frontend-contract.test.js` (**15/15 tests PASS**).
  - [x] Client lint & production build: 0 errors; Vite bundle 3.26 MB with zero secret leakage.
- [x] **Deferred to Phase B6 (Final Security Phase)**
  - [x] Advanced threat detection (abnormal traffic analysis, repeated unauthorized pattern detection, brute-force heuristics) remains deferred to Phase B6 (Days 76–80).
  - [x] Automated temporary IP blocking, user restriction workflows, and security event dashboards remain deferred to Phase B6.

---

### PHASE B1: Lead Management (Days 6–18)

#### Day 6: Lead Domain Discovery and Business Rules (PENDING)
- [ ] Document enquiry sources (Meta Ads, Google Ads, Walk-in, Website, Referral, Education Fair) and required fields.
- [ ] Define what makes two enquiries duplicates and which fields are safe matching signals (normalized phone, email).
- [ ] Define lead visibility for all five roles (`super_admin`, `branch_manager`, `counsellor`, `marketing`, `application_officer`).
- [ ] Map lead status, priority, source, campaign, assigned counsellor, and branch.
- [ ] **Deliverables:** Lead requirements document, field dictionary, role-action matrix, and workflow diagram.
- [ ] **Acceptance:** Business rules approved before schema/API implementation; ambiguous rules listed rather than guessed.

#### Day 7: Lead Schema and Indexes (PENDING)
- [ ] **Backend Model Architecture**
  - [ ] Design `Lead` schema (`server/src/modules/leads/lead.model.js`) with identity/contact details, source/attribution, branch, owner, status, timestamps, and audit metadata.
  - [ ] Add validation, normalization, and compound indexes for common filters and duplicate detection.
  - [ ] Decide soft-delete/archive behavior and data retention requirements.
- [ ] **Test Coverage**
  - [ ] Unit tests for required/optional fields, invalid email/phone, invalid branch/status, and duplicate index behavior.
- [ ] **Acceptance:** Schema supports approved lead workflow without unnecessary sensitive data; indexes justified by query patterns.

#### Day 8: Lead Creation API (PENDING)
- [ ] **Backend Implementation**
  - [ ] Implement `POST /api/v1/leads` with strict input allowlist, validation, authenticated actor metadata, and branch assignment.
  - [ ] Prevent clients from setting privileged owner/branch values unless role policy permits.
  - [ ] Return consistent `ApiResponse` and field-level validation errors.
- [ ] **Frontend Shell**
  - [ ] Build create-lead form shell using shared UI components (`Modal`, `Input`, `Select`, `Button`).
- [ ] **Acceptance:** Authorized users can create leads; unauthorized roles and cross-branch assignments rejected; tests verify database state and audit metadata.

#### Day 9: Lead Deduplication Engine (PENDING)
- [ ] **Backend Engine**
  - [ ] Implement normalized matching using approved identifiers (normalized phone/email) with explicit handling for incomplete records.
  - [ ] Enforce deduplication policy: warn user, block creation, or allow privileged override.
  - [ ] Avoid unsafe regex construction from raw user input.
- [ ] **Frontend Duplicate UX**
  - [ ] Display duplicate candidates and clear next action without leaking other-branch records.
- [ ] **Acceptance:** Duplicate checks are branch-aware and permission-aware; tests cover exact match, partial match, formatting differences, and cross-branch privacy.

#### Day 10: Lead List API, Filters and Pagination (PENDING)
- [ ] **Backend Listing & Search**
  - [ ] Implement `GET /api/v1/leads` with bounded pagination (`limit <= 100`), stable sorting, and allowlisted filters (branch, status, source, date range).
  - [ ] Add search by approved fields with escaped/validated search input (mitigate ReDoS).
  - [ ] Enforce branch scope in every query.
- [ ] **Frontend Connection**
  - [ ] Connect list page to API with debounced search and server-side pagination via TanStack Query.
- [ ] **Acceptance:** Search, filters, sorting, and pagination work together; extreme limits and unauthorized branch filters safely handled.

#### Day 11: Desktop Table and Mobile Card Views (PENDING)
- [ ] **Frontend Responsive UI**
  - [ ] Build dense desktop data table (`Table.jsx`) and touch-friendly mobile card layout.
  - [ ] Add loading skeleton, empty state, error state, and retry behavior.
  - [ ] Provide accessible row/card actions and responsive overflow handling.
- [ ] **Backend Projection**
  - [ ] Confirm list response contains only fields required by the UI (Rule 18 / Rule 20 data minimization).
- [ ] **Acceptance:** No horizontal overflow or inaccessible actions at supported breakpoints; data shown is permission-scoped without leaking private fields.

#### Day 12: Lead Detail Drawer/Page (PENDING)
- [ ] **Backend Detail Endpoint**
  - [ ] Implement `GET /api/v1/leads/:id` with field projection and record-level access control.
  - [ ] Return summary, ownership, source, current status, and permitted activity details.
- [ ] **Frontend Detail Drawer**
  - [ ] Build slide-over lead detail drawer with clear information hierarchy.
  - [ ] Add loading, not-found (404), forbidden (403), and server-error (500) states.
- [ ] **Acceptance:** A user cannot open another branch's lead by tampering with an ID in the URL; detail view does not expose restricted fields.

#### Day 13: Lead Editing and Validation (PENDING)
- [ ] **Backend Mutation**
  - [ ] Implement partial updates (`PATCH /api/v1/leads/:id`) with field allowlist and immutable-field protection.
  - [ ] Record before/after changes for critical fields in audit history.
  - [ ] Prevent unauthorized branch/owner/status modifications.
- [ ] **Frontend Form**
  - [ ] Add edit form, inline validation, and unsaved-change handling.
- [ ] **Acceptance:** Valid edits persist; invalid edits return field-level errors; sensitive ownership and branch fields cannot be tampered with.

#### Day 14: Lead Assignment and Branch Routing (PENDING)
- [ ] **Backend Routing**
  - [ ] Implement assignment endpoint (`PATCH /api/v1/leads/:id/assign`) to eligible counsellors within the correct branch.
  - [ ] Implement approved branch routing and optional round-robin counsellor assignment.
  - [ ] Safely handle no eligible assignee, inactive staff, and concurrent assignment requests.
- [ ] **Frontend Assignment UI**
  - [ ] Add assignment modal with branch-aware staff options and confirmation.
- [ ] **Acceptance:** Assignment respects role, branch, and staff status; tests cover cross-branch assignment, concurrent requests, and no-assignee edge cases.

#### Day 15: Lead Status, Priority and Source Management (PENDING)
- [ ] **Backend State Machine**
  - [ ] Implement approved status/priority transitions and source metadata.
  - [ ] Validate transition rules; disallow arbitrary client-supplied state jumps.
  - [ ] Track status history with timestamps and actor metadata.
- [ ] **Frontend Badges & Actions**
  - [ ] Add status/priority badges, filter chips, and permitted quick-action buttons.
- [ ] **Acceptance:** Invalid transitions are rejected; valid transitions are auditable; UI controls match backend permissions.

#### Day 16: Lead Activity Timeline and Notes (PENDING)
- [ ] **Backend Activity History**
  - [ ] Add append-only activity events for creation, assignment, status changes, and permitted edits.
  - [ ] Add internal notes endpoint (`POST /api/v1/leads/:id/notes`) with author, timestamp, and role visibility rules.
  - [ ] Prevent silent editing or deletion of audit events.
- [ ] **Frontend Timeline**
  - [ ] Display chronological activity timeline and note composer in lead detail drawer.
- [ ] **Acceptance:** Activity history is correctly attributed and branch-scoped; internal notes are never exposed to unauthorized roles or public endpoints.

#### Day 17: Lead Workflow Integration and Regression (PENDING)
- [ ] **End-to-End Workflow Verification**
  - [ ] Test create → duplicate check → assign → update → note → status transition → detail/list consistency.
  - [ ] Verify surgical TanStack Query cache updates for create/edit/assignment/status mutations.
  - [ ] Test stale data, double submission, and network failure recovery.
  - [ ] Run full role × action × branch authorization matrix.
- [ ] **Acceptance:** Full lead workflow passes API and UI tests with zero branch-isolation regressions.

#### Day 18: B1 Independent Review and Release Gate (PENDING)
- [ ] **OpenCode Independent Review**
  - [ ] Independently test APIs, permissions, duplicate behavior, filters, pagination, mobile UI, and regressions.
  - [ ] Review query/index behavior and security-sensitive projections.
  - [ ] Update `brain/backend`, `brain/frontend`, workflows, API reference, file maps, and testing documentation.
- [ ] **Deliverables & Acceptance**
  - [ ] B1 verification report and accepted limitations list.
  - [ ] Acceptance: Project Owner signs off Lead Management as ready for Admissions Pipeline integration; critical/high findings block progression.

---

### PHASE B2: Admissions Pipeline (Days 19–30)

> *Current Repository Status:* Initial kanban board and optimistic mutation engine (`pipeline.model.js`, `pipeline.controller.js`, `usePipelineMutations.js`, `PipelinePage.jsx`) were fast-tracked. Days 19–30 define the formal 16-stage admissions lifecycle, state machine, document checklist gate, and release review.

#### Day 19: Pipeline Lifecycle and State-Machine Definition (PENDING)
- [ ] Confirm all 16 lifecycle stages with business owner (source roadmap establishes 16 stages across Enquiry → Visa Won).
- [ ] Define allowed stage transitions, terminal states, re-entry rules, and role overrides.
- [ ] Define lost/deferred reasons and minimum reason length rules.
- [ ] **Deliverables:** Approved stage dictionary, transition matrix, and state diagram.
- [ ] **Acceptance:** No stage names or transition rules are invented without business approval.

#### Day 20: Pipeline Data Model and Migration Plan (PENDING)
- [ ] **Backend Schema Alignment**
  - [ ] Design pipeline/application record relationship to lead and student records.
  - [ ] Define current stage, stage history, owner, branch, timestamps, and reason fields.
  - [ ] Add compound indexes for branch, stage, owner, and common filters.
  - [ ] Plan safe migration from existing prototype records.
- [ ] **Acceptance:** One record has a clear identity and lifecycle; duplicate or orphan records are handled explicitly.

#### Day 21: Pipeline APIs: Read and Board Data (PENDING)
- [ ] Implement branch-scoped board/list API supporting grouped stage counts.
- [ ] Add filters for stage, owner, intake, source, and search.
- [ ] Bound pagination and return counts strictly within authorized scope.
- [ ] **Acceptance:** Board data cannot leak other-branch records or unapproved fields.

#### Day 22: Pipeline Transition API (PENDING)
- [ ] Implement server-side transition validation using the approved 16-stage state machine.
- [ ] Enforce role and branch authorization on every transition.
- [ ] Require lost/deferred reason where business rules demand it.
- [ ] Record immutable stage-history events.
- [ ] **Acceptance:** Invalid transitions, unauthorized overrides, and cross-branch updates are rejected.

#### Day 23: Kanban Board UI (PENDING)
- [ ] Build responsive stage columns and pipeline cards using existing theme tokens.
- [ ] Add column student counts, empty column states, loading, and error boundaries.
- [ ] Ensure responsive behavior and accessible alternatives to drag-and-drop.
- [ ] **Acceptance:** Board reflects server state and operates reliably on desktop, tablet, and mobile.

#### Day 24: Drag-and-Drop and Optimistic Rollback (PENDING)
- [ ] Implement native HTML5 drag-and-drop as specified in the blueprint.
- [ ] Apply optimistic updates via TanStack Query `onMutate` with automatic snapshot revert on API rejection (`optimisticWithRevert`).
- [ ] Prevent duplicate submissions and conflicting concurrent transitions.
- [ ] **Acceptance:** Failed transitions restore the original card position and display an explicit error alert.

#### Day 25: Pipeline Card and Detail View (PENDING)
- [ ] Show only permitted student/lead summary fields on pipeline cards.
- [ ] Add detail drawer/modal with stage history timeline and relevant notes.
- [ ] Enforce record-level authorization on direct URLs and API calls.
- [ ] **Acceptance:** No sensitive document or financial data is exposed in board cards.

#### Day 26: Documents Checklist Gate (PENDING)
- [ ] Define document checklist items and which stage transitions require document completion.
- [ ] Implement verification permissions (Super Admin, Branch Manager, Application Officer).
- [ ] Prevent unauthorized users from verifying documents or bypassing gates.
- [ ] **Acceptance:** Required documents block the relevant stage transition server-side, not just in UI.

#### Day 27: Lost/Deferred Workflow and Recovery (PENDING)
- [ ] Implement reason capture (`ReasonModal.jsx`), status history, and authorized recovery/reopen behavior.
- [ ] Define whether reassignment is required upon candidate reopening.
- [ ] Add reporting metadata and filters for lost/deferred records.
- [ ] **Acceptance:** Lost/deferred records remain traceable; reopening follows approved policy.

#### Day 28: Pipeline Role/Branch Matrix and Concurrency (PENDING)
- [ ] Test all five roles against view, create, move, override, verify, and reopen actions.
- [ ] Test concurrent updates: two users moving the same record or stale stage versions.
- [ ] Confirm branch scoping on list, detail, and mutation endpoints.
- [ ] **Acceptance:** No unauthorized transition or lost update under tested concurrency scenarios.

#### Day 29: Pipeline Integration and Regression (PENDING)
- [ ] Test lead-to-pipeline conversion and identity linking.
- [ ] Verify list, board, detail, and activity history remain consistent across operations.
- [ ] Test pagination, filters, error recovery, and cache invalidation.
- [ ] Run full backend suite and frontend production build.
- [ ] **Acceptance:** End-to-end workflow passes without duplicate records or broken lead references.

#### Day 30: B2 Independent Verification and Release Gate (PENDING)
- [ ] **OpenCode Independent Review**
  - [ ] Perform independent state-machine, RBAC, branch, document-gate, concurrency, and UI tests.
  - [ ] Review all 16 approved stages against implementation.
  - [ ] Update `brain/` workflows, API reference, file maps, and security/testing notes.
- [ ] **Acceptance:** Business owner signs off the 16-stage workflow; critical/high issues block Phase B3 progression.

---

### PHASE B3: Student 360° Profile & Documents Vault (Days 31–45)

#### Day 31: Student 360° Requirements and Data Classification (PENDING)
- [ ] Define student profile sections: identity/contact, academics, test scores, budget, preferences, shortlist, applications, and notes.
- [ ] Classify personal, identity, education, and financial data by sensitivity.
- [ ] Define role visibility and branch ownership for each profile section.
- [ ] **Acceptance:** Field-level access rules and retention requirements are formally documented.

#### Day 32: Student Profile Model and Lead Conversion (PENDING)
- [ ] Design `Student` schema and relationship to original lead/application records.
- [ ] Define lead conversion rules, duplicate student handling, and immutable source attribution.
- [ ] Add validation, normalization, and compound indexes.
- [ ] **Acceptance:** Lead conversion does not lose source/branch/owner history or create duplicate students.

#### Day 33: Student Profile APIs (PENDING)
- [ ] Implement create, read, and update endpoints (`/api/v1/students`) with field-level allowlists.
- [ ] Enforce branch and role authorization on each operation.
- [ ] Separate editable profile fields from system-managed fields.
- [ ] **Acceptance:** Unauthorized fields and cross-branch access attempts are rejected.

#### Day 34: Student 360° Overview UI (PENDING)
- [ ] Build profile header, key facts summary, and tabbed section navigation.
- [ ] Add responsive layout, loading skeletons, empty states, and error handling.
- [ ] Show only fields permitted for the current user's role.
- [ ] **Acceptance:** Profile is usable on desktop and mobile with zero sensitive-field leakage.

#### Day 35: Academic History and Test Scores (PENDING)
- [ ] Model education history (10th, 12th, Bachelor's GPA, backlogs) and standardized test scores (IELTS, TOEFL, PTE, Duolingo, GRE, GMAT).
- [ ] Validate score formats and dates without hardcoding unsupported assumptions.
- [ ] Add CRUD UI/API and audit events.
- [ ] **Acceptance:** Invalid scores/dates are rejected and academic history remains traceable.

#### Day 36: Budget, Preferences and Counselling Notes (PENDING)
- [ ] Model budget range/currency, destination preferences, course preferences, and counselling notes.
- [ ] Define who can view/edit financial information and internal notes.
- [ ] Add validation and history for sensitive changes.
- [ ] **Acceptance:** Role-based access and audit trail verified.

#### Day 37: Object Storage Architecture and Threat Model (PENDING)
- [ ] Confirm cloud storage provider (Cloudflare R2 or S3-compatible) only after owner approval.
- [ ] Design private bucket layout, key naming, encryption, upload limits, and retention policies.
- [ ] Define signed upload/download URL expiry and authorization checks.
- [ ] **Acceptance:** No public bucket/object access; provider credentials remain server-side.

#### Day 38: Secure Upload API (PENDING)
- [ ] Implement authorized upload-intent endpoint and file metadata record.
- [ ] Validate MIME type, file extension, payload size, and allowed document category.
- [ ] Use short-lived signed upload URLs or a secure server upload proxy flow.
- [ ] **Acceptance:** Unauthorized users cannot upload files into another student's namespace.

#### Day 39: Secure Download and Document Preview (PENDING)
- [ ] Implement authorization checks before issuing short-lived signed download URLs.
- [ ] Add safe content disposition (`Content-Disposition: attachment` or scoped preview) and preview policy.
- [ ] Prevent permanent public links and unauthorized object enumeration.
- [ ] **Acceptance:** Expired/unauthorized download attempts fail; links are not reusable indefinitely.

#### Day 40: Document Checklist and Verification (PENDING)
- [ ] Define required documents by application/stage and document category.
- [ ] Add upload status, verification status, verifier metadata, and timestamp.
- [ ] Restrict document verification to approved roles (`super_admin`, `branch_manager`, `application_officer`).
- [ ] **Acceptance:** Checklist state is consistent with pipeline transition gates.

#### Day 41: Document Vault UI (PENDING)
- [ ] Build document checklist table, upload progress indicator, preview/download actions, and verification status badges.
- [ ] Add empty/error/retry states and clear file restriction notices.
- [ ] Ensure accessible controls and responsive layout across desktop and mobile.
- [ ] **Acceptance:** UI never displays an upload as verified until the backend confirms it.

#### Day 42: Audit, Retention and Deletion Lifecycle (PENDING)
- [ ] Define soft-delete, archive, retention, and permanent deletion approvals for documents.
- [ ] Log upload, download authorization, verification, and deletion events without logging secrets or file contents.
- [ ] Add cleanup processes only after policy approval.
- [ ] **Acceptance:** Sensitive files and metadata follow approved lifecycle rules.

#### Day 43: Student/Application Integration (PENDING)
- [ ] Connect Student 360° profile to lead and pipeline records.
- [ ] Show university application progress and document checklist context.
- [ ] Ensure a student can have multiple target university applications and relationships.
- [ ] **Acceptance:** Relationships remain consistent through conversion and stage transitions.

#### Day 44: Security, Privacy and Regression Tests (PENDING)
- [ ] Test IDOR, cross-branch access, signed URL expiry, MIME spoofing, oversized files, and unauthorized verification.
- [ ] Test profile field allowlists and audit integrity.
- [ ] Test upload interruption and retry behavior.
- [ ] **Acceptance:** Negative tests confirm zero public file access or cross-student document leaks.

#### Day 45: B3 Independent Verification and Release Gate (PENDING)
- [ ] **OpenCode Independent Review**
  - [ ] Independently test profile APIs, field permissions, object storage access, and document lifecycle.
  - [ ] Review privacy and retention documentation.
  - [ ] Update `brain/` file maps, workflows, API reference, security, and testing docs.
- [ ] **Acceptance:** Owner approves data classification and storage configuration; unresolved critical privacy issues block phase progression.

---

### PHASE B4: Tasks, Follow-ups & Communications (Days 46–60)

#### Day 46: Task and Follow-up Business Rules (PENDING)
- [ ] Define task types (`call_followup`, `doc_collection`, `application_filing`, `visa_mock_interview`, `deposit_reminder`).
- [ ] Define priorities, due dates, ownership, reminders, completion rules, and escalation thresholds.
- [ ] Define relationship to lead, student, and application records.
- [ ] Define role permissions and branch visibility rules.
- [ ] **Acceptance:** Task lifecycle and ownership rules are formally approved.

#### Day 47: Task Model and APIs (PENDING)
- [ ] Implement task schema (`server/src/modules/tasks/task.model.js`), validation, assignment, and branch scoping.
- [ ] Add list, create, update, and complete endpoints with bounded filters and pagination.
- [ ] Record actor and activity metadata on task updates.
- [ ] **Acceptance:** Users cannot create or assign tasks outside their permitted scope.

#### Day 48: Counsellor Task Queue UI (PENDING)
- [ ] Build "My Tasks" and permitted team queue views in `client/src/pages/TasksPage.jsx`.
- [ ] Add priority, due date, overdue state, and status filters.
- [ ] Provide desktop and mobile layouts with clear empty states.
- [ ] **Acceptance:** Queue reflects current user permissions and branch scope.

#### Day 49: Follow-up Scheduling (PENDING)
- [ ] Implement follow-up date/time, timezone handling, outcome, and next-action fields.
- [ ] Prevent invalid dates and duplicate follow-up submissions.
- [ ] Link follow-ups directly to the correct lead or student record.
- [ ] **Acceptance:** Follow-up history is traceable and correctly ordered chronologically.

#### Day 50: Reminders and Notification Foundation (PENDING)
- [ ] Define notification channels and event triggers.
- [ ] Implement in-app notification records and read/unread state tracking.
- [ ] Add retry-safe background job boundary (do not send external messages without credentials/approval).
- [ ] **Acceptance:** Notification creation is idempotent and does not duplicate on retries.

#### Day 51: After-Hours Enquiry and SLA Rules (PENDING)
- [ ] Define business hours, holidays, timezone, and SLA response targets with the business owner.
- [ ] Implement due/overdue calculations and escalation eligibility.
- [ ] Avoid assuming branch schedules without explicit approval.
- [ ] **Acceptance:** SLA calculation is deterministic and covered by timezone/boundary unit tests.

#### Day 52: Task Assignment and Escalation (PENDING)
- [ ] Implement reassignment, team queue distribution, and escalation permissions.
- [ ] Record assignment history and escalation reasons where required.
- [ ] Handle inactive staff and unassigned tasks safely.
- [ ] **Acceptance:** Escalation workflows cannot bypass branch and role controls.

#### Day 53: Communication Templates Foundation (PENDING)
- [ ] Define approved template variables, language, opt-in state, and message audit fields.
- [ ] Build template management boundary without sending live messages.
- [ ] Ensure provider secrets and tokens remain server-only.
- [ ] **Acceptance:** Template preview is safe; no message is sent without explicit authorized staff action.

#### Day 54: Gmail Integration Readiness (PENDING)
- [ ] Confirm account ownership, OAuth/SMTP approach, and required permissions with owner.
- [ ] Implement provider adapter/configuration and secret handling only after approval.
- [ ] Add dry-run/preview mode and delivery status contract.
- [ ] **Acceptance:** Zero credentials in source or frontend bundle; live sending remains disabled until approved.

#### Day 55: WhatsApp Cloud API Readiness (PENDING)
- [ ] Confirm WhatsApp Business account, Meta app, webhook verification, and approved templates.
- [ ] Implement integration boundary and webhook signature verification plan.
- [ ] Store opt-in/opt-out and consent evidence.
- [ ] **Acceptance:** Zero outbound WhatsApp messages without consent, approved template, and human authorization.

#### Day 56: Communication Activity Timeline (PENDING)
- [ ] Link permitted email/WhatsApp activity metadata to lead and student timelines.
- [ ] Store provider message ID, status, and timestamp (never store unnecessary message secrets).
- [ ] Enforce access to communication content and internal notes.
- [ ] **Acceptance:** Communication history is branch-scoped and auditable.

#### Day 57: Retry, Idempotency and Failure Handling (PENDING)
- [ ] Define retry policy, exponential backoff, dead-letter/manual retry behavior, and duplicate prevention.
- [ ] Test provider timeout, rate limit, invalid credentials, and webhook replay scenarios.
- [ ] **Acceptance:** Retries do not send duplicate communications or corrupt task state.

#### Day 58: Task/Follow-up End-to-End Workflow (PENDING)
- [ ] Test lead creation → assignment → task → follow-up → outcome → next task → escalation.
- [ ] Verify notifications and audit history across the flow.
- [ ] Test mobile task queue and network failure recovery.
- [ ] **Acceptance:** Complete workflow is traceable and permission-safe.

#### Day 59: B4 Regression and Operational Review (PENDING)
- [ ] Run role/branch matrix, API tests, frontend build, and integration tests.
- [ ] Review background job observability and failure visibility.
- [ ] Document any blocked live provider integrations.
- [ ] **Acceptance:** No external integration is labeled complete unless credentials, approval, and live test evidence exist.

#### Day 60: B4 Independent Verification and Release Gate (PENDING)
- [ ] **OpenCode Independent Review**
  - [ ] Independently test task ownership, SLA calculations, reminders, consent, communication authorization, and webhook safety.
  - [ ] Update `brain/` workflows, API docs, file maps, and runbooks.
- [ ] **Acceptance:** Owner approves operational rules; live communications remain disabled until legal/consent/provider requirements are satisfied.

---

### PHASE B5: Advanced Engineering & Management Reports (Days 61–75)

#### Day 61: Reporting Definitions and KPI Dictionary (PENDING)
- [ ] Agree on lead volume, source conversion, stage conversion, counsellor workload, application outcomes, and branch scorecards.
- [ ] Define numerator, denominator, date window, attribution, and exclusion rules for every KPI.
- [ ] **Acceptance:** KPI definitions are formally signed off; dashboard metrics are never guessed.

#### Day 62: Reporting Data Model and Aggregation Strategy (PENDING)
- [ ] Identify authoritative collections and event sources for analytics.
- [ ] Design indexes and aggregation pipelines for branch, date, and owner dimensions.
- [ ] Define timezone handling and historical correction behavior.
- [ ] **Acceptance:** Reports reconcile to underlying transactional records and enforce branch scope.

#### Day 63: Backend Reporting APIs (PENDING)
- [ ] Implement summary and trend endpoints with bounded date ranges and permission checks.
- [ ] Prevent branch managers or staff from requesting unauthorized branch data.
- [ ] Add caching only where freshness and invalidation rules are explicit.
- [ ] **Acceptance:** API values match test fixtures and cannot leak cross-branch aggregates.

#### Day 64: Branch Scorecards (PENDING)
- [ ] Build branch-level lead, conversion, workload, and outcome scorecards.
- [ ] Add date filters and clear metric tooltips/definitions.
- [ ] **Acceptance:** Branch managers see only authorized branch data; Super Admin sees global consolidated data.

#### Day 65: Conversion Funnels (PENDING)
- [ ] Implement stage conversion and drop-off metrics using agreed cohort logic.
- [ ] Handle records created before the reporting period and records that re-enter stages.
- [ ] **Acceptance:** Funnel mathematics are documented and reproducible.

#### Day 66: Counsellor Performance Views (PENDING)
- [ ] Define fair workload and conversion indicators; avoid ranking based on raw counts without context.
- [ ] Add filters for branch, date range, and counsellor.
- [ ] **Acceptance:** Metrics account for assignment dates and approved attribution rules.

#### Day 67: Dashboard UI and Responsive Charts (PENDING)
- [ ] Build dashboard cards, charts, loading skeletons, empty states, and error handling.
- [ ] Ensure charts provide accessible text/table alternatives.
- [ ] **Acceptance:** Dashboard is responsive across viewports and values trace back to KPI definitions.

#### Day 68: Advanced Cache Evaluation (PENDING)
- [ ] Measure actual API latency and repeated network requests.
- [ ] Confirm TanStack Query cache key invalidation patterns and mutation behavior.
- [ ] **Acceptance:** Performance optimizations justified by measured evidence and regression tests.

#### Day 69: Cache and Query Optimization (PENDING)
- [ ] Implement approved cache improvements and explain-plan index optimizations.
- [ ] Add query indexes based on measured slow queries.
- [ ] Prevent stale sensitive data after role/branch changes or user logout.
- [ ] **Acceptance:** Performance improves without stale authorization or data leakage.

#### Day 70: Virtualized Tables Assessment (PENDING)
- [ ] Profile realistic large datasets (> 1,000 leads/students) and DOM rendering performance.
- [ ] Introduce virtualization only if measured thresholds justify it.
- [ ] Preserve keyboard navigation, row actions, and mobile card behavior.
- [ ] **Acceptance:** Virtualization decision is evidence-based; unnecessary bloat is avoided (Rule 19).

#### Day 71: Command Palette (PENDING)
- [ ] Define searchable entities/routes and permission filtering (`Ctrl + K`).
- [ ] Implement keyboard activation, focus management, and accessible search results.
- [ ] Do not reveal hidden modules or records in suggestions.
- [ ] **Acceptance:** Search results respect role and branch permissions.

#### Day 72: Real-Time Notification Architecture (PENDING)
- [ ] Define real-time event names, authorization, reconnect behavior, and delivery guarantees.
- [ ] Implement Socket.IO only if operational hosting supports sticky sessions/pub-sub.
- [ ] Maintain fallback polling path if real-time transport is unavailable.
- [ ] **Acceptance:** Users receive only events for authorized branches/records.

#### Day 73: PDF Export Foundation (PENDING)
- [ ] Define A4 templates for student summary, fee receipt, and application checklist.
- [ ] Ensure only authorized fields are included and exports are auditable.
- [ ] Generate PDFs client-side using approved libraries (`jspdf`/`html-to-image`).
- [ ] **Acceptance:** Export layout is correct and does not expose hidden fields.

#### Day 74: Performance and Accessibility Pass (PENDING)
- [ ] Measure route bundle sizes, API latency, largest lists, and rendering bottlenecks.
- [ ] Review keyboard navigation, color contrast, labels, and reduced-motion support.
- [ ] Fix only evidenced issues; avoid premature optimization.
- [ ] **Acceptance:** Baseline and post-change measurements are recorded.

#### Day 75: B5 Independent Verification and Release Gate (PENDING)
- [ ] **OpenCode Independent Review**
  - [ ] Verify KPI calculations, report permissions, caching, command palette authorization, real-time event isolation, and PDF exports.
  - [ ] Update `brain/` architecture, workflows, API, file maps, and performance/testing docs.
- [ ] **Acceptance:** Business owner approves KPI definitions and report outputs; inaccurate metrics block release.

---

### PHASE B6: Production Hardening & Pilot Launch (Days 76–90)

#### Day 76: Production Threat Model Refresh (PENDING)
- [ ] Reassess authentication, authorization, branch isolation, sensitive data, file storage, integrations, and admin operations.
- [ ] Review all prior findings and confirm remediation evidence.
- [ ] **Acceptance:** Threat model lists assets, trust boundaries, attack paths, and security controls.

#### Day 77: Full Security Regression (PENDING)
- [ ] Run authentication, session, RBAC, IDOR, branch-isolation, input validation, rate-limit, and file-access test suites.
- [ ] Add negative tests for every high-risk endpoint.
- [ ] **Acceptance:** Zero unresolved critical/high security issues; all exceptions documented and owner-approved.

#### Day 78: Dependency and Configuration Audit (PENDING)
- [ ] Review dependency vulnerabilities (`npm audit`), outdated packages, and unused dependencies.
- [ ] Check secrets, CORS, cookies, CSP, headers, logging, and production environment configuration.
- [ ] **Acceptance:** Zero secrets committed or shipped; production configuration is reproducible and fail-closed.

#### Day 79: Database Backup and Recovery (PENDING)
- [ ] Define backup frequency, retention, encryption, access control, and restore procedures.
- [ ] Perform a test restore in a non-production environment.
- [ ] Define recovery point objective (RPO) and recovery time objective (RTO) with owner.
- [ ] **Acceptance:** A backup is not considered valid until restore is demonstrated.

#### Day 80: Observability and Operational Alerts (PENDING)
- [ ] Add structured logs, request correlation IDs, and safe error metadata.
- [ ] Define health/readiness/liveness behavior and alert thresholds.
- [ ] Ensure logs exclude passwords, tokens, document contents, and unnecessary personal data.
- [ ] **Acceptance:** Operators can diagnose failures without exposing sensitive information.

#### Day 81: CI/CD and Release Process (PENDING)
- [ ] Define automated install, lint, test, build, and security-check pipeline.
- [ ] Add environment separation and protected deployment secrets.
- [ ] Define migration and rollback processes.
- [ ] **Acceptance:** Release candidates can be built reproducibly; deployment requires owner approval.

#### Day 82: Staging Deployment (PENDING)
- [ ] Deploy to staging with production-like configuration and non-production data.
- [ ] Verify database connectivity, cookies/CORS, file storage, background jobs, and integrations.
- [ ] **Acceptance:** Staging smoke tests pass and zero real student data is used without authorization.

#### Day 83: User Acceptance Testing Preparation (PENDING)
- [ ] Prepare role-specific scenarios for all five roles across Bengaluru, Mysuru, and Belagavi branches.
- [ ] Create test accounts and synthetic test records exclusively in staging.
- [ ] **Acceptance:** UAT script maps each business requirement to an expected result.

#### Day 84: UAT: Lead and Pipeline Workflows (PENDING)
- [ ] Run enquiry capture, duplicate handling, assignment, counselling, shortlist, and stage progression scenarios.
- [ ] Capture usability feedback and defect reports.
- [ ] **Acceptance:** Business users confirm core lead-to-application workflow or record blocking issues.

#### Day 85: UAT: Student Documents and Communications (PENDING)
- [ ] Test profile updates, document upload/download/verification, tasks, reminders, and approved communications.
- [ ] Validate role/branch restrictions with real user scenarios.
- [ ] **Acceptance:** Sensitive-data workflows are accepted; external messages tested only with approved test recipients and consent.

#### Day 86: Defect Triage and Fixes (PENDING)
- [ ] Classify UAT issues by severity and business impact.
- [ ] Fix release-blocking defects first; avoid adding scope.
- [ ] Add regression tests for every defect.
- [ ] **Acceptance:** Zero open blocker/critical defects; remaining minor issues have owner and target date.

#### Day 87: Final Independent Audit (PENDING)
- [ ] **OpenCode Independent Audit**
  - [ ] Run full backend and frontend suites, security regression, dependency/config checks, and staging smoke tests.
  - [ ] Review documentation accuracy, runbooks, backup restore evidence, and known limitations.
- [ ] **Acceptance:** Signed verification report lists exact commands, environment, and results.

#### Day 88: Staff Onboarding and Training (PENDING)
- [ ] Prepare role-specific quick-start guides and safe operating procedures.
- [ ] Train branch representatives on lead handling, pipeline, student records, tasks, and document privacy.
- [ ] Confirm account provisioning and least-privilege roles.
- [ ] **Acceptance:** Staff can complete core tasks in staging and know how to report incidents.

#### Day 89: Pilot Readiness and Go/No-Go Review (PENDING)
- [ ] Review security sign-off, UAT, backup/restore, monitoring, support ownership, data migration, and rollback plan.
- [ ] Confirm external integration approvals and data protection responsibilities.
- [ ] Decide pilot scope and branch rollout sequence.
- [ ] **Acceptance:** Owner makes an explicit go/no-go decision; unresolved risks are not silently waived.

#### Day 90: Controlled Pilot Launch and Stabilization (PENDING)
- [ ] Launch only approved pilot scope and authorized branches/users.
- [ ] Monitor errors, latency, failed jobs, access denials, and support reports.
- [ ] Reconcile migrated data and verify backups.
- [ ] Hold stabilization review and prioritize post-launch fixes.
- [ ] **Acceptance:** Pilot operates within agreed thresholds; rollback path remains available; next-phase backlog approved.

---

## 📌 CROSS-PHASE DEFINITION OF DONE & AGENT PROTOCOL

Every feature must satisfy all applicable checks before it is marked complete:

1. **Business:** Workflow and rules approved; edge cases documented.
2. **Backend:** Validation, authorization, branch scope, error handling, pagination, and audit behavior implemented.
3. **Database:** Schema, indexes, relationships, and migration/retention implications documented.
4. **Frontend:** Loading, empty, error, success, validation, responsive, and permission states implemented.
5. **Security:** Positive and negative tests include unauthorized roles, branch tampering, IDOR, and malformed inputs.
6. **Testing:** Unit/integration/API tests run; exact command and result recorded (passing build alone is not sufficient).
7. **Regression:** Zero regressions in existing workflows.
8. **Documentation:** Relevant `brain/` docs, API reference, workflows, and file maps updated from actual code.
9. **Tracking:** `task.md` and `CRM_WORKSPACE.md` reflect implemented vs. independently verified status accurately.
10. **Approval:** Owner approves external integrations, production data, deployment, and scope changes.

### Agent Responsibilities
- **Antigravity (Implementation Owner):** Implements the active task, adds developer tests, verifies local test suite and production build, prepares handoff in `NEW_TASK.md`. Does NOT self-mark tasks verified in `task.md`.
- **OpenCode (Independent Verifier & Knowledge Base Owner):** Inspects actual diffs, executes independent positive/negative/regression tests, updates `brain/` and `task.md` with verified evidence, reports defects without suppressing issues.
- **Project Owner:** Confirms business rules, approves scope, credentials, integrations, and signs off phase gates and go/no-go decisions.

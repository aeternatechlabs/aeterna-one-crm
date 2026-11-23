# File Map

## Root (docs & orchestrator)

| File | Purpose |
| :-- | :-- |
| `RULES.md` | 20 mandatory architectural rules (dual access, TanStack, optimistic, ponytail minimalism, data minimization…) |
| `CRM_AGENT_WORK_INSTRUCTIONS.md` | Agent roles: Antigravity = builder; OpenCode = tester/security/docs (does NOT mark tasks complete) |
| `CRM_WORKSPACE.md` / `task.md` | Status trackers — update at end of session, format preserved |
| `TASK_ANTIGRAVITY.md` | Active task dispatch for developer agent (Antigravity) |
| `TASK_OPENCODE.md` | Active task dispatch & independent verification record (OpenCode) |
| `docs/ROLE_PERMISSION_MATRIX.md` | Day 4 deliverable: 5-role permission matrix, endpoint comparison & branch tamper defense |
| `docs/COMPONENT_INVENTORY.md` | Day 4 deliverable: inventory of 10 common UI components with props, design tokens & ARIA behavior |
| `docs/PHASE_A_VERIFICATION_REPORT.md` | Day 5 deliverable: Phase A verification report, known-issues list & prioritized Phase B backlog |
| `docs/PHASE_B3_VERIFICATION_REPORT.md` | Day 45 deliverable: Phase B3 verification report, data classification, storage threat model, verification gate & test results |
| `docs/STUDENT_360_DATA_CLASSIFICATION_AND_REQUIREMENTS.md` | Day 31 deliverable: 8-section Student 360° profile specification, 4-tier data sensitivity classification (DPDP/GDPR/FERPA), RBAC matrix & retention lifecycle |
| `package.json` | Root scripts: `dev:server`, `dev:client`, `build:client` |
| `brain/` | This knowledge base |

## `server/`

| Path | Purpose |
| :-- | :-- |
| `package.json` | `test` → `node --test test/**/*.test.js`; deps: express 4, mongoose 7, helmet 7, cors, express-rate-limit 7, morgan, cookie-parser, jsonwebtoken, bcryptjs, devil-backend-nodejs 4.1 |
| `.env` | Live dev env (`NODE_ENV=development`, PORT 5000, Mongo `aeterna_one_crm`, JWT_SECRET). Read ONLY via `server.js` dotenv |
| `src/server.js` | Entry: dotenv → env validation (exit 1) → connectDB → listen → graceful shutdown |
| `src/app.js` | Express app: helmet → hpp → cors → json → cookieParser → morgan → limiter(`/api`) → `/health` → `/api/v1` + `/api` → 404 → errorHandler |
| `src/routes/v1.js` | Mounts `health`, `auth`, `users`, `pipeline` |
| `src/config/constants.js` | `ROLES`, `BRANCHES`, `PIPELINE_STAGES`, `JWT`, `RATE_LIMIT` — single source for server |
| `src/config/db.js` | `connectDB()`, event-driven `isConnected` flag, `isDbConnected()`, SIGINT close |
| `src/middleware/authMiddleware.js` | `protect` — cookie/Bearer JWT, fail-closed secret, DB user lookup, isActive check |
| `src/middleware/roleMiddleware.js` | `requireRole(...roles)` → 403 |
| `src/middleware/branchMiddleware.js` | `requireBranchAccess()` — scope resolution + 403 (see backend.md) |
| `src/middleware/errorHandlerMiddleware.js` | ApiError/Mongoose/Cast/JWT → JSON (stack only in dev) |
| `src/middleware/validateMiddleware.js` | Runs validator chains → 400 + `errors` |
| `src/modules/auth/auth.routes.js` | login (public), register (super-only), me, logout |
| `src/modules/auth/auth.controller.js` | Generic-401 login, token issue, register (no token), me, logout |
| `src/modules/auth/auth.validator.js` | email/password checks + `branch:'all'` super-only cross rule |
| `src/modules/users/user.routes.js` | `GET /` — protect → super/branch_manager → branch |
| `src/modules/users/user.controller.js` | Paginated list w/ search/role/branch + (dead) fields allowlist |
| `src/modules/users/user.model.js` | User schema; `password select:false`; bcrypt pre-save; role/branch enums |
| `src/modules/pipeline/pipeline.routes.js` | 4 routes: role matrix per api-reference.md |
| `src/modules/pipeline/pipeline.controller.js` | getPipeline, updateStage (16-stage state machine + atomic concurrency filter + stageHistory), toggleDocumentsVerified, createStudent |
| `src/modules/pipeline/pipeline.model.js` | PipelineStudent; 16-stage schema enum + legacy aliases; branch enum (no `all`); stageHistory subdocs; text search index; lead-to-student links |
| `src/modules/pipeline/pipelineStateMachine.js` | 16-stage admissions state machine, transition validation matrix, document checklist gate, mandatory exit reason check, and reopening permissions |
| `src/modules/students/student.model.js` | Student 360° Mongoose model; 8 core sections, DPDP/GDPR soft-delete lifecycle, compound indexes, text search |
| `src/modules/students/student.routes.js` | Student 360° routes (list, getById, create, update, addNote, convertLead, academics, test-scores, financial, preferences, applications); branch-scoped & RBAC guarded |
| `src/modules/students/student.controller.js` | Student 360° controller; projection allowlists, system-managed field guards, role-based masking (counsellor passport & finance), academic/test score engine, loan status gates |
| `src/modules/students/studentConversion.service.js` | Lead conversion engine; human-readable Student ID generator, immutable source attribution, duplicate prevention, branch isolation |
| `src/modules/students/academicValidation.js` | Standardized test score (IELTS, TOEFL, PTE, Duolingo, GRE, GMAT) and qualification validation engine |
| `src/modules/students/studentAudit.model.js` | Immutable audit trail for academic, financial, loan status, and preference modifications |
| `src/modules/vault/fileValidation.js` | Document MIME type & magic byte signature verification (PDF, JPEG, PNG, WEBP), 10MB limit, path traversal sanitization |
| `src/modules/vault/storage.service.js` | Cloudflare R2 / AWS S3 storage adapter with sandboxed local disk driver and HMAC-SHA256 signed download/upload token generator |
| `src/modules/vault/document.model.js` | Document Vault Mongoose model; checklist metadata, verification status, verifier attribution, retention lifecycle |
| `src/modules/vault/documentAudit.model.js` | Immutable audit trail for document upload intent, upload, download, verification, and soft-delete lifecycle events |
| `src/modules/vault/vault.controller.js` | Document vault controller; upload intent, magic byte check, checklist compilation, signed download/preview tokens, verification gate, soft-delete |
| `src/modules/vault/vault.routes.js` | Vault router mounted under `/api/v1/students/:id/vault` with strict branch and role authorization |
| `src/modules/health/health.routes.js` + `health.controller.js` | Health JSON (status hardcoded healthy — F-03) |
| `src/utils/devilWrapper.js` | Re-export facade over devil-backend-nodejs (ApiResponse, ApiError, asyncHandler, generateTokens, paginate) |
| `src/scripts/seedUsers.js` | `npm run seed:users` — creates 5 demo staff (incl. super `branch:'all'`) |
| `src/scripts/convert_to_webp.py` | `npm run convert:image` — On-demand single-image WebP converter CLI (prompts user for image path, compresses with Pillow RGBA 85q, reports savings, offers deletion) |
| `src/shield/` | API Shield directory: centralized errorCatalogue (18 English categories, 3 personalities), shieldConfig, rateLimiters (global, auth, users, pipeline), payloadShield, securityLogger |
| `src/middleware/requestIdMiddleware.js` | Request ID generator & X-Request-Id header propagator |

## `server/test/` (see testing.md)

| File | Owner / purpose |
| :-- | :-- |
| `helpers/testApp.js` | Antigravity: mock req/res harness (unit style) |
| `p0-security-harness.test.js` | Antigravity: runner exits non-zero on failure |
| `p0-sec-001.authz.test.js` | Antigravity: register RBAC (19 total P0 tests green) |
| `p0-sec-002.pipeline-authz.test.js` | Antigravity: pipeline RBAC + branch records |
| `p0-sec-003.config-demo.test.js` | Antigravity: fail-closed config, no demo seeding |
| `day30-b2-independent-verification.test.js` | Day 30: B2 16-stage state machine, document gate, terminal states, RBAC & client parity (11/11 tests green) |
| `day32-student-model-conversion.test.js` | Day 32: Student 360° model, 8 sections, compound indexes, ID generator, lead conversion & duplicate prevention (11/11 tests green) |
| `day33-student-api-endpoints.test.js` | Day 33: Student 360° APIs (list, getById, create, update, notes), RBAC matrix, system field protection, role masking (11/11 tests green) |
| `day35-36-academic-financial.test.js` | Day 35 & 36: Academic history, test score engine (IELTS/TOEFL/PTE/GRE/GMAT), financial audit & manager loan sanction gate (19/19 tests green) |
| `day37-42-vault-storage-checklist.test.js` | Day 37–42: Document Vault, storage adapter, magic byte validation, signed download/preview tokens, verification gate & soft-delete lifecycle (18/18 tests green) |
| `day44-vault-security-regression.test.js` | Day 43 & 44: Applications integration, IDOR defense, cross-branch containment, adversarial MIME spoofing & audit immutability (11/11 tests green) |
| `day45-b3-independent-verification.test.js` | Day 45: Phase B3 independent verification & release gate suite (14/14 tests green) |
| `opencode-http-auth.test.js` | OpenCode: login/JWT/register/refresh HTTP (26) |
| `opencode-rbac-matrix.test.js` | OpenCode: 5 roles × endpoints (6) |
| `opencode-branch-isolation.test.js` | OpenCode: scope + record guards + latent quirk (15) |
| `opencode-pipeline-validation.test.js` | OpenCode: business rules + pagination + F-06R/OBS-1 (23) |
| `opencode-http-hardening.test.js` | OpenCode: headers/CORS/404/health/ratelimit (14) |
| `opencode-frontend-contract.test.js` | OpenCode: client↔server static contract (15) |
| `day4-backend-authz.test.js` | Antigravity: Day 4 role matrix + scope type-normalization + record guards (24, mock req/res) |
| `day5-foundation-verification.test.js` | Day 5 foundation verification: health 200/503, route chunk splitting, bundle secrets, UI resilience contracts (8) |
| `day5-super-admin-security.test.js` | Day 5 Super Admin security: one-time provisioning, developer key requirement, duplicate super admin lockout with funny error responses (6) |
| `day5-api-shield.test.js` | Day 5 API Shield: 18-category error catalogue, malformed JSON, payload limit, content-type shield, rate limiting, security logger redaction (9) |
| `postman/Aeterna_One_CRM.postman_collection.json` | Complete Postman v2.1.0 collection covering Health, Super Admin Setup, Auth, RBAC, Users Directory, Pipeline, and API Shield Probes |

## `client/`

| Path | Purpose |
| :-- | :-- |
| `src/main.jsx` / `App.jsx` | Entry + providers (QueryClient, Auth, Permission, Router) |
| `src/queryClient.js` | TanStack Query: staleTime 4m, gcTime 10m |
| `src/routes/AppRoutes.jsx` | Lazy routes; `/pipeline` double-guarded by allowedRoles |
| `src/components/auth/ProtectedRoute.jsx` | Auth → `/login`; role → `/unauthorized`; Outlet/children |
| `src/components/common/*` | Button, Input, custom Select (keyboard), Badge, Card, Modal, ConfirmDialog, LoadingSpinner, StatCard, ErrorBoundary + barrel |
| `src/components/common/__tests__/*` | Client accessibility & keyboard test suite (10 files, 41 tests, Vitest + JSDOM) |
| `src/components/layout/*` | AppLayout (mobile drawer), Sidebar (role-filtered NAV), Header (Ctrl+K, branch pill, avatar menu) |
| `src/components/pipeline/*` | PipelineColumn, PipelineCard (role/branch-disabled actions), NewStudentModal, ReasonModal |
| `src/components/students/*` | StudentHeader, StudentKeyFacts, StudentTabs, DocumentVault (compliance checklist & verification badges), AddNoteModal, StudentSkeleton |
| `src/components/students/__tests__/*` | Student 360° UI component accessibility, tab switching, DocumentVault verification RBAC, and role masking tests (Vitest) |
| `src/context/AuthContext.jsx` + `useAuth.js` | `/me` boot, login/logout, `localStorage` **profile only (`aeterna_user`) — no token (F-02 fixed)** |
| `src/context/PermissionContext.jsx` + `usePermissions.js` | `hasPermission` exposure |
| `src/config/constants.js` | ROLES/BRANCHES/PIPELINE_STAGES mirrors, NAV_ITEMS, **DEMO_CREDENTIALS (F-09, DEV-gated)** |
| `src/config/permissions.js` | PERMISSIONS matrix + hasPermission/hasAnyPermission |
| `src/services/api.js` | Axios instance: baseURL `/api/v1`, `withCredentials`, **no auth header (cookie-only, F-02)**; 401 → `POST /auth/refresh` → retry, else clear `aeterna_user` |
| `src/services/apiErrorHandler.js` + `errorMessages.js` | Centralized error mapping (Rule 17) |
| `src/services/auth.service.js` / `pipeline.service.js` | API wrappers |
| `src/services/student.service.js` | Student 360° API client wrapper (list, getById, create, update, addNote, convertLead) |
| `src/hooks/usePipelineQueries.js` | PIPELINE_KEYS factory + query hook |
| `src/hooks/usePipelineMutations.js` | optimisticWithRevert stage/docs/create mutations |
| `src/hooks/useStudentQueries.js` | STUDENT_KEYS factory + useStudents, useStudent, useUpdateStudent, useAddStudentNote |
| `src/utils/optimistic.js` | Shared optimistic helper (Rule 13) |
| `src/pages/*` | LoginPage (premium split-screen redesign; dev-gated quick login `section.login-dev-section`), DashboardPage, PipelinePage, Student360Page (directory & full profile view), Unauthorized, NotFound |
| `src/styles/*` | variables/layout/components/dashboard/auth/pipeline/students CSS — brand tokens, zero hardcoded component colors; `auth.css` = login keyframes; `students.css` = responsive 360 layout, tabs, shimmer |
| `src/assets/*` | Brand images (brand/heritage/modules/showcase); `heritage/vidhana-soudha.webp` = login hero watermark |

## devil package internals (read-only reference)

`server/node_modules/devil-backend-nodejs/src/`:
`utils/paginate.js` (**ignores `select`** — F-07 root cause),
`utils/generateToken.js` (HS256 sign `{id, role}`),
`utils/ApiResponse.js` (payload spread), `utils/asyncHandler.js`,
`utils/ApiError.js`.

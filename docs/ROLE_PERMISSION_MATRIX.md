# Aeterna One CRM — Role & Permission Matrix and Branch-Access Matrix (`docs/ROLE_PERMISSION_MATRIX.md`)

> **Document Type:** System Architecture & Authorization Matrix (Deliverable for Phase A Day 4)  
> **Source Files Audited:**  
> - Frontend Config: `client/src/config/permissions.js`, `client/src/config/constants.js`  
> - Backend Routes & Middleware: `server/src/modules/auth/auth.routes.js`, `server/src/modules/users/user.routes.js`, `server/src/modules/pipeline/pipeline.routes.js`, `server/src/modules/health/health.routes.js`, `server/src/middleware/roleMiddleware.js`, `server/src/middleware/branchMiddleware.js`, `server/src/modules/pipeline/pipeline.controller.js`  
> - Verifying Automated Suites: `server/test/day4-backend-authz.test.js`, `server/test/opencode-branch-isolation.test.js`, `server/test/opencode-rbac-matrix.test.js`, `server/test/opencode-frontend-contract.test.js`  
> **Last Updated:** 16 November 2026 (Phase A Day 4 Milestone)

---

## 1. Centralized Role & Permission Matrix (5 Roles × Resources)

The five canonical system roles defined in `server/src/config/constants.js#L5-L11` and `client/src/config/constants.js#L5-L11` are:
1. `super_admin` — Managing Director / System Administrator (global cross-branch authority)
2. `branch_manager` — Branch Head (Bengaluru, Mysuru, or Belagavi branch authority)
3. `counsellor` — Education Counsellor (student advisory and stage progression)
4. `application_officer` — Admissions & Document Verification Specialist
5. `marketing` — Digital & Field Lead Acquisition (lead generation visibility)

### 1.1 Active Endpoints vs Frontend Permissions Comparison

| Endpoint & HTTP Method | Target Action | Backend Enforcement (`requireRole`) | Frontend Policy (`client/src/config/permissions.js`) | Divergence / Status |
| :--- | :--- | :--- | :--- | :--- |
| `POST /api/v1/auth/login` | User Authentication | **Public** (`server/src/modules/auth/auth.routes.js#L12`) | N/A (Public Route) | Aligned |
| `POST /api/v1/auth/refresh` | Token Refresh | **Public** (`server/src/modules/auth/auth.routes.js#L13`) | N/A (Cookie/Body Token) | Aligned |
| `POST /api/v1/auth/logout` | Session Invalidation | **Public** (`server/src/modules/auth/auth.routes.js#L14`) | N/A (Cookie Clear) | Aligned |
| `GET /api/v1/auth/me` | Current Profile View | `protect` (All 5 Authenticated Roles) (`server/src/modules/auth/auth.routes.js#L15`) | N/A (Authenticated Actor) | Aligned |
| `POST /api/v1/auth/register` | Staff Provisioning | `protect`, `requireRole('super_admin')` (`server/src/modules/auth/auth.routes.js#L18`) | `settings.manageStaff: ['super_admin']` (`client/src/config/permissions.js#L53`) | Aligned |
| `GET /api/v1/users` | Staff Directory List | `protect`, `requireRole('super_admin', 'branch_manager')` (`server/src/modules/users/user.routes.js#L14`) | `settings.manageStaff` (`client/src/config/permissions.js#L53`) | Aligned |
| `GET /api/v1/pipeline` | Admissions Pipeline View | `protect`, `requireRole('super_admin', 'branch_manager', 'counsellor', 'application_officer')` (`server/src/modules/pipeline/pipeline.routes.js#L21`) | `pipeline.view: ['super_admin', 'branch_manager', 'counsellor', 'application_officer']` (`client/src/config/permissions.js#L20`) | **Exact Match** (Marketing explicitly excluded with 403) |
| `POST /api/v1/pipeline` | Create Candidate Enquiry | `protect`, `requireRole('super_admin', 'branch_manager', 'counsellor')` (`server/src/modules/pipeline/pipeline.routes.js#L28`) | `students.create: ['super_admin', 'branch_manager', 'counsellor']` (`client/src/config/permissions.js#L28`) | **Exact Match** |
| `PATCH /api/v1/pipeline/:id/stage` | Transition Candidate Stage | `protect`, `requireRole('super_admin', 'branch_manager', 'counsellor')` (`server/src/modules/pipeline/pipeline.routes.js#L35`) | `pipeline.moveStage: ['super_admin', 'branch_manager', 'counsellor']` (`client/src/config/permissions.js#L21`) | **Exact Match** |
| `PATCH /api/v1/pipeline/:id/documents` | Toggle Document Verification | `protect`, `requireRole('super_admin', 'branch_manager', 'application_officer')` (`server/src/modules/pipeline/pipeline.routes.js#L42`) | `students.verifyDocs: ['super_admin', 'branch_manager', 'application_officer']` (`client/src/config/permissions.js#L31`) | **Exact Match** (Counsellor & Marketing excluded with 403) |
| `GET /api/v1/health` | Service Health Probe | **Public** (`server/src/modules/health/health.routes.js#L6`) | N/A (Infrastructure Probe) | Aligned |

### 1.2 Documented Divergences & Forward-Planned Modules (Phase B Backlog)

The frontend `permissions.js` file contains permissions for features scheduled across Phase B (Days 6–75). These endpoints are not yet mounted in backend `/api/v1` routes:
* **`leads.*` (view, create, update, assign, delete, export):** Scheduled for implementation in **Phase B1 (Days 6–18)**. Currently, candidates enter via `POST /api/v1/pipeline`.
* **`students.uploadDocs` / `deleteDocs`:** Scheduled for **Phase B3 (Days 31–45)** with Cloud Storage Vault integration.
* **`tasks.*` (view, create, complete, reassign):** Scheduled for **Phase B4 (Days 46–60)**.
* **`reports.*` (viewBranch, viewAllBranches, export):** Scheduled for **Phase B5 (Days 61–75)**.
* **`settings.manageBranches` / `manageIntegrations`:** Scheduled for Phase B administration console.

---

## 2. Branch-Access & Isolation Matrix

Aeterna One operates three physical branches: `bengaluru` (HQ), `mysuru`, and `belagavi`. Cross-branch visibility is strictly controlled by `server/src/middleware/branchMiddleware.js`.

### 2.1 Branch Scope Rules by Role

| Role | Default Branch Scope | Allowed Scope Overrides | Prohibited Scope Actions |
| :--- | :--- | :--- | :--- |
| **`super_admin`** | Global (`req.branchScope = null`) | Can filter by `?branch=<name>` or header `x-branch: <name>` (`server/src/middleware/branchMiddleware.js#L20-L28`) | None. Unrestricted cross-branch authority. |
| **`branch_manager`** | Assigned Branch (`user.branch`) | Can explicitly pass `?branch=<own_branch>` | Cannot access `?branch=<foreign_branch>` (returns 403); `?branch=all` forced to own branch. |
| **`counsellor`** | Assigned Branch (`user.branch`) | Can explicitly pass `?branch=<own_branch>` | Cannot access other branch records (returns 403). Cannot create or mutate foreign students. |
| **`application_officer`** | Assigned Branch (`user.branch`) | Can explicitly pass `?branch=<own_branch>` | Cannot verify documents for candidates outside assigned branch (returns 403). |
| **`marketing`** | Assigned Branch (`user.branch`) | Excluded from pipeline routes | Denied access to pipeline endpoints with 403. |

### 2.2 Tamper-Vector Defense & Test Evidence Matrix

The table below catalogs adversarial attack vectors against branch isolation, the expected HTTP response, the exact enforcement mechanism, and the verifying automated test:

| Vector / Attack Payload | Target Endpoint | User Role & Assigned Branch | Expected Status | Enforcement Mechanism | Verifying Test Citation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Foreign Query Param:** `?branch=mysuru` | `GET /api/v1/pipeline` | Counsellor (`bengaluru`) | **`403 Forbidden`** | `branchMiddleware.js#L40` (Comparison `requestedBranch !== userBranch`) | `server/test/day4-backend-authz.test.js#L158`<br>`server/test/opencode-branch-isolation.test.js#L119` |
| **Wildcard Scope Expansion:** `?branch=all` | `GET /api/v1/pipeline` | Counsellor (`bengaluru`) | **`200 OK` (Scope Forced)** | `branchMiddleware.js#L50` (`req.branchScope = userBranch`) | `server/test/day4-backend-authz.test.js#L188`<br>`server/test/opencode-branch-isolation.test.js#L125` |
| **HTTP Parameter Pollution (HPP):** `?branch=bengaluru&branch=mysuru` | `GET /api/v1/pipeline` | Counsellor (`bengaluru`) | **`403 Forbidden`** | `branchMiddleware.js#L36-L37` (Type normalization detects array input) | `server/test/day4-backend-authz.test.js#L210` |
| **NoSQL Operator Query Injection:** `?branch[$ne]=null` | `GET /api/v1/pipeline` | Counsellor (`bengaluru`) | **`403 Forbidden`** | `branchMiddleware.js#L37` (Object cast to string `"[object Object]"`) | `server/test/day4-backend-authz.test.js#L219` |
| **NoSQL Operator Query Injection:** `?branch[$gt]=` | `GET /api/v1/pipeline` | Super Admin (`all`) | **`200 OK` (Normalized)** | `branchMiddleware.js#L27` (Non-string scope normalized to `null`) | `server/test/day4-backend-authz.test.js#L260` |
| **Spoofed Header Injection:** `x-branch: mysuru` | `GET /api/v1/pipeline` | Counsellor (`bengaluru`) | **`200 OK` (Header Ignored)** | `branchMiddleware.js#L50` (Restricted users ignore header, scope forced to own branch) | `server/test/day4-backend-authz.test.js#L199`<br>`server/test/opencode-branch-isolation.test.js#L132` |
| **Foreign Body Creation:** `{"branch":"mysuru"}` | `POST /api/v1/pipeline` | Counsellor (`bengaluru`) | **`403 Forbidden`** | `branchMiddleware.js#L30-L38` (Checks `req.body.branch`) | `server/test/day4-backend-authz.test.js#L168`<br>`server/test/opencode-branch-isolation.test.js#L177` |
| **Cross-Branch Stage Mutation:** Student belongs to `mysuru` | `PATCH /api/v1/pipeline/:id/stage` | Counsellor (`bengaluru`) | **`403 Forbidden`** | `pipeline.controller.js#L125-L131` (Record-level branch check) | `server/test/day4-backend-authz.test.js#L279`<br>`server/test/opencode-branch-isolation.test.js#L139` |
| **Cross-Branch Document Verification:** Student belongs to `bengaluru` | `PATCH /api/v1/pipeline/:id/documents` | Manager (`mysuru`) | **`403 Forbidden`** | `pipeline.controller.js#L184-L191` (Record-level branch check) | `server/test/day4-backend-authz.test.js#L285`<br>`server/test/opencode-branch-isolation.test.js#L150` |
| **Super Admin Cross-Branch Mutation:** Any student branch | `PATCH /api/v1/pipeline/:id/stage` | Super Admin (`all`) | **`200 OK`** | `pipeline.controller.js#L125-L131` (`role === ROLES.SUPER_ADMIN` check) | `server/test/day4-backend-authz.test.js#L303`<br>`server/test/opencode-branch-isolation.test.js#L160` |

### 2.3 Record-Level Mutation Guards in Source Code

1. **Stage Transition (`PATCH /api/v1/pipeline/:id/stage`):**
   ```javascript
   // server/src/modules/pipeline/pipeline.controller.js#L125-L131
   if (
     req.user?.role !== ROLES.SUPER_ADMIN &&
     req.branchScope !== 'all' &&
     student.branch !== req.user?.branch
   ) {
     throw new ApiError(403, 'Unauthorized to modify student from another branch');
   }
   ```

2. **Document Verification (`PATCH /api/v1/pipeline/:id/documents`):**
   ```javascript
   // server/src/modules/pipeline/pipeline.controller.js#L184-L191
   if (
     req.user?.role !== ROLES.SUPER_ADMIN &&
     req.branchScope !== 'all' &&
     student.branch !== req.user?.branch
   ) {
     throw new ApiError(403, 'Unauthorized to modify student records outside your assigned branch.');
   }
   ```

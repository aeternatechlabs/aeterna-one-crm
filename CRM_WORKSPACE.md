# Aeterna One CRM — Workspace Control Plane & Agent Operating Instructions

> **Workspace Status:** Active  
> **Session State:** Phase A (Days 1–5) Fully Completed & Verified — Ready for Phase B1 Handover (Monday, 16 November 2026)  
> **Current Progress:** Phase A Days 1–5 Completed & Verified (100% Phase A Sign-Off); Overall Progress: **Phase A 100%**  
> **Backend Test Suite Baseline:** **165 tests, 165 pass, 0 fail, 0 todo (exit 0)** across 11 suites (incl. 9 API Shield tests & 6 Super Admin security tests)  
> **Client Accessibility Suite Baseline:** **10 test files, 41 tests, 41 pass, 0 fail (exit 0)**  
> **API Shield & Smart Error Engine Baseline:** **9 tests, 9 pass, 0 fail (exit 0)**  
> **Day 5 Super Admin Security Baseline:** **6 tests, 6 pass, 0 fail (exit 0)**  
> **Day 5 Foundation Verification Baseline:** **8 tests, 8 pass, 0 fail (exit 0)**  
> **Day 4 Authz Suite Baseline:** **24 tests, 24 pass, 0 fail (exit 0)**  
> **Frontend Contract Suite Baseline:** **15 tests, 15 pass, 0 fail (exit 0)**  
> **Independent Adversarial Probe:** **30 cases, 30 pass, 0 fail** (own harness, outside repo, DB dropped)  
> **Client Production Build Baseline:** **Vite v8.3.8 build green in 3.35s, 2240 modules, 0 password literals, 0 secret leaks (exit 0)**  
> **Next Milestone:** **Phase B1 (Lead Management, Days 6–18)** unlocked. Day 6 (Lead Domain Discovery and Business Rules) awaiting Project Owner dispatch.

---

## 1. Antigravity Instructions (Primary Developer & Implementation Owner)

### Role & Ownership
- Owns application source code: `server/src/**` and `client/src/**`.
- Responsible for feature implementation, bug fixes, UI/UX engineering, and performance optimization according to `AETERNA_ONE_90_DAY_DETAILED_ROADMAP.md`.

### Core Operating Rules
1. **User-Driven Dispatch:** Do not initiate Day 5 or any new module until the Project Owner explicitly assigns the task in the active dispatch file (`TASK_ANTIGRAVITY.md` / `TASK_OPENCODE.md`).
2. **Pre-Implementation Review:** Always inspect `RULES.md`, `task.md`, and relevant `brain/` documentation before editing codebase files.
3. **Ponytail Engineering Standard:** "The best code is the code you never wrote."
   - Follow the 7-rung decision ladder: YAGNI check, reuse existing utilities, standard library first, native browser/platform features, existing dependencies, clean/direct logic, minimum viable code.
   - Zero unrequested bloat or unnecessary refactoring.
4. **Zero Regression & Backward Compatibility:** Never break or alter existing working features to accommodate a new one. Maintain desktop and mobile compatibility.
5. **Security & Boundary Enforcement:**
   - Fail-closed secrets: missing `PORT`, `MONGO_URI`, or `JWT_SECRET` must immediately stop startup (`process.exit(1)`).
   - Strict branch scoping: users must never access cross-branch records unless authorized as `super_admin`.
   - Data minimization: always enforce projection allowlists and strip `-password -__v` from responses.
   - Preserve `import.meta.env.DEV` gating for development credentials (zero password literals in production builds).
6. **Local Verification Protocol:**
   - Before handing off work, run the test suites and production build:
     ```bash
     npm --prefix server test
     node --test server/test/opencode-frontend-contract.test.js
     npm run build:client
     powershell -Command "Select-String -Path 'client/dist/assets/*.js' -Pattern 'Password@123'"
     ```
   - Both test suites must report 0 failures, and the bundle scan must return 0 secret/password literals.
7. **Handoff to OpenCode:** Document exact changed files, architectural rationale, and verification commands in the Handoff Record at the bottom of `TASK_ANTIGRAVITY.md`. Never mark tasks as complete in `task.md` without OpenCode's independent verification.
8. **Mandatory WebP Image Asset Standard (Rule 21):** Never introduce uncompressed PNG or JPG assets into `client/src/assets/` or `client/public/`. All raster graphics must be converted to lightweight `.webp` format before importing into components, preserving RGBA transparency. (Root browser favicons excepted).

---

## 2. OpenCode Instructions (Independent Tester, Security Reviewer & Documentation Owner)

### Role & Ownership
- Owns independent verification, security review, automated test suites (`server/test/**`), and technical documentation (`brain/**`, `task.md`, and workspace status logs).
- Acts as the quality gatekeeper before any milestone is marked complete.

### Core Operating Rules
1. **Independent Verification:** Inspect all Antigravity implementations directly from source code and runtime behavior. Never accept self-reported results without independent proof.
2. **Strict Non-Interference:** Never modify application source code (`server/src/**`, `client/src/**`) during review or verification passes.
3. **Comprehensive Test Execution:**
   - Execute the full backend test runner (`npm --prefix server test`).
   - Execute the frontend contract suite (`node --test server/test/opencode-frontend-contract.test.js`).
   - Verify production client build (`npm run build:client`).
   - Audit client bundle chunks (`client/dist/assets/*.js`) for token, password, or secret leakage.
4. **Security & Negative Case Auditing:**
   - Verify negative authorization cases (unauthenticated access, unauthorized roles, cross-branch tampering, header injections).
   - Validate input sanitization, regex injection / ReDoS protections, CORS origin restrictions, and rate limiting.
   - Confirm cookie security (`httpOnly`, `sameSite`, `secure`).
5. **Defect & Regression Reporting:** If any test fails, regression occurs, or security gap is discovered:
   - Immediately report findings with severity (P0/P1/P2), exact line references, and reproducible steps in `TASK_OPENCODE.md` (§4 Verification Record).
   - Return task to Antigravity for remediation; do not close or approve until re-tested.
6. **Documentation & Sign-off:** Only when all tests pass with 0 failures, 0 regressions, and 0 security gaps:
   - Update `task.md` with verified evidence (test counts, duration, and pass status).
   - Update `CRM_WORKSPACE.md` control plane status.
   - Update relevant documentation in `brain/` (`backend.md`, `frontend.md`, `security.md`, `testing.md`, `file-map.md`).

---

## 3. Collaboration & Handoff Lifecycle

```text
[Project Owner Dispatch (active dispatch file)]
                   │
                   ▼
       ┌────────────────────────┐
       │      Antigravity       │
       │  (Code Implementation) │
       └───────────┬────────────┘
                   │
                   │ Implements minimal fix/feature
                   │ Runs server tests & client build
                   │ Documents changes in TASK_ANTIGRAVITY.md
                   ▼
       ┌────────────────────────┐
       │        OpenCode        │
       │ (Independent Auditing) │
       └───────────┬────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
   [Defect Found]      [All Verified]
        │                     │
        ▼                     ▼
Returns to Antigravity   Updates task.md,
for remediation         CRM_WORKSPACE.md, & brain/
```

---

## 4. Standard Verification Commands

```bash
# 1. Run full backend integration & security suite
npm --prefix server test

# 2. Run frontend contract & architectural rules suite
node --test server/test/opencode-frontend-contract.test.js

# 3. Build production client bundle
npm run build:client

# 4. Verify zero password or secret leakage in production bundle
powershell -Command "Select-String -Path 'client/dist/assets/*.js' -Pattern 'Password@123'"
```

---

## 5. Current Standing

- **Roadmap Phase:** Phase A (Days 1–5 Architecture Foundation) **100% Completed & Verified**.
- **System State:** Clean, hardened, and verified — backend 150/150 pass, client a11y 41/41 pass, day5 verification 8/8 pass, contract 15/15 pass, adversarial probe 30/30 pass, client build green, 0 lint errors, 0 secret leaks, 0 todo.
- **Verification Evidence (16 Nov 2026):**
  - `npm --prefix server test` → **11 suites, 150/150 pass, 0 fail, 0 todo (exit 0)**
  - `npm --prefix client test` → **10 test files, 41/41 pass, 0 fail (exit 0)**
  - `node --test server/test/day5-foundation-verification.test.js` → **8/8 pass, 0 fail (exit 0)**
  - `node --test server/test/opencode-frontend-contract.test.js` → **15/15 pass, 0 fail (exit 0)**
  - `npm run build:client` → **green (vite 8.3.8, 2240 modules, 3.35s, exit 0)**
  - `npm --prefix client run lint` → **0 errors (7 pre-existing warnings in untouched files, exit 0)**
  - Production bundle secret scan (`Password@123`) → **0 matches (clean, exit 0)**
  - Independent adversarial HTTP probe (HPP / NoSQL object params / body tamper / header spoof / 5-role matrix) → **30/30 pass (exit 0)**
- **Deliverables Verified:**
  - `docs/ROLE_PERMISSION_MATRIX.md` — 5 roles matrix, endpoint comparison, Phase B divergence tracking, and tamper-vector defense table (all line citations exact).
  - `docs/COMPONENT_INVENTORY.md` — 10 common primitives + barrel props, design tokens, ARIA behavior, and test citations.
  - `docs/PHASE_A_VERIFICATION_REPORT.md` — Phase A verification report, known-issues list, and prioritized Phase B backlog.
- **Action Required:** Phase A is 100% complete and signed off. Phase B1 (Lead Management, Days 6–18) is unlocked. Day 6 (Lead Domain Discovery and Business Rules) awaits explicit dispatch from the Project Owner.

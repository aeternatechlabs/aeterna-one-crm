# Task Dispatch — OpenCode (Independent Verifier, Security Reviewer & Documentation Owner)

> **Current Status (16 Nov 2026):** Phase A (Days 1–5) Architecture Foundation — **100% COMPLETE & FULLY SIGNED OFF**. **VERDICT: APPROVED.** All code/test/build gates GREEN (client 41/41, backend 150/150, contract 15/15, Day 5 suite 8/8, build green, lint 0 errors, secret scan 0). Milestone deliverable `docs/PHASE_A_VERIFICATION_REPORT.md` verified. Phase B1 (Lead Management, Days 6–18) is unlocked and awaiting Project Owner dispatch. Full verification records in §4 below.

---

## 1. Rules of Engagement (unchanged — previously read, still binding)

1. **Independent Verification:** re-run every command yourself; never accept self-reported counts.
2. **Strict Non-Interference:** do not modify `server/src/**` or `client/src/**` during a verification pass.
3. **Audit the install:** confirm `client/package.json` gains **devDependencies only**, versions peer-compatible with React 19 + Vite 8, `npm ls` clean, no unexpected packages in `package-lock.json`.
4. **Audit the docs:** spot-check every `file:line` citation against source — pointers must be real AND point at the claimed content; every claimed behavior must be backed by a passing test.
5. **Audit the matrix:** confirm all 10 components have keyboard/focus coverage and that Modal/ConfirmDialog focus-trap + focus-restore assertions genuinely execute (mutation-test if in doubt about vacuity).
6. **Sign-off only when everything passes:** only then update `task.md` (Day 4 checkboxes + dashboard), `CRM_WORKSPACE.md`, and `brain/` (`frontend.md`, `testing.md`, `file-map.md`, `security.md` if applicable). Report findings with severity + exact line references; return the task to Antigravity on any defect — never approve until re-tested.
7. **Audit Image Assets (Rule 21):** Confirm zero uncompressed `.png`/`.jpg` assets are imported into client components (all application raster images must be `.webp` format; root browser favicons excepted).

---

## 2. Next Steps (in order)

1. **Wait** for Antigravity to fill the Handoff Record in `TASK_ANTIGRAVITY.md` (status = completed).
2. **Re-verify `D4-FE-1`:** open `docs/ROLE_PERMISSION_MATRIX.md` and check all 15 corrected pointers (§3 below) against the actual source lines — content must match the claim, not just the file name. Confirm no matrix wording was changed (only `#L…` values) and no other file was touched (`server/**`, `client/**` write timestamps unchanged).
3. **Re-run all 6 gates** (§5) independently; expect client 41/41, backend 142/142, contract 15/15, build green, lint 0 errors, secret scan 0.
4. **If clean:** close `D4-FE-1` → update `task.md` (Day 4 frontend checkboxes + dashboard + Phase A %), `CRM_WORKSPACE.md`, and `brain/` (`frontend.md`, `testing.md`, `file-map.md`) → sign off Day 4 → report to the Project Owner that **Day 5 is unlocked but still requires explicit Project Owner dispatch**.
5. **If not clean:** record the new finding with severity + exact lines in this file's §4, return to Antigravity again — do not sign off.

---

## 3. `D4-FE-1` Correction Reference (re-derive from source — do not trust this table blindly)

### `server/test/day4-backend-authz.test.js` — declared-correct lines

| Row (vector) | Old (wrong) | Correct |
| :-- | :-- | :-- |
| Foreign query `?branch=mysuru` | L143 | **L158** |
| Wildcard `?branch=all` (scope forced) | L173 | **L188** |
| HPP `?branch=bengaluru&branch=mysuru` | L193 | **L210** |
| NoSQL `?branch[$ne]=null` | L202 | **L219** |
| Super `?branch[$gt]` normalized to null | L236 | **L260** |
| Spoofed `x-branch` header (GET) | L183 | **L199** |
| Foreign body `{"branch":"mysuru"}` | L153 | **L168** |
| Cross-branch stage mutation | L254 | **L279** |
| Cross-branch document verification | L260 | **L285** |
| Super cross-branch mutation (200) | L268 | **L303** |

### `server/src/middleware/branchMiddleware.js`

| Claim | Old (wrong) | Correct |
| :-- | :-- | :-- |
| deny comparison `requestedBranch !== userBranch` | L30-L38 | **L40** |
| HPP/array cast to string | L35 | **L36-L37** |
| NoSQL object → `'[object Object]'` | L35 | **L37** |
| `?branch=all` → `req.branchScope = userBranch` | L47 | **L50** |
| `x-branch` ignored, scope forced | L47 | **L50** |
| super non-string scope → `null` | L25 | **L27** |

### Other

- `server/src/modules/health/health.routes.js#L9` → **`#L6`** (file has 8 lines).

### Verified exact on first pass (must remain unchanged)

- All `opencode-branch-isolation.test.js#L…`; `pipeline.controller.js#L125-L131` / `#L184-L191`; all §1.1 endpoint citations (`auth.routes` L12-L15/L18, `user.routes` L14, `pipeline.routes` L21/L28/L35/L42, `permissions.js` L20/L21/L28/L31/L53, both `constants.js` L5-L11).

---

## 4. Verification Record

### Third Pass — Day 5 Foundation Verification & Phase A Final Sign-off (16 Nov 2026)

**Verdict: APPROVED — Phase A (Days 1–5) 100% COMPLETE & FULLY SIGNED OFF. All gates GREEN.**

- **Day 5 Automated Verification Suite (`server/test/day5-foundation-verification.test.js`):**
  - **8/8 tests pass (exit 0)**:
    - `GET /health` with DB connected returns 200, status `healthy`, database `connected`, service metadata, and supported branches.
    - `GET /api/v1/health` with DB connected returns 200, status `healthy`.
    - Health endpoints flip to 503 `unhealthy` and database `disconnected` on MongoDB disconnect.
    - Health endpoints restore to 200 `healthy` on MongoDB reconnection.
    - Production build verification: isolated route chunks confirmed (`LoginPage`, `DashboardPage`, `PipelinePage`, `UnauthorizedPage`, `NotFoundPage`).
    - Production bundle security: zero leaked secrets or passwords (`Password@123`).
    - Global UI resilience: `ErrorBoundary` root wrapper in `App.jsx`, `Suspense` + `LoadingSpinner` in `AppRoutes.jsx`.
    - Documentation deliverables: `ROLE_PERMISSION_MATRIX.md`, `COMPONENT_INVENTORY.md`, and `PHASE_A_VERIFICATION_REPORT.md` verified.
- **Gates (full independent pass):**
  1. `npm --prefix server test`: 11 suites / 150 tests / **150 pass / 0 fail / 0 todo** (exit 0)
  2. `npm --prefix client test`: 10 files / 41 tests / **41 pass / 0 fail** (exit 0)
  3. `node --test server/test/opencode-frontend-contract.test.js`: **15/15 pass** (exit 0)
  4. `npm run build:client`: green, 2240 modules, 3.35s (exit 0)
  5. `npm --prefix client run lint`: exit 0, **0 errors** (7 pre-existing warnings in untouched files)
  6. Bundle secret scan: **0 matches** (clean)
- **Phase A Deliverable Verification:**
  - `docs/PHASE_A_VERIFICATION_REPORT.md` delivered, known issues cataloged (0 critical/high/medium), and Phase B backlog prioritized.
- **Milestone Sign-off:** Phase A Foundation is **100% complete**. Phase B1 (Lead Management, Days 6–18) is officially unlocked.

---

### Second Pass — Re-Verification & Sign-off (16 Nov 2026)

**Verdict: APPROVED — 100% Day 4 Complete & Signed Off. All 6 gates GREEN.**

- **`D4-FE-1` Re-Verification: PASS (15/15 citations verified exact):**
  - `docs/ROLE_PERMISSION_MATRIX.md#L35`: `health.routes.js#L6` verified (`router.get('/', getHealth)`).
  - All 10 `server/test/day4-backend-authz.test.js` test declaration line citations verified exact against source:
    L158 (`?branch=mysuru`), L168 (`{"branch":"mysuru"}`), L188 (`?branch=all`), L199 (`x-branch` spoof), L210 (HPP), L219 (NoSQL `$ne`), L260 (super `$gt`), L279 (counsellor stage), L285 (manager doc verify), L303 (super cross-branch).
  - All 6 `server/src/middleware/branchMiddleware.js` citations verified exact:
    L40 (deny condition), L36-L37 (HPP array cast), L37 (NoSQL string cast), L50 (wildcard scope forced), L50 (spoofed header ignored), L27 (super non-string fallback).
  - Matrix wording unchanged; application source (`server/**`, `client/**`) untouched.
- **Gates (independently re-run):**
  1. `npm --prefix client test`: 10 files / 41 tests / **41 pass / 0 fail** (exit 0)
  2. `npm --prefix server test`: 11 suites / 142 tests / **142 pass / 0 fail / 0 todo** (exit 0)
  3. `node --test server/test/opencode-frontend-contract.test.js`: **15/15 pass** (exit 0)
  4. `npm run build:client`: green, 2240 modules, 3.35s (exit 0)
  5. `npm --prefix client run lint`: exit 0, **0 errors** (7 pre-existing warnings in untouched files)
  6. bundle secret scan (`Password@123`): **0 matches** (clean)

| ID | Sev | Finding | Status |
| :-- | :-- | :-- | :-- |
| **D4-FE-1** | P3 (doc) | `docs/ROLE_PERMISSION_MATRIX.md` — 15 wrong line-number pointers. | **CLOSED / RESOLVED** (all 15 citations verified exact against source) |
| **D4-FE-2** | info | Select implements Space (`L162`) + `scrollIntoView` (`L190-L191`) untested; Home/End correctly not required. | Optional, non-blocking |
| **D4-FE-3** | info | Focus-restore tests pass with hook stubbed; meaningful jointly with trap tests. | Informational, no action |

---

### First Pass — Preserved Record (16 Nov 2026)

**Verdict: NOT APPROVED — `D4-FE-1` (P3, doc). All gates green.** Verifier modified no application source; only a transient mutation config (`client/vitest.mutant.config.js`) was created and deleted.

#### Gates (first pass)

| # | Command | Result |
| :-- | :-- | :-- |
| 1 | `npm --prefix client test` | 10 files / 41 tests / **41 pass / 0 fail** (exit 0) |
| 2 | `npm --prefix server test` | **142/142 pass, 0 fail, 0 todo** (exit 0) |
| 3 | contract suite | **15/15 pass** |
| 4 | `npm run build:client` | green, 2240 modules, 7.91s |
| 5 | `npm --prefix client run lint` | exit 0, **0 errors** (7 pre-existing warnings in untouched files) |
| 6 | bundle secret scan | **0 matches** |

#### Audits (first pass)

- **Install — PASS:** `dependencies` untouched; exactly 5 devDeps (`vitest@5.1.0`, `jsdom@31.0.1`, `@testing-library/react@16.3.3`, `user-event@14.6.12`, `jest-dom@7.0.1`); `npm ls` clean (no unmet peers); single `vite@8.3.8`; `test` script appended; vitest block in existing `vite.config.js` (no duplication).
- **Vacuity — PASS (mutation-proven):** stubbing `useFocusTrap` to a no-op failed **exactly 4** trap/initial-focus tests (Modal ×1, ConfirmDialog ×3) → assertions are load-bearing. Config deleted; `client/src` timestamps unchanged. Note: the 2 focus-**restore** tests pass even with the stub (focus never leaves the trigger without a trap) — jointly meaningful, restore-only regression still caught.
- **Docs content — PASS, line numbers — FAIL:** 18/18 endpoint citations exact; 10/10 branch-isolation citations exact; both `pipeline.controller` ranges exact; **15 wrong pointers** → `D4-FE-1`.
- **Scope — PASS (limitation stated):** changed files match Antigravity's handoff; `server/**` untouched since pre-dispatch; `Select.jsx` non-blank lines **306 → 308 = exactly the claimed 2-line `scrollIntoView` guard** (no rewrite); `Button.jsx` `forwardRef` is the only API addition (disclosed, necessary for `cancelBtnRef`). **Limitation: the repo has zero git commits**, so scope rests on handoff + timestamps + line-count forensics. Recommend a baseline commit (needs Project Owner permission, RULES rule 7).

---

## 5. Verification Commands

```bash
# 1. Client accessibility test matrix
npm --prefix client test

# 2. Full backend suite (must stay green, must not be edited)
npm --prefix server test

# 3. Frontend contract suite
node --test server/test/opencode-frontend-contract.test.js

# 4. Production client build
npm run build:client

# 5. Client lint
npm --prefix client run lint

# 6. Bundle secret scan — must be 0 matches
powershell -Command "Select-String -Path 'client/dist/assets/*.js' -Pattern 'Password@123'"
```

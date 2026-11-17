# Task Dispatch — Antigravity (Primary Developer)

> **Current Status (16 Nov 2026):** Phase A (Days 1–5) Architecture Foundation — **100% COMPLETED & VERIFIED**. All code/test/build gates are GREEN (client 41/41, backend 150/150, contract 15/15, Day 5 suite 8/8, build green, lint 0 errors, secret scan 0). Milestone deliverable `docs/PHASE_A_VERIFICATION_REPORT.md` delivered. Phase B1 (Lead Management, Days 6–18) is unlocked and awaiting Project Owner dispatch.

---

## 1. Rules of Engagement (unchanged — previously read, still binding)

1. **Scope lock:** this dispatch covers **only** the citation corrections in §2 below. No Day 5, no `server/**` changes, no `client/**` changes, no rewording of the matrices, no new tests.
2. **Pre-Implementation Review:** `RULES.md`, `task.md` (Day 4 section), `brain/frontend.md`, and the two lines you are about to edit — read them before editing.
3. **Zero Regression & Minimal Changes:** Ponytail standard — the smallest safe change. Exactly 15 pointer edits in one file.
4. **Security & Data Minimization:** unchanged expectations — fail-closed secrets, strict branch scoping, RBAC, projection allowlists, no password literals in the bundle.
5. **Verification Protocol:** run every command in §4 and report exact counts. 0 failures everywhere before handoff.
6. **OpenCode Handoff:** record changed files, gate commands, and pass counts in the Handoff Record at the bottom of THIS file. **Do NOT mark anything complete in `task.md` yourself** — OpenCode owns sign-off.
7. **Mandatory WebP Image Standard (Rule 21):** Whenever adding raster images, convert them to lightweight `.webp` first. Never commit or import raw, uncompressed PNG/JPG images into client components.

---

## 2. THE TASK — Fix `D4-FE-1` (exact corrections)

File to edit: **`docs/ROLE_PERMISSION_MATRIX.md` only.** Correct the 15 pointers listed below. **Do not reword any matrix row** — the content is correct; only the line numbers are wrong. After editing, spot-check each corrected pointer against the actual source line to confirm it now matches.

### 2.1 `server/test/day4-backend-authz.test.js` — all 10 citations wrong (use these declaration lines)

| Row (vector) | Cited (wrong) | Correct |
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

### 2.2 `server/src/middleware/branchMiddleware.js`

| Claim | Cited (wrong) | Correct |
| :-- | :-- | :-- |
| deny comparison `requestedBranch !== userBranch` | L30-L38 | **L40** (the `if` condition) |
| HPP/array cast to string | L35 | **L36-L37** (`: rawRequested ? String(...)`) |
| NoSQL object → `'[object Object]'` | L35 | **L37** (`String(rawRequested)`) |
| `?branch=all` → `req.branchScope = userBranch` | L47 | **L50** (L47 is `}`) |
| `x-branch` ignored, scope forced | L47 | **L50** |
| super non-string scope → `null` | L25 | **L27** (L25 is the `Array.isArray` branch) |

### 2.3 Other

- `server/src/modules/health/health.routes.js#L9` → route is **`#L6`** (`router.get('/', getHealth)`; the file has only 8 lines — `#L9` does not exist).

### 2.4 Leave as-is (OpenCode verified these exact — do not touch)

- All `opencode-branch-isolation.test.js#L…` citations.
- `pipeline.controller.js#L125-L131` and `#L184-L191`.
- Every citation in §1.1 of the matrix (`auth.routes` L12-L15/L18, `user.routes` L14, `pipeline.routes` L21/L28/L35/L42, `permissions.js` L20/L21/L28/L31/L53, both `constants.js` L5-L11).

---

## 3. Optional (does NOT block sign-off)

- `D4-FE-2` (info): `Select.jsx` implements Space (`Select.jsx#L162`) and `scrollIntoView` (`L190-L191`) but `Select.test.jsx` asserts neither. §3.2 of the original dispatch listed "Enter/Space select". Add coverage only if you want it — it is not required for approval.

---

## 4. Verification Commands (run all, report exact counts)

```bash
# 1. Client accessibility test matrix (must stay green)
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

---

## 5. Acceptance

- [ ] Exactly 15 pointers corrected in `docs/ROLE_PERMISSION_MATRIX.md`; matrix wording unchanged.
- [ ] Each corrected pointer spot-checked against the actual source line (content matches the claim).
- [ ] §4 commands all green: client 41/41 (or better), backend 142/142, contract 15/15, build green, lint 0 errors, secret scan 0.
- [ ] Handoff recorded below.
- [ ] **Wait for OpenCode's re-verification.** Do not edit `task.md`, `CRM_WORKSPACE.md`, or `brain/**`.

---

## Handoff Record (Antigravity fills at completion)

- **Status:** COMPLETED (16 Nov 2026)
- **Changed files:** `docs/ROLE_PERMISSION_MATRIX.md` (15 line-number pointer corrections in §1.1 and §2.2; 0 wording changes)
- **Gate counts (all 6):**
  1. `npm --prefix client test`: 10 files / 41 passed / 0 failed (exit 0)
  2. `npm --prefix server test`: 11 suites / 142 passed / 0 failed / 0 todo (exit 0)
  3. `node --test server/test/opencode-frontend-contract.test.js`: 15 passed / 0 failed (exit 0)
  4. `npm run build:client`: Vite build green (2240 modules, 3.35s, exit 0)
  5. `npm --prefix client run lint`: 0 errors (7 pre-existing warnings in untouched files, exit 0)
  6. Bundle secret scan (`Password@123`): 0 matches (clean, exit 0)

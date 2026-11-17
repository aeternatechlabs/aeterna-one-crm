# Security Model & Findings

Status: verified 11 Nov 2026 by OpenCode independent HTTP-level test pass —
109 tests, 99 pass, 0 fail, 10 todo (= documented findings). Antigravity's
P0 remediation suite (19 tests) also green under the same harness.

**Day 4 backend authorization hardening independently verified by OpenCode
16 Nov 2026:** dedicated suite `day4-backend-authz.test.js` **24/24 pass**;
full backend suite **142/142 pass, 0 fail, 0 todo (exit 0)**; frontend
contract **15/15 pass**; client production build green (vite 8.3.8,
2239 modules, 4.48s). Plus an independent 30-case adversarial HTTP probe
(own harness, outside repo, DB dropped) — **30/30 pass**: HPP duplicate
params, NoSQL object params, JSON body object/array tamper, `x-branch`
header spoofing on writes with DB re-read, full 5-role matrix, auth
negatives. Verdict: **no blocking findings**; two informational
observations (D4-OBS-1, D4-OBS-2) recorded below. No application source
was modified by the verifier.

P1 batch (F-01, F-05) independently verified by OpenCode 13 Nov 2026:
suite **111 tests, 103 pass, 0 fail, 8 todo** plus a 25-case standalone edge
harness (exit 0) and a green frontend production build.

P2 batch (F-04, F-03, F-06, F-08, F-07, F-09, F-02 + P3) independently
verified by OpenCode 13 Nov 2026: suite **111 tests, 111 pass, 0 fail,
0 todo** exit 0, client build green, dist password scan clean, standalone
33-case behavioral harness **31 pass / 2 fail (exit 1)**. Verdict: 7 of 8
items verified; **F-06 FAILED — the fix introduced a regression**
(`?fields=<valid>` → HTTP 500, raw Mongo error leaked; see open findings).
No application source was modified by the verifier. Evidence below;
commands in `testing.md`.

F-06R regression + OBS-1 corrected by Antigravity 13 Nov 2026, then
independently re-verified by OpenCode same day: suite **114 tests, 114
pass, 0 fail, 0 todo** exit 0; upgraded standalone harness **44 pass /
0 fail (exit 0)** — F-06 valid-field requests now return 200 with exact
allowlisted key sets, OBS-1 invalid users search returns exactly 400,
and the full F-04/F-03/F-08/F-07 regression sweep stayed green. **All 8
P2 items verified; Phase P2 officially COMPLETED & VERIFIED.** Verifier
modified no application source.

## Threat model (summary)

| Asset | Threat | Primary control |
| :-- | :-- | :-- |
| Staff accounts / passwords | credential stuffing, user enumeration, leakage in responses | generic login 401, bcrypt (cost 10), schema `select:false`, responses exclude password |
| JWT session | forgery (alg:none, secret guessing), tampering, replay after delete/deactivate, role spoofing | HS256 verify, fail-closed no-default-secret, DB re-lookup per request (role/active never trusted from token) |
| Registration endpoint | public privilege escalation | `protect → requireRole(super_admin)` before validation; `branch:'all'` super-only |
| Cross-branch student data | counsellor reading/writing other branches | route `requireBranchAccess` scope + per-record branch guards on all writes; branch value type-normalized (string trim/lowercase, array → `String()`, object → `'[object Object]'` → 403) so HPP arrays and NoSQL object shapes cannot reach the filter |
| Route privileges | role reaching forbidden endpoints | `requireRole` per route (matrix below); Day 4 suite + 30-case independent probe confirm all 5 roles |
| Transport/headers | clickjacking, MIME sniffing, MITM | helmet (CSP/HSTS/nosniff/frame), CORS origin allowlist + credentials |
| Brute force / DoS | login spam, huge pagination, regex DoS | rate limit 100/15min on `/api`; pagination capped (F-05 fixed, verified); pipeline search escaped + validated → 400 (F-08 fixed, verified; **users search regex still unvalidated — OBS-1**) |
| XSS token theft | token exfiltration | httpOnly cookie only — no localStorage token (F-02 fixed, verified); demo creds DEV-gated + absent from prod bundle (F-09 fixed, verified) |

## Verified controls (test evidence in `server/test/opencode-*.test.js`)

### Authentication — `opencode-http-auth.test.js` (26/26)
- ✅ login 200 + token + httpOnly cookie + `user` without password.
- ✅ unknown email ≡ wrong password (same 401 message); malformed email 400.
- ✅ deactivated login 403; live token → 403 after deactivation.
- ✅ token negatives all rejected: garbage, wrong secret, expired, `alg:none`,
  tampered payload, deleted user (401), valid user via cookie & Bearer.
- ✅ missing `JWT_SECRET` → 500 (fail-closed, no fallback key).
- ✅ logout clears cookie.

### Registration RBAC — same file + `opencode-rbac-matrix.test.js`
- ✅ anon → 401; each non-super role → 403 **and no user created**;
  super → 201 with bcrypt hash (never plaintext); duplicate → 409;
  `branch:'all'` + non-super → 400; invalid role/branch/short pw → 400.
- ✅ RBAC precedes validation (non-super + invalid body → 403, not 400).

### Role matrix — `opencode-rbac-matrix.test.js` (6/6)
5 roles × 6 endpoints (+ anon): exactly matches route `requireRole` sets;
marketing cannot touch pipeline (403 on GET/POST/PATCH×2);
application_officer: read + documents only (stage move 403);
counsellor: read + create + stage (documents 403);
users list: super + branch_manager only.

### Branch isolation — `opencode-branch-isolation.test.js` (15/15)
- ✅ list scoped to own branch; `?branch=other` → 403; `?branch=all` on
  restricted → still own-branch data (scope forced).
- ✅ `x-branch` header cannot widen restricted users (ignored).
- ✅ cross-branch stage move & documents toggle → 403 with DB unchanged;
  super performs same writes → 200.
- ✅ create: body branch cross → 403; forced own-branch create → 201;
  users list branch-scoped.
- ⚠️ latent: pre-provisioned non-super `branch:'all'` account reads all
  branches (register validator blocks creating them; model enum allows).

### Business rules — `opencode-pipeline-validation.test.js`
- ✅ invalid stage 400; docs-before-submitted gate; lost reason ≥5 chars;
  `simulateError` (body+header) → 400, no mutation; 404 unknown id, 400
  non-ObjectId; `stageHistory` `{from,to,changedBy}` recorded; list default
  excludes `stageHistory`/`__v`; search matches; pagination works;
  `limit=abc` → default 10; **password never serialized** in any response.

### HTTP hardening — `opencode-http-hardening.test.js`
- ✅ helmet header set present; structured JSON 404; health reflects live DB
  (`database` field); CORS allows configured origin + preflight with
  `Authorization`/`x-branch`; production-without-origin → 500 clean (no stack);
  non-dev responses have no `stack`; rate limit → 429 + `RateLimit-*` headers.
- ✅ `X-Powered-By` absent (was a candidate finding — cleared).

### Frontend contract — `opencode-frontend-contract.test.js`
- ✅ `AppRoutes` `/pipeline` allowedRoles == backend GET roles;
  `permissions.pipeline.view/moveStage`, `students.create/verifyDocs` ==
  backend sets; NAV_ITEMS `/pipeline` == backend; client/server ROLES parity;
  `ProtectedRoute` redirect logic; api.js Bearer + 401 cleanup; LoginPage
  `isDev` gate before `DEMO_CREDENTIALS`; zero secrets in client source.

### Day 4 authorization hardening — `day4-backend-authz.test.js` (24/24) + independent probe (30/30)
- ✅ Role matrix over all four pipeline endpoints + `GET /users`: `marketing`
  403 everywhere; `application_officer` read + documents only (stage 403);
  `counsellor` read + create + stage (documents 403); users directory
  super + branch_manager only; 401 when `req.user` absent (both middlewares).
- ✅ **Scope locking:** restricted users without a param are auto-scoped to
  `req.user.branch`; foreign `branch` in query / body / route params → 403;
  `?branch=all` → forced back to own branch; spoofed `x-branch` header →
  ignored (scope forced); super admin default `req.branchScope === null`.
- ✅ **Type normalization (the Day 4 hardening core):** non-string branch
  values are normalized or rejected before reaching Mongo — HPP-collapsed
  arrays, `?branch[$ne]=null`, `?branch[$regex]=.*`, and JSON body
  `branch: { $gt: '' }` / `branch: ['mysuru','bengaluru']` all denied (403).
  Super admin's non-string scope normalizes to string-or-null without error.
- ✅ **Record guards:** cross-branch stage move and documents toggle → 403
  with the database re-read and **unchanged**, including attempts carrying a
  spoofed `x-branch: mysuru` header; same-branch user authorized; super
  admin authorized across branches.
- ✅ **Independent adversarial probe (16 Nov 2026, own harness):** real-HTTP
  confirmation of everything above plus `?branch=mysuru&branch=bengaluru`
  → 200 scoped to own branch (HPP keeps last, scope forces own branch),
  `?branch[]=mysuru` bracket form → 403, `?stage[$ne]` / `?role[$ne]` do not
  error and never escape branch scope, body `branch: 'all'` → 201 persisted
  with **own** branch, full 5-role `GET /users` matrix, anonymous +
  garbage-token → 401. **30/30 pass, exit 0.**


## Remediated findings — verified by OpenCode (13 Nov 2026)

| ID | Sev | Finding | Resolution | Test Status |
| :-- | :-- | :-- | :-- | :-- |
| **F-01** | P1 | Development CORS allows any origin with credentials | Replaced wildcard in `server/src/app.js` with explicit `allowedOrigins` list (4 localhost entries + `CLIENT_URL`/`FRONTEND_URL`, read at load time); gated wildcard behind `CORS_ALLOW_ALL_DEV=true` (exact match) AND `NODE_ENV==='development'`; denied origins get policy error, no ACAO | **Verified:** suite tests demoted to enforcing (`hardening` F-01 negative + `P1-CORS` positive) + standalone 10-case harness (dev default-deny, opt-in flag, case-sensitive flag, prod override denied, no-Origin allowed, preflight evil denied) — all pass; suite exit 0 |
| **F-05** | P1 | `GET /users` `limit` unbounded | `safeLimit` = fallback 10 when `isNaN || <=0`, else `Math.min(parseInt(limit,10), 100)` + `safePage` ≥1 in `server/src/modules/users/user.controller.js:48-53` | **Verified:** suite tests demoted to enforcing (`pipeline` F-05 + `P1-PAGINATION`) + standalone 15-case harness (cap 100, boundary 100/101, abc/0/-5/empty→10, 1.9→1, page=0/abc/-3→1, out-of-range 200-empty, duplicate param, fields+limit) — all pass; 25/25 harness exit 0 |
| **F-04** | P2 | Stack traces leaked in error responses when `NODE_ENV=development` | Removed `response.stack = err.stack` in `server/src/middleware/errorHandlerMiddleware.js`. Stack traces logged server-side via `console.error` only. | **Independently verified (OpenCode 13 Nov):** suite assertion demoted + standalone harness (NODE_ENV=development): 401 invalid-token, 404 unknown-route, 400 empty-login, and CastError-path responses all contain no `stack` field (4/4). |
| **F-03** | P2 | Health `status` hardcoded `'healthy'` even when `database:'disconnected'` | `server/src/modules/health/health.controller.js` checks `isDbConnected()`; returns HTTP 503 + `status: 'unhealthy'` when DB is disconnected, HTTP 200 + `status: 'healthy'` when connected. | **Independently verified (OpenCode 13 Nov):** suite does a real `mongoose.disconnect()`; harness reproduced: baseline 200/healthy → disconnect → **503/unhealthy/disconnected** → reconnect → 200/healthy recovery (4/4). |
| **F-06** | P2 | `GET /pipeline?fields=` passthrough with no allowlist | `server/src/modules/pipeline/pipeline.controller.js` filters `fields` against `ALLOWED_PIPELINE_FIELDS`; non-allowlisted names dropped; `-stageHistory -__v` always appended. | **First verification FAILED (OpenCode 13 Nov):** leak goal passed for `fields=stageHistory` but the fix introduced regression F-06R (inclusion+exclusion mix → `?fields=<valid>` HTTP 500 with raw Mongo error). Returned to Antigravity; after the pure-inclusion correction, **re-verified by OpenCode 13 Nov 2026: `?fields=studentName` → 200 exact keys `{_id, studentName}`, `?fields=studentName,email` → 200 `{_id, email, studentName}`, non-allowlisted/mixed → `_id`-only or allowlisted-only keys, default still excludes `stageHistory`/`__v` — VERIFIED (see F-06R row).** |
| **F-08** | P2 | `search` regex syntax error causing HTTP 500 / ReDoS | `server/src/modules/pipeline/pipeline.controller.js` validates search pattern syntax (throws 400 on invalid regex) and escapes special regex characters. | **Independently verified (OpenCode 13 Nov):** harness — `search=(`, `(a+`, `)`, `[a-z` all return **exactly 400** (never 500); valid `search=P2Verify` → 200 with matches; `search=P2Verify.*` treated literally (escaped) → 200. |
| **F-07** | P2 | `fields` allowlist projection dead code in `user.controller.js` | `server/src/modules/users/user.controller.js` post-projects `result.data` after pagination, filtering only requested allowlisted keys and stripping `password`/`__v`. | **Independently verified (OpenCode 13 Nov):** harness — `fields=name` (only `_id`/`name`; no email/role/password/__v), `fields=password,name` (password never selectable), `fields=email,role` (only requested + `_id`), default (no `password`/`__v`, email present) — 4/4. |
| **F-09** | P2 | Demo credentials (`Password@123`) present in production JS bundle | `client/src/config/constants.js` gates `DEMO_CREDENTIALS`/`DEV_PASSWORD` behind `import.meta.env.DEV ? [...] : [];`; `LoginPage.jsx` demo section behind `isDev &&`. | **Independently verified (OpenCode 13 Nov):** fresh `npm run build:client` green; independent scan of all 8 `client/dist/assets/*.js` (433.4 KB): **zero** matches for `Password@123`, demo emails, `DEV_PASSWORD`, `DEMO_CREDENTIALS`, `password@123`. |
| **F-02** | P2 | Auth token persisted in `localStorage` (`aeterna_token`) | `client/src/services/api.js` (26 lines: axios + `withCredentials`, no Authorization header) and `client/src/context/AuthContext.jsx` removed `aeterna_token`; auth relies exclusively on httpOnly cookie. | **Independently verified (OpenCode 13 Nov):** grep `client/src` → **0 occurrences** of `aeterna_token` (only `aeterna_user` profile cache remains, allowed); `authMiddleware` reads cookie first then Bearer — cookie-only client works. |
| **P3** | P3 | `X-Powered-By` disclosure header check | Helmet / Express configuration suppresses `X-Powered-By`. | **Independently verified (OpenCode 13 Nov):** suite asserts header absent; OpenCode re-confirmed. |
| **F-06R** | P2 (fix) | `GET /pipeline?fields=` inclusion/exclusion collision | `pipeline.controller.js` getPipeline projection builder uses pure inclusion: `requested.length > 0 ? requested.join(' ') : '_id'` (no `-stageHistory -__v` concatenated on inclusion). Non-requested fields, audit log, and `__v` automatically excluded by MongoDB. | **Independently re-verified by OpenCode (13 Nov 2026):** `fields=studentName` → 200 exact keys `{_id, studentName}` (was HTTP 500 with raw Mongo error); `fields=studentName,email` → 200 `{_id, email, studentName}`; `fields=stageHistory`/`fields=password` (non-allowlisted) → `_id`-only; `fields=notes,stageHistory` → `{_id, notes}` only; default projection unchanged. Suite test `F-06R` asserts 200 + exact key set. Harness 44/44 exit 0. **VERIFIED — zero inclusion/exclusion collision.** |
| **OBS-1** | P2-class (fix) | `GET /api/v1/users?search=(` unvalidated regex 500 | `user.controller.js:26-38` validates pattern with `new RegExp(term)` try/catch → 400 and escapes special characters (`term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`). | **Independently re-verified by OpenCode (13 Nov 2026):** `(`, `)`, `(a+`, `[a-z` → **exactly 400** (was HTTP 500); `search=P2Fixture` → 200 + matches; `P2Fixture.*` treated literally (escaped) → 200; literal-dot email search still matches → 200. Suite tests `OBS-1` (400 + safe-search 200) enforcing. **VERIFIED.** |

## Open findings (informational / latent — no todo-test demotions required)

No P0/P1/P2 findings open. All P0, P1, P2 findings, F-06R regression, OBS-1
observation, and optional P3 are remediated and covered by active passing
tests. The Day 4 pass added only **informational** observations
(D4-OBS-1, D4-OBS-2) with **no privilege gain** — both verified as
non-exploitable by the 16 Nov 2026 probe, so neither is demoted into a
`{ todo:true }` test; recording them here is sufficient.

| ID | Sev | Finding | Location | Status |
| :-- | :-- | :-- | :-- | :-- |
| **L-01** | latent | Non-super `branch:'all'` account cross-branch reads | `branchMiddleware.js:19` | Covered by active assertion tests in branch-isolation (passes); provisioning still blocks creating such accounts (`auth.validator.js`, seed script) |
| **Q-01** | quirk | Super `POST /pipeline` with body branch `'all'` → 400 enum | `pipeline.model.js` branch enum (no `all`) | Covered by active assertion in pipeline tests (passes) |
| **D4-OBS-1** | info | Non-`branch` query filters (`stage`, `role`) accept NoSQL object values instead of returning 400 | `pipeline.controller.js` `filter.stage = stage`; `user.controller.js` `query.role = role` | **Observed 16 Nov 2026 (probe B3/B5):** `?stage[$ne]=zzz` → 200, `?role[$ne]=zzz` → 200 — no error, **no privilege gain**: branch scope is enforced separately and never passes through this filter; omitting the param returns the same rows. Clean 400 would be tidier — cosmetic hardening only. |
| **D4-OBS-2** | info | `hpp` `checkBody` is ineffective — `hpp()` runs in `app.js` before the body parsers, so `req.body` is still `{}` when hpp checks it | `server/src/app.js:25` (hpp) vs body-parser registration later | **Mitigated & verified 16 Nov 2026 (probe C1/C2):** body arrays/objects are caught by `branchMiddleware.js:37` `String(rawRequested)` → `'[object Object]'` / `'bengaluru,mysuru'` → 403. HPP query-side protection (`checkQuery`) does work — probe A1/A3 confirm. |
| **D4-DOC-1** | doc | `NEW_TASK.md` handoff names the 5th role `admissions_officer`; the actual constant is `application_officer` | `NEW_TASK.md:7` vs `server/src/config/constants.js` | **Corrected by OpenCode 16 Nov 2026** while updating docs. No code impact — tests and routes all use `application_officer`. |

## Fix guidance — RESOLVED (no open findings)

Both items below were open immediately after the first P2 pass; Antigravity
applied the guidance and OpenCode independently re-verified both (13 Nov 2026).
Retained as permanent lessons:

- **F-06R (resolved + verified):** never concatenate inclusion and exclusion
  tokens in one Mongo projection. The applied fix uses pure inclusion
  `requested.join(' ')` when allowlisted fields are present (fallback `_id`
  when none match), and pure exclusion `-stageHistory -__v` only when no
  `fields` param is sent. Suite now includes the previously missing case for a
  **valid** allowlisted field (`fields=studentName`) asserting 200 + exact
  key set — non-allowlisted-only tests can never catch this class of bug.
- **OBS-1 (resolved + verified):** apply the F-08 pattern to any endpoint
  accepting a user-supplied regex (`user.controller.js` search): validate the
  term with `new RegExp(term)` try/catch → `ApiError(400)`, escape
  metacharacters (`term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`), then
  `$regex: escaped`. Any future search feature must follow this pattern.

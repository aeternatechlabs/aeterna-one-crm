# Backend Architecture (`server/`)

## Process & entry

- `server/src/server.js` — process entry: loads `dotenv`, validates env
  (`PORT`, `MONGO_URI`, `JWT_SECRET` missing → `process.exit(1)` fail-closed),
  calls `connectDB()`, starts `app.listen(PORT)`, registers graceful shutdown
  (SIGINT/SIGTERM → mongoose close). Demo auto-seeding was REMOVED in P0.
- `server/src/app.js` — the Express app (exported, no listen). Middleware
  order is security-relevant:

```
helmet()                       // security headers (CSP, HSTS, nosniff, frame-options...)
hpp()                           // HTTP parameter pollution guard
cors({ origin: callback, credentials: true, methods, allowedHeaders })
                               // static allowlist (4 localhost entries + CLIENT_URL/
                               // FRONTEND_URL, read at load time); dev wildcard only
                               // via explicit CORS_ALLOW_ALL_DEV=true (F-01 fixed)
express.json({ limit: '10mb' })
express.urlencoded({ extended: true, limit: '10mb' })
cookieParser()
morgan('dev' | 'combined')      // chosen from NODE_ENV at load time
limiter on '/api'               // express-rate-limit: 100 req / 15 min / IP
GET /health                     // top-level health (NOT rate-limited)
app.use('/api/v1', v1Routes)    // primary mount
app.use('/api', v1Routes)       // alias mount (same router)
404 handler                     // JSON { success:false, statusCode:404, message:'API endpoint ... does not exist' }
errorHandler                    // central; JSON { success:false, statusCode, message, errors? } — NO stack ever (F-04 fixed)
```

- Rate limiter: `RATE_LIMIT` from `config/constants.js` (WINDOW_MS 15 min,
  MAX_REQUESTS 100). 429 body is a prebuilt JSON object; standard headers on,
  legacy `X-RateLimit-*` off. Counter is per-process (each test file gets a
  fresh one).
- CORS origin callback reads `process.env.NODE_ENV` **at request time** (so
  tests can flip it); `CLIENT_URL`/`FRONTEND_URL` are folded into the static
  allowlist at load time.
- Error handler mapping (`errorHandlerMiddleware.js`):
  - Mongoose `ValidationError` → 400 `Validation Error` (+ per-field `errors`)
  - Mongo duplicate key `11000` → 409
  - Mongoose `CastError` → 400 `Invalid ID format for path: ...`
  - `JsonWebTokenError` → 401 `Invalid authentication token`
  - `TokenExpiredError` → 401 `Authentication token has expired...`
  - anything else → `err.statusCode || 500` with `err.message`
  - `stack` is NEVER serialized (F-04 fixed, independently verified 13 Nov
    2026): only `console.error(err)` in dev for 500s; dev-mode 401/404/400
    responses confirmed stack-free by standalone harness. `.env` keeps
    `NODE_ENV=development` — safe because the stack is dropped entirely.

## Router composition (`routes/v1.js`)

`/health`, `/auth`, `/users`, `/pipeline` mounted on one router; that router
is mounted twice (`/api/v1` primary, `/api` alias).

## Middleware

| Middleware | File | Behavior |
| :-- | :-- | :-- |
| `protect` | `middleware/authMiddleware.js` | Token from cookie `accessToken` (preferred) else `Bearer` header → missing token 401; missing `JWT_SECRET` 500 (fail-closed); `jwt.verify` HS256; `User.findById(decoded.id).select('-password')`; user gone → 401; `isActive=false` → 403; sets `req.user` |
| `requireRole(...roles)` | `middleware/roleMiddleware.js` | `req.user.role` must be in list else 403 |
| `requireBranchAccess(param='branch')` | `middleware/branchMiddleware.js` | See branch engine below |
| `validate(...)` | `middleware/validateMiddleware.js` | Runs validator chain (zod-style custom validators in `*.validator.js`) → 400 with `errors` |

### Branch engine (verified by `opencode-branch-isolation.test.js` 15/15, `day4-backend-authz.test.js` 24/24, and a 30-case independent HTTP probe — 16 Nov 2026)

- Super admin **or** `user.branch === 'all'`: `req.branchScope =
  query.branch || params.branch || header x-branch || null` (unrestricted read
  unless a scope filter is requested). Note: body branch is NOT consulted here.
  **Type rule:** a string is `trim().toLowerCase()`'d; a string array keeps
  only `rawScope[0]`; **anything else (object/number) becomes `null`** — so
  `?branch[$ne]=null` from a super admin is just "no filter", never a Mongo
  operator. They are already global, so there is no gain to be had.
- Restricted user: `requestedBranch = query || params || body.branch`;
  **type rule:** string → `trim().toLowerCase()`; any other truthy value →
  `String(rawRequested)` (object → `'[object Object]'`, array →
  comma-joined) — if that differs from own branch AND is not `all` → 403.
  Otherwise `req.branchScope` is **forced to the user's own branch** (so
  `?branch=all` cannot widen a restricted account, and `x-branch` header is
  ignored for restricted users — headers are only read on the super/global
  path). This is the Day 4 hardening: HPP-collapsed arrays and NoSQL object
  shapes can never reach the query filter.
- Controllers then use `req.branchScope` for query filters, and record-level
  guards compare `student.branch !== req.user.branch` for writes:
  `role !== super_admin && branchScope !== 'all' && student.branch !== user.branch → 403`.
  The guard runs **before** any write and is checked against the DB-loaded
  record, so a spoofed `x-branch` header on a mutation attempt still 403s.

### Latent quirk (documented, tested)

A non-super user with `branch: 'all'` (possible in the model enum, blocked by
`registerValidator` for new staff) gets **cross-branch READ** with no params,
but writes are denied unless they explicitly pass `?branch=all`
(null branchScope fails the `!== 'all'` check). Tests:
"latent: non-super user with branch=..." in `opencode-branch-isolation.test.js`.

## Modules

### `modules/auth/`
- `auth.routes.js`: `POST /login` (public), `POST /refresh` (public/cookie, rotates tokens),
  `POST /register` (`protect → requireRole(super_admin) → validate` — RBAC runs BEFORE body
  validation, so non-super gets 403 even with an invalid body),
  `GET /me` (protect), `POST /logout` (public, clears cookies).
- `auth.controller.js`: `login` (generic 401 message for unknown-email and
  wrong-password — no user enumeration; inactive → 403; issues access+refresh
  via devil `generateTokens`, sets httpOnly cookies + returns token in body),
  `refresh` (validates `refreshToken` from httpOnly cookie or body against `JWT_SECRET`,
  ensures user exists and active, rotates tokens, sets updated cookies),
  `register` (creates staff with hashed password — bcrypt pre-save hook in
  user model; does NOT issue tokens), `me`, `logout`.
- `auth.validator.js`: email/password format checks; cross-field rule
  `branch === 'all'` only allowed when `role === 'super_admin'` → 400.

### `modules/users/`
- `user.routes.js`: `GET /` only. Chain: `protect → requireRole(super_admin,
  branch_manager) → requireBranchAccess() → getUsers`.
- `user.controller.js`: pagination (`page`, `limit` default 10 — F-05 clamps:
  `safeLimit` ≤100 with fallback 10, `safePage` ≥1 at lines 48-53; `search`
  regex on name/email, `role`, `branch` filters). F-07 fixed (independently
  verified 13 Nov 2026): main path computes `ALLOWED_USER_FIELDS` projection
  from `fields`, always appends `-password -__v`, then **post-projects the
  paginated result** (re-applies allowlist, deletes `password`/`__v`);
  fallback `.select()` path equivalent — password never selectable.
  **OBS-1 remediated and independently re-verified by OpenCode (13 Nov 2026):**
  `search` validates regex with `new RegExp(term)` try/catch → `ApiError(400)`
  and escapes metacharacters before `$regex: escaped` → `GET /users?search=(`
  (also `)`, `(a+`, `[a-z`) returns HTTP **exactly 400**; valid/literal search
  (`P2Fixture`, email with literal dot) returns HTTP 200 with matches.
- `user.model.js`: name/email/password/role/branch/phone/isActive/lastLogin;
  `password: { type, required, select: false }`; pre-save bcrypt hash (cost 10).

### `modules/pipeline/`
- `pipeline.routes.js`: `protect → requireBranchAccess()` for all, then:
  | Route | Roles |
  | :-- | :-- |
  | `GET /` | super_admin, branch_manager, counsellor, application_officer |
  | `POST /` | super_admin, branch_manager, counsellor |
  | `PATCH /:id/stage` | super_admin, branch_manager, counsellor |
  | `PATCH /:id/documents` | super_admin, branch_manager, application_officer |
- `pipeline.controller.js`:
  - `getPipeline`: filters `branch` (from branchScope), `stage`, `search` —
    F-08 fixed (independently verified 13 Nov 2026): term checked with
    `new RegExp(term)` try/catch → `ApiError(400, 'Invalid search query
    pattern')`, then escaped (`/[.*+?^${}()|[\]\\]/g`) before `$regex`;
    invalid patterns return exactly 400, metacharacters match literally.
    Projection: `fields` filtered against `ALLOWED_PIPELINE_FIELDS` (no
    `stageHistory`/`__v` ever allowed); F-06R resolved and independently
    re-verified by OpenCode (13 Nov 2026): uses pure inclusion
    `requested.join(' ')` when allowlisted fields are requested (or `_id`
    when no allowlisted fields match) — no inclusion/exclusion collision in
    MongoDB (`fields=studentName` → 200 with exact keys `{_id, studentName}`;
    mixed valid+invalid → allowlisted only). Default (no `fields`) →
    `-stageHistory -__v`.
  - `updateStage`: simulate-failure flag (`x-simulate-validation-error`
    header or `simulateError: true` body) → 400 rollback message; invalid
    stage → 400; missing record → 404; record branch guard → 403;
    `application_submitted` requires `documentsVerified` → 400;
    `lost` requires reason ≥ 5 chars → 400; pushes `{fromStage, toStage,
    changedAt, changedBy, reason}` into `stageHistory`; returns updated student.
  - `toggleDocumentsVerified`: 404 / branch guard / sets boolean if provided
    else toggles.
  - `createStudent`: requires `studentName, email, programme, destination`
    (400); branch = body branch only for super, else own branch;
    super with no body branch and `branch:'all'` hits the model enum → 400
    "Validation Error" (quirk, tested).
- `pipeline.model.js`: `PipelineStudent` — no password fields; `branch` enum
  `[bengaluru, mysuru, belagavi]` (no `all`); `stage` enum of
  `PIPELINE_STAGES`; `documentsVerified`; `stageHistory[]` subdocs with
  `changedBy` ref User; compound index `{branch, stage}`; `versionKey:false`.

### `modules/health/`
- `GET /health` (top-level, outside limiter) and `GET /api/v1/health`:
  `{ status: 'healthy'|'unhealthy' (F-03 fixed — derived from isDbConnected(),
  independently verified 13 Nov 2026: real mongoose.disconnect() → HTTP 503
  + unhealthy + database:'disconnected', reconnect recovers 200/healthy),
  service, version, uptimeSeconds, timestamp, environment,
  database: connected|disconnected (live via isDbConnected()),
  supportedBranches }`.

## Config

- `config/constants.js` — single source: `ROLES` (5 roles), `BRANCHES`
  (bengaluru/mysuru/belagavi/all), `PIPELINE_STAGES` (new_enquiry, counselling,
  shortlisted, application_submitted, offer_visa_won, lost), `JWT`
  (ACCESS 1d / REFRESH 7d app-level constants), `RATE_LIMIT` (15 min / 100).
- `config/db.js` — `connectDB()` with mongoose events updating an `isConnected`
  flag; `isDbConnected()` = flag OR `readyState === 1`; SIGINT closes
  connection. Test files call `mongoose.connect()` directly (flag updates via
  the same connection events).
- `utils/devilWrapper.js` — re-exports from `devil-backend-nodejs`:
  `ApiResponse`, `ApiError`, `asyncHandler`, `generateTokens`, `paginate`, etc.

## devil-backend-nodejs internals (read in `node_modules/`)

- `generateToken.js` — `generateAccessToken(user)` signs `{ id: user._id,
  role }` with `process.env.JWT_SECRET`, HS256 (devil pkg default expiry).
  **Server never trusts the token's role claim** — `protect` loads the user
  from DB, so a stale/forged role in the payload has no effect.
- `ApiResponse.js` — constructor `(statusCode, payload)` →
  `{ success: true, statusCode, ...payload }` — payload fields are SPREAD at
  top level (read with dual pattern).
- `paginate.js` — `(Model, query, {page, limit, sort, populate})` →
  `{ data, pagination:{total, page, limit, totalPages} }`.
  **`options.select` is still silently ignored** (upstream behavior); the
  users controller no longer relies on it — F-07 fixed by post-projecting
  `result.data` after paginate (verified 13 Nov 2026). `limit` is
  `parseInt`ed with no ceiling — callers must clamp first (F-05: the users
  controller clamps `limit` to ≤100 and `page` to ≥1 before calling).
- `asyncHandler.js` — wraps async routes → forwards rejections to errorHandler.

## Environment (`server/.env` — never commit)

`NODE_ENV=development`, `PORT=5000`, `MONGO_URI=mongodb://127.0.0.1:27017/aeterna_one_crm`,
`JWT_SECRET=<redacted>`, `JWT_ACCESS_EXPIRES_IN=1d`, `JWT_REFRESH_EXPIRES_IN=7d`.
`.env` is read ONLY by `server.js` (dotenv); `app.js` has no dotenv.

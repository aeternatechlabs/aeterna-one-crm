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
| `PATCH /pipeline/:id/stage` | super_admin, branch_manager, counsellor | Body `{toStage, reason?, simulateError?}`; header `x-simulate-validation-error`; docs-gate, lost-reason ≥5, record-branch 403, 404/400; appends `stageHistory` |
| `PATCH /pipeline/:id/documents` | super_admin, branch_manager, application_officer | Body `{documentsVerified}` optional (toggle if absent); 404 + record-branch guard; counsellor → 403 |

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

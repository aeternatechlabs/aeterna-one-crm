# End-to-End Workflows

Verified by the OpenCode test suite (HTTP-level, ephemeral listener,
`server/test/opencode-*.test.js`) — see `testing.md`.

## 1. Login

```
POST /api/v1/auth/login { email, password }        (public, rate-limited)
  → email format validated (400 on malformed)
  → findOne(+password).select('+password')
  → unknown email OR wrong password → identical 401
    "Invalid email or password." (no user enumeration)
  → isActive=false → 403 "account deactivated"
  → bcrypt.compare OK
  → devil generateTokens(user) → access (HS256, JWT_SECRET) + refresh
  → res.cookie('accessToken', ..., httpOnly, sameSite, maxAge) + refresh cookie
  → 200 { success, statusCode, message, token, refreshToken, user:{role,branch,...no password} }
Client: NO localStorage token (F-02 fixed — httpOnly cookie only);
axios is `withCredentials` and sends `Bearer` if a token is in memory;
401 → interceptor clears cached user → `isAuthenticated=false`.
```

Session death paths (all → 401/403 with clean JSON, no stack outside dev):
missing token, garbage token, wrong secret, `exp` past, `alg:none`,
tampered payload, deleted user (401 "user no longer exists"),
deactivated user (403), missing JWT_SECRET (500 fail-closed).

## 2. Staff registration (super-admin only)

```
POST /api/v1/auth/register  (protect → requireRole(super_admin) → validate)
  anon                → 401
  non-super role      → 403 (RBAC runs BEFORE body validation — invalid
                         bodies from non-super also get 403; no user created)
  super + valid body  → 201, User doc with bcrypt hash (cost 10),
                         NO token issued (cannot hijack admin session)
  duplicate email     → 409
  branch:'all'+non-super role → 400 (cross-field validator)
  bad role/branch/short password → 400
```

## 3. Pipeline read (branch-scoped)

```
GET /api/v1/pipeline?branch=&stage=&search=&page=&limit=&fields=
  protect → requireBranchAccess() → requireRole(4 roles) → getPipeline

requireBranchAccess resolution (Day 4 hardened — types normalized first):
  super or branch='all':
      raw = query.branch || params.branch || x-branch header
      branchScope = string → trim/lowercase | string[] → [0] | else → null
  restricted user:
      raw = query.branch || params.branch || body.branch
      requested = string → trim/lowercase | else → String(raw)
                  ('[object object]', 'a,b' for arrays)
      if requested && requested !== own && requested !== 'all' → 403
      branchScope = own branch  (x-branch ignored; ?branch=all forced own)
  net effect: ?branch[$ne]=..., branch[]=..., body { $gt:'' } / ['x'] are
  all neutralised — object/array inputs never reach the Mongo filter.

controller: filter by branchScope (when set) + stage + search (escaped +
validated → 400 — F-08 fixed), projection = fields allowlist (F-06/F-06R
fixed) or -stageHistory -__v,
devil paginate(page, limit capped at 100 in user.controller — F-05 fixed).
marketing role → 403 at requireRole.
```

## 4. Stage move (guarded write)

```
PATCH /api/v1/pipeline/:id/stage  { toStage, reason?, simulateError? }
  protect → requireBranchAccess() → requireRole(super, manager, counsellor)

  x-simulate-validation-error header OR simulateError:true → 400
    "Simulated backend validation failure..." (no mutation — rollback demo)
  invalid toStage (not in PIPELINE_STAGES) → 400
  id not ObjectId → 400; not found → 404
  record branch ≠ user branch (non-super, branchScope≠'all') → 403
    (DB unchanged — verified)
  toStage='application_submitted' && !documentsVerified → 400
  toStage='lost' && (reason missing || <5 chars) → 400
  → update stage, $push stageHistory {fromStage,toStage,changedAt,
    changedBy(user._id), reason?}
  → 200 { student updated, branch, stageHistory entry present,
    default list projection excludes stageHistory/__v }
```

Docs toggle: `PATCH /:id/documents` — roles super/manager/application_officer
(counsellor 403); 404 / branch record guard; explicit boolean else toggle.

## 5. Create pipeline student

```
POST /api/v1/pipeline  { studentName, email, programme, destination, branch? }
  super: may pass any valid branch; super with NO branch in body hits
         model enum ['bengaluru','mysuru','belagavi'] (no 'all') → 400
         "Validation Error" (quirk — tested)
  restricted: forced to own branch; body branch='all'/other → 403
  missing required fields → 400
  → 201 with created doc (no stageHistory/__v in default response)
```

## 6. User directory

```
GET /api/v1/users?page=&limit=&search=&role=&branch=&fields=
  protect → requireRole(super, branch_manager) → requireBranchAccess()
    → getUsers. branchScope filters branch. Marketing 403, anon 401.
  password never serialized (schema select:false — independent of F-07).
```

## 7. Frontend session flow

1. App mounts → `AuthProvider` calls `GET /me` with cookie.
2. 200 → `user` set (role/branch drive NAV_ITEMS + ProtectedRoute).
   401 → interceptor clears localStorage → `isAuthenticated=false`.
3. `ProtectedRoute`: loading spinner → no auth → `/login` (state.from) →
   role not in `allowedRoles` → `/unauthorized`.
4. Pipeline mutations: optimistic cache move → server confirm/rollback.

## 8. Health

`GET /health` (outside rate limiter) and `GET /api/v1/health` →
200 JSON with `database: 'connected'` and `status: 'healthy'`, or
**503** with `status: 'unhealthy'` when the DB is down (F-03 fixed).

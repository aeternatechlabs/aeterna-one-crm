# Aeterna One CRM — Technical Knowledge Base (`brain/`)

Long-term technical documentation written from actual source code so a future
developer or agent can understand this project without rescanning the repo.

> Status legend: **LIVE** = verified against code + tests (last pass 16 Nov
> 2026 — Day 5 Foundation Verification & Handover; **Phase A 100% complete**;
> **150-test backend suite green, 41-test client a11y suite green, 0 fail, 0 todo**).
> Deliverables: `ROLE_PERMISSION_MATRIX.md`, `COMPONENT_INVENTORY.md`, `PHASE_A_VERIFICATION_REPORT.md`.

## Index

| Doc | What it answers |
| :-- | :-- |
| `backend.md` | Express architecture, middleware chain, config, devil package integration, test infrastructure |
| `frontend.md` | React app structure, routing, auth context, API layer, permissions, styling system |
| `workflows.md` | End-to-end flows: login, staff registration, pipeline stage moves, branch scoping |
| `api-reference.md` | Every HTTP endpoint: method, auth, roles, params, response shape |
| `security.md` | Threat model, verified controls (with test evidence), remediated findings P1–P3, open informational/latent notes |
| `file-map.md` | File-by-file inventory of `server/` and `client/` with one-line purpose |
| `testing.md` | How to run tests, suite structure, conventions (todo findings, test DBs) |

## Project at a glance

- **Stack:** MERN — React 19 + Vite 8 (`client/`), Express 4 + Mongoose 7 (`server/`), MongoDB.
- **Mandatory packages:** `devil-backend-nodejs` v4.1.0 (server responses/tokens/pagination),
  `devil-frontend` v1.0.4 (client utilities).
- **Auth:** JWT (HS256) in httpOnly `accessToken` cookie (preferred) with
  `Authorization: Bearer` fallback; access+refresh pair issued at login.
- **Authorization:** 5 roles × route-level `requireRole` + record-level branch
  guards (`requireBranchAccess` + in-controller record checks).
- **Branches:** `bengaluru`, `mysuru`, `belagavi`; `all` reserved for
  `super_admin` (register validator forbids `all` for other roles).
- **Responses:** devil `ApiResponse` spread — payload fields sit at the TOP
  level (`response.data`, `response.students`), not under `response.data.data`.
  Always read with the dual pattern: `data?.data?.field || data?.field`.

## Golden rules for future contributors

1. `server/.env` must contain `PORT`, `MONGO_URI`, `JWT_SECRET`;
   `server.js` exits(1) if any is missing. `app.js` itself loads NO dotenv —
   anything requiring `app` directly (tests) must set `JWT_SECRET` itself.
2. `protect` fails closed: missing `JWT_SECRET` → 500, not a default key.
3. Passwords: schema `select: false`, never serialized; login/register responses
   carry `user` without password.
4. Route registration order in `pipeline.routes.js` / `user.routes.js` matters:
   `protect` → `requireBranchAccess()` → `requireRole(...)` → controller
   (except users: protect → role → branch → controller).
5. Do not trust devil `paginate()` with `select` — it ignores it (see
   `security.md` F-07).
6. Tests must use dedicated `aeterna_one_crm_test*` databases and drop them.
7. **WebP image asset rule (Rule 21):** All raster images added to `client/src/assets/` or `client/public/` must be converted to `.webp` before committing or importing (preserving RGBA alpha transparency). Root favicons excepted.

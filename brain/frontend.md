# Frontend Architecture (`client/`)

React 19 + Vite 8 SPA, React Router v7, TanStack Query v5, Axios, Lucide
icons, Tailwind wired to CSS variables (all colors from `styles/*.css`).

## Boot chain

`main.jsx` → `App.jsx` (providers: `QueryClientProvider` → `AuthProvider` →
`PermissionProvider` → Router) → `AppRoutes`.

- `queryClient.js`: staleTime 4 min, gcTime 10 min.
- `queryClient` + auth are StrictMode-resilient (AuthProvider guards
  double-fire of `/me`).

## Routing (`routes/AppRoutes.jsx`)

- Public: `/login`, `/unauthorized`; catch-all `*` → `NotFoundPage`.
- `/` → redirect `/dashboard`.
- Protected shell: `<ProtectedRoute>` → `<AppLayout>` (Sidebar + Header) →
  pages. All pages lazy-loaded with Suspense.
- `/pipeline` is double-guarded: outer auth guard + inner
  `<ProtectedRoute allowedRoles={['super_admin','branch_manager','counsellor','application_officer']}>`
  — role set kept in lockstep with backend GET `/pipeline` `requireRole`
  (contract-tested by `opencode-frontend-contract.test.js`).
- Only Dashboard + Pipeline are implemented; NAV_ITEMS for leads/students/
  tasks/reports/settings are declared with `plannedPhase` markers (routes not
  yet wired).

## Auth (`context/AuthContext.jsx`)

- On mount: calls `GET /me` (cookie session), sets `user`.
- `login(email, password)` → `POST /auth/login`; stores user profile via
  `localStorage.setItem('aeterna_user', ...)` — **no token storage**
  (F-02 fixed, independently verified 13 Nov 2026: zero `aeterna_token`
  occurrences anywhere in `client/src`; auth is httpOnly-cookie-only).
- `isAuthenticated`, `loading`, `logout()` (calls `POST /auth/logout`, clears
  `aeterna_user`). `useAuth.js` re-export hook.
- **Server is the authority**: role comes from `/me` (DB), UI gating is
  advisory only; every enforced rule is also enforced by the API.

## Permission system (`config/permissions.js` + `context/PermissionContext.jsx`)

`PERMISSIONS` matrix = roles per resource action; `hasPermission(role, res,
act)` / `hasAnyPermission`. Pipeline entries match backend routes exactly:
`pipeline.view` = view routes, `pipeline.moveStage` = PATCH stage,
`students.verifyDocs` = PATCH documents. `PermissionContext` exposes these
to components via `usePermissions()`.

## API layer (`services/`)

- `api.js` — axios instance (46 lines): baseURL `VITE_API_BASE_URL ||
  '/api/v1'`, `withCredentials: true`; **no Authorization header
  interceptor** (F-02 fixed — cookie is the only transport); response
  interceptor on 401: skips `/auth/login` + `/auth/refresh`, otherwise
  `POST /auth/refresh` once (`_retry` guard) and replays the original
  request; on refresh failure clears `aeterna_user` (unless already on
  /login). Server `protect` still accepts cookie first, then Bearer
  fallback — cookie-only client verified working.
- `auth.service.js` / `pipeline.service.js` — thin wrappers over `api`
  (login, me, logout / getPipeline, updateStage, toggleDocs, createStudent).
- `apiErrorHandler.js` + `errorMessages.js` — centralized friendly error
  mapping (Rule 17 `handleApiCall`).
- All API reads use the dual access pattern (Rule 11):
  `data?.data?.field || data?.field` (works with devil top-level spread).

## Data layer (`hooks/`)

- `usePipelineQueries.js` — `PIPELINE_KEYS` factory; `usePipelineQuery(params)`
  returns `{ data, isLoading }` with `placeholderData: prev` for smooth
  filter transitions.
- `usePipelineMutations.js` — three mutations, all Rule 13/14-compliant:
  - `useUpdateStudentStage`: `onMutate` cancels queries + snapshots cache +
    optimistic `setQueriesData` move; `onError` snapshot revert; `onSuccess`
    surgical merge of server student (server branch of dual pattern);
    `onSettled` invalidate.
  - `useToggleDocumentVerification`: optimistic flip + revert.
  - `useCreateStudent`: optimistic append + revert.
  - `utils/optimistic.js` — shared `optimisticWithRevert` helper.

## UI structure

- `components/layout/` — `AppLayout` (mobile drawer + backdrop), `Sidebar`
  (role-filtered NAV_ITEMS, heritage banner), `Header` (Ctrl+K search pill,
  branch dropdown, notification bell, avatar menu w/ sign out).
- `components/common/` — shared kit: Button, Input, **Select** (custom
  keyboard-navigable dropdown, replaces all native selects), Badge, Card,
  Modal, ConfirmDialog, LoadingSpinner, StatCard, ErrorBoundary (+ index.js
  barrel). Accessible focus management powered by `hooks/useFocusTrap.js`
  (initial focus, Tab/Shift+Tab focus loop, restore on unmount). Tested by
  10 Vitest suites in `components/common/__tests__/` (41/41 pass).
- `components/pipeline/` — `PipelineColumn` (stage column), `PipelineCard`
  (candidate card with doc toggle + stage actions, disabled when role/branch
  unauthorized), `NewStudentModal`, `ReasonModal` (lost reason gate).
- `pages/` — LoginPage (**premium split-screen redesign, OpenCode Section 6
  verified 13 Nov 2026**): left heritage hero `<aside aria-label>` (Vidhana
  Soudha watermark `assets/heritage/vidhana-soudha.webp`, feature chips,
  dashboard mockup `brand/aeterna-dashboard-preview.png`, branch pills) +
  right auth card (inputs `#staff-email`/`#staff-password`
  (`.login-input-field`, `autocomplete=email|current-password`,
  `aria-required`), Eye/EyeOff toggle `.login-password-toggle-btn`
  (aria-label + aria-pressed), `.login-error-alert` role=alert
  aria-live=polite, submit `.btn-login-submit` type=submit with
  `.spinner-login`). `const isDev = import.meta.env.DEV` (line 44) folds to
  `false` in production builds and gates the demo quick-login
  `section.login-dev-section` (gate at line 320, section at 321, 5
  `.login-role-card-btn`s importing `DEMO_CREDENTIALS` directly — the
  password literal lives only in the DEV branch of `config/constants.js`,
  never in page source) — F-09
  fixed, independently verified 13 Nov 2026: fresh prod build of all 8
  `client/dist/assets/*.js` (433.4 KB) contains zero password/demo literals
  and a DOM probe confirms the section/password/emails are absent in prod
  (A10a–c). Authenticated revisit of `/login` redirects to
  `location.state?.from?.pathname || '/dashboard'` (lines 45–52). Also
  DashboardPage, PipelinePage (stats + simulation banner + 6 columns),
  Unauthorized, NotFound.
- `styles/` — six CSS files keyed off `variables.css` (Royal Maroon /
  Imperial Gold tokens); components use Tailwind utilities that reference
  those variables — zero hardcoded component colors (Rule: theme from
  `index.css`). `auth.css` owns the login micro-interactions: 6 keyframes
  (`heroFadeIn`, `authCardEntrance`, `ambientOrbPulse`, `alertSlideDown`,
  `spinnerRotate`, `pulseGreen`), glassmorphism `blur(16px)`, gold focus ring
  `rgba(229,169,60,.25)` (minified to `#e5a93c40`), button sheen sweep +
  −1.5px hover lift, micro-press, breakpoints 640/1023/1024/1280, and
  `prefers-reduced-motion: reduce` overrides that disable animation/glow/
  hover — all statically (contract) and dynamically (CDP harness 58/58)
  verified 13 Nov 2026.

## Client constants (mirror of server)

`ROLES`, `BRANCHES` (incl. `all`), `PIPELINE_STAGES` (same six order),
`ROLE_LABELS`, `BRANCH_LABELS`, `PIPELINE_STAGE_LABELS/ORDER/COLORS`,
`NAV_ITEMS` (per-role route visibility), `DEMO_CREDENTIALS` — **DEV-gated**
(`import.meta.env.DEV ? [...] : []`; empty array in prod builds, no password
literal outside the DEV branch) and `DEV_PASSWORD` (same gating, built via
`['Password','@123'].join('')`). Contract test asserts parity with
`server/src/config/constants.js` and backend route role sets.

# Rules

1. **Do NOT start or stop the server** unless explicitly told to by the user.
2. **Do NOT run commands** that modify the system (e.g., `taskkill`, `npm install`) without user permission.
3. Always confirm before making changes that affect running services.
4. Keep changes minimal and focused on what the user asks.
5. Do not add comments to code unless asked.
6. Do not create documentation files unless asked.
7. **Do NOT commit code** without explicit user permission.
8. **Do NOT push code** to remote repositories without explicit user permission.
9. **Do NOT create or publish releases** without explicit user permission.
10. **Do NOT create or merge pull requests** without explicit user permission.
11. **API Response Access Pattern:** Backend `ApiResponse` uses `Object.assign()` spreading properties flat — e.g., `{ success: true, tasks: [...], pagination: {...} }`. Axios wraps this in `res.data`. With `handleApiCall`, the returned `data` is the Axios response object, so `data.data` = response body. Always use dual access for safety: `data?.data?.field || data?.field` for list endpoints, and `res?.data?.field || res?.data?.data?.field` for single-item endpoints (create/update/restore).
12. **TanStack Query Caching & State Management:** Use TanStack Query (`@tanstack/react-query`) for all server-state caching and synchronization instead of manual map-based cache managers. Define query key factories (e.g. `PIPELINE_KEYS = { all: ['pipeline'], list: (filters) => ['pipeline', 'list', filters] }`), leverage `placeholderData: (prev) => prev` for smooth pagination transitions, and use `queryClient.setQueryData()` to surgically update cache in-place upon mutations.
13. **Optimistic UI Update Pattern:** Use `optimisticWithRevert` and TanStack Query's `onMutate` rollback pattern for all pipeline and state transitions (e.g. stage moves, assignments, status toggles). Pattern: (1) Cancel outgoing refetches, (2) Snapshot previous query data, (3) Optimistically update the UI/cache immediately, (4) Call API in background, (5) On error: automatically roll back to the snapshot and show error notification, (6) On settled: re-sync or invalidate if needed.
14. **Surgical Cache Updates:** When mutating data, update the matching query data in-place via `queryClient.setQueryData` rather than unconditionally blowing away the entire cache, avoiding unnecessary loading spinners and network refetch lag.
15. **Shared UI Components First:** Before writing any UI code, check `client/src/components/common/` to see available components (`Button`, `Input`, `Badge`, `Card`, `Modal`, `ConfirmDialog`, `StatCard`, etc.). Use these components instead of creating custom HTML elements with inline styles to ensure consistent styling.
16. **Context & Hook-Driven State Architecture:** Pages must NOT execute direct, raw API calls. All queries, mutations, grouping, and optimistic pipeline updates must be encapsulated inside specialized hooks and providers (e.g., `usePipeline`, `usePipelineMutations`). Pages only consume data and dispatch actions.
17. **Centralized API Call Pattern:** All HTTP requests go through the centralized API client and `handleApiCall` wrapper. In mutations, pass calls through `api` with standardized error and token handling.
18. **Minimal Response Mapping (Backend + Frontend):** Backend endpoints must support a `fields` query param to return only requested fields when needed. Skip `.populate()` when `fields` is provided to minimize payload size and improve latency.
19. **Ponytail Engineering Standard (Lazy Senior Dev Mode):** "The best code is the code you never wrote." Enforce the 7-rung decision ladder before writing code: (1) YAGNI check — eliminate speculative features, (2) Reuse existing codebase utilities, (3) Standard library first, (4) Native platform/browser features first, (5) Already-installed dependencies only, (6) Clean, direct logic without unneeded indirection or boilerplate, (7) Minimum viable code. Non-negotiables: Zero regression, security, authorization (RBAC and branch scoping), input validation, error handling, and verification are never compromised.
20. **Backend Minimal Payload & Strict Necessary Data Enforcement (Data Minimization):** Backend endpoints must ONLY return fields strictly necessary for the frontend view or requested operation. List/table/kanban endpoints must use Mongoose `.select(...)` and `.lean()` to exclude heavy audit trails (e.g. `-stageHistory`), internal version keys (`-__v`), and sensitive fields (`-password`). Support the `fields` query parameter across all query endpoints. Schemas must configure `versionKey: false` and `toJSON`/`toObject` transforms to strip `__v` and `password` by default.
21. **Mandatory WebP Image Asset Standard:** Before adding any raster image (PNG, JPG, JPEG) to the project (`client/src/assets/`, `client/public/`, or documentation), ensure it is converted to high-quality, lightweight `.webp` format first (preserving RGBA transparency where applicable). Never commit or import raw, uncompressed `.png` or `.jpg` image assets into client bundles. The only allowed exceptions are standard browser/PWA root favicons (`favicon.ico`, `favicon.svg`, `apple-touch-icon.png`).

## Mandatory Security-First Development Rules

22. **Security Analysis Before Coding:** Before implementing any feature, modifying existing code, creating an API, or changing database logic, first analyze its security implications.
23. **Threat Assessment:** Identify potential attack vectors, authentication weaknesses, authorization bypasses, race conditions, injection risks, data leakage, and resource exhaustion risks relevant to the proposed change.
24. **Secure Implementation Planning:** Define security requirements, validation rules, authorization checks, failure scenarios, and appropriate protections before writing code.
25. **Never Wait for a User-Requested Audit:** Security analysis must be a mandatory part of development, not something performed only after the user explicitly requests a security audit.
26. **Existing Code Security Review:** Before modifying any existing file, inspect its current implementation and identify related security dependencies and potential regressions.
27. **Security Testing:** Every security-sensitive implementation must include relevant negative tests, edge cases, concurrency tests where applicable, and regression tests.
28. **Fail-Secure Principle:** If security validation fails, the operation must be rejected safely. Never silently fall back to insecure defaults.
29. **No Unnecessary Refactoring:** Fix the identified issue without introducing unrelated architectural changes or breaking existing functionality.
30. **Documentation:** Record important security decisions, implementation details, and unresolved risks in the appropriate project documentation.
31. **Completion Verification:** Never claim a vulnerability is fixed without executing relevant tests and verifying the actual implementation.

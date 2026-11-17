# Aeterna One CRM — 90-Day Day-by-Day Implementation Roadmap

**Project:** Aeterna One CRM  
**Business:** Aeterna Overseas Education Consultancy  
**Branches:** Bengaluru, Mysuru, Belagavi  
**Architecture:** MERN — React 19 + Vite, Node.js 22, Express, MongoDB/Mongoose  
**Duration:** 90 working days (planning baseline; actual dates depend on reviews, dependencies and integration approvals)

---

## How to use this roadmap

- This roadmap expands the supplied architectural blueprint into daily work packages. It does **not** claim that every item is already implemented.
- Days are sequence numbers, not calendar dates. A day is complete only when its acceptance criteria and verification evidence exist.
- Antigravity owns implementation. OpenCode independently tests, reviews security and maintains the `brain/` knowledge base. The project owner approves scope and external integrations.
- Before each task, agents must read `RULES.md`, `CRM_AGENT_WORK_INSTRUCTIONS.md`, `CRM_WORKSPACE.md`, `task.md`, `NEW_TASK.md` and relevant `brain/` documents.
- Keep one active implementation task at a time. Do not let two agents edit the same application files concurrently.
- No feature is “verified” merely because code was written or a build passed. Record exact test commands, results and remaining limitations.
- External integrations (Meta, WhatsApp, Gmail, object storage, hosting) require credentials, account approvals and explicit owner approval. Until then, implement a safe adapter/configuration boundary and mark live integration as blocked.

## Product journey

Enquiry → Lead Qualification → Counselling → Shortlist → Application → Offer → Deposit → Visa → Enrolment.

## Fixed architecture and product constraints

- Keep the approved MERN stack and the existing Aeterna theme/design tokens.
- Five roles: `super_admin`, `branch_manager`, `counsellor`, `marketing`, `application_officer`.
- Branches: `bengaluru`, `mysuru`, `belagavi`; `all` is reserved for authorized global access.
- Backend authorization is authoritative. Never trust role, branch or ownership supplied by the browser.
- Student identity documents and financial records must use private object storage and short-lived signed access, not public URLs.
- Important actions need auditable actor, role, branch, action, timestamp and change details.
- No public self-service SaaS, payroll, biometric attendance, real-estate listing module, dummy business-data generation or autonomous AI communication/fee commitment.
- Use desktop tables and mobile card layouts where appropriate. Optimize only against measured bottlenecks.
- AI may assist staff, but a human must approve any student-facing communication or financial commitment.

---

# Phase A — Architecture Foundation (Days 1–5)

> The supplied roadmap marks the Phase A foundation as completed in its checklist, while its status line still says “In Progress.” Treat the checklist and current repository evidence as the baseline to re-verify, not as permission to rebuild the foundation. The current security-remediation and login-redesign work should be included in the project’s live status tracker.

## Day 1 — Repository baseline and architecture confirmation

**Backend**
- Inspect the Express application entry point, server bootstrap, middleware order, route registration, database connection lifecycle and environment validation.
- Confirm the Mongoose connection lifecycle, reconnect/disconnect handling and graceful shutdown.
- Verify centralized error handling and response shape.

**Frontend**
- Inspect React 19/Vite setup, route tree, lazy loading, `AuthProvider`, protected routes, API client and design tokens.
- Identify duplicated API calls, inconsistent loading/error states and unprotected routes.

**Cross-cutting**
- Confirm the five roles, three branches and global `all` branch semantics.
- Record actual implemented modules separately from sidebar placeholders or roadmap-only items.

**Deliverables**
- Baseline architecture diagram and current-state inventory.
- Known gaps, risks, environment prerequisites and verified commands.

**Acceptance**
- A clean local setup can be reproduced from documented instructions.
- No feature is marked complete without a code reference and verification evidence.

## Day 2 — Server foundation and environment safety

**Backend**
- Verify modular route/controller/service/model boundaries.
- Validate required environment variables at startup and fail closed on missing secrets/configuration.
- Confirm safe CORS allowlist, Helmet/security headers, rate limiting and request-size limits.
- Ensure production errors do not expose stack traces or secrets.

**Frontend**
- Verify environment-specific API base URL handling; no server secret may enter the client bundle.
- Confirm development-only helpers are gated and absent from production builds.

**Deliverables**
- Environment variable reference and server startup/runbook.
- Security middleware configuration notes.

**Acceptance**
- Missing mandatory configuration prevents unsafe startup.
- Untrusted origins are not granted credentialed CORS access.
- Client build contains no server secrets or production demo credentials.

## Day 3 — Authentication and session lifecycle

**Backend**
- Verify login, logout, current-user/session restore and refresh behavior.
- Use HTTP-only, Secure-in-production, appropriately SameSite cookies.
- Verify password hashing, generic authentication errors, inactive-user handling and session invalidation behavior.
- Ensure registration/provisioning is restricted to authorized administrators.

**Frontend**
- Verify initial session restore, login state, logout cleanup and 401 handling.
- Avoid storing access/refresh tokens in localStorage.

**Deliverables**
- Auth sequence diagram and endpoint contract.
- Authentication test matrix.

**Acceptance**
- Anonymous and unauthorized provisioning attempts are rejected.
- Invalid, expired, tampered and revoked/invalidated sessions are rejected.
- Login, refresh and logout work without exposing tokens to browser JavaScript.

## Day 4 — RBAC, branch isolation and reusable UI foundation

**Backend**
- Verify centralized role permissions and branch-scope middleware.
- Confirm branch scope is derived from authenticated identity and cannot be widened through query/body parameters.
- Ensure record-level authorization applies to reads and writes.

**Frontend**
- Verify permission-aware navigation, protected routes and action visibility.
- Verify reusable Button, Input, Select, Badge, Card, Modal, ConfirmDialog and LoadingSpinner behavior.
- Preserve keyboard accessibility and focus states.

**Deliverables**
- Role/permission matrix and branch-access matrix.
- Shared component inventory.

**Acceptance**
- Backend denies unauthorized actions even if frontend controls are manually invoked.
- Cross-branch read/write attempts are rejected.
- Shared components use consistent design tokens and accessible states.

## Day 5 — Foundation verification and handover

**Backend and frontend**
- Run backend automated tests, lint/static checks where configured and production frontend build.
- Exercise health endpoints with database connected and disconnected.
- Verify route-level code splitting and global error/loading behavior.

**OpenCode**
- Independently review authentication, RBAC, branch isolation, environment safety and test coverage.
- Update `brain/` architecture, security, testing and file-map documents.

**Deliverables**
- Phase A verification report, known-issues list and prioritized Phase B backlog.

**Acceptance**
- No unresolved critical security issue is hidden by a green build.
- All remaining issues have severity, owner and next action.
- Owner approves starting Lead Management.

---

# Phase B1 — Lead Management (Days 6–18)

## Day 6 — Lead domain discovery and business rules

- Document enquiry sources, required fields, lead lifecycle, branch ownership and assignment rules with the business owner.
- Define what makes two enquiries duplicates and which fields are safe matching signals.
- Define lead visibility for all five roles.
- Map lead status, priority, source, campaign, assigned counsellor and branch.
- **Deliverables:** Lead requirements, field dictionary, role-action matrix and workflow diagram.
- **Acceptance:** Business rules are approved before schema/API implementation; ambiguous rules are listed rather than guessed.

## Day 7 — Lead schema and indexes

**Backend**
- Design Lead schema with identity/contact details, source/attribution, branch, owner, status, timestamps and audit metadata.
- Add validation, normalization and indexes for common filters and duplicate detection.
- Decide soft-delete/archive behavior and retention requirements.

**Tests**
- Required/optional fields, invalid email/phone, invalid branch/status, duplicate index behavior.

**Acceptance**
- Schema supports the approved lead workflow without storing unnecessary sensitive data.
- Indexes are justified by query patterns.

## Day 8 — Lead creation API

**Backend**
- Implement create-lead endpoint, input allowlist, validation, authenticated actor metadata and branch assignment.
- Prevent clients from setting privileged owner/branch values unless role policy permits.
- Return a consistent response and useful validation errors.

**Frontend**
- Build the create-lead form shell using existing shared components.

**Acceptance**
- Authorized users can create leads.
- Unauthorized roles and cross-branch assignment attempts are rejected.
- Tests verify database state and audit metadata.

## Day 9 — Lead deduplication engine

**Backend**
- Implement normalized matching using approved identifiers (for example normalized phone/email), with explicit handling for incomplete records.
- Decide whether a match blocks creation, warns the user or allows a privileged override.
- Avoid unsafe regex construction from raw user input.

**Frontend**
- Display duplicate candidates and a clear next action without leaking other-branch records.

**Acceptance**
- Duplicate checks are branch-aware and permission-aware.
- Tests cover exact match, partial match, formatting differences and cross-branch privacy.

## Day 10 — Lead list API, filters and pagination

**Backend**
- Implement bounded pagination, stable sorting and allowlisted filters.
- Add search by approved fields with escaped/validated search input.
- Enforce branch scope in every query.

**Frontend**
- Connect list page to API with debounced search and server-side pagination.

**Acceptance**
- Search, filters, sorting and pagination work together.
- Extreme limits, malformed filters and unauthorized branch filters are safely handled.

## Day 11 — Desktop table and mobile card views

**Frontend**
- Build dense desktop table and touch-friendly mobile card layout.
- Add loading skeleton, empty state, error state and retry behavior.
- Provide accessible row/card actions and responsive overflow handling.

**Backend**
- Confirm list response contains only fields required by the UI.

**Acceptance**
- No horizontal overflow or inaccessible actions at supported breakpoints.
- Data shown is permission-scoped and does not expose private fields.

## Day 12 — Lead detail drawer/page

**Backend**
- Implement lead detail endpoint with field projection and record-level access.
- Return summary, ownership, source, current status and permitted activity details.

**Frontend**
- Build lead details drawer/page with clear information hierarchy.
- Add loading, not-found, forbidden and server-error states.

**Acceptance**
- A user cannot open another branch’s lead by changing an ID in the URL.
- Detail view does not expose fields the role is not permitted to see.

## Day 13 — Lead editing and validation

**Backend**
- Implement partial updates with field allowlist and immutable-field protection.
- Record before/after changes for important fields.
- Prevent unauthorized branch/owner/status changes.

**Frontend**
- Add edit form, inline validation and unsaved-change handling.

**Acceptance**
- Valid edits persist; invalid edits return field-level errors.
- Sensitive ownership and branch fields cannot be tampered with.

## Day 14 — Lead assignment and branch routing

**Backend**
- Implement assignment to eligible counsellors within the correct branch.
- Implement approved branch-routing and optional round-robin behavior.
- Handle no eligible assignee, inactive staff and concurrent assignment safely.

**Frontend**
- Add assignment modal with branch-aware staff options and confirmation.

**Acceptance**
- Assignment respects role, branch and staff status.
- Tests cover cross-branch assignment, concurrent requests and no-assignee cases.

## Day 15 — Lead status, priority and source management

**Backend**
- Implement approved status/priority transitions and source metadata.
- Validate transition rules; do not allow arbitrary client-supplied state changes.
- Track status history.

**Frontend**
- Add status/priority badges, filters and permitted quick actions.

**Acceptance**
- Invalid transitions are rejected and valid transitions are auditable.
- UI controls match backend permissions.

## Day 16 — Lead activity timeline and notes

**Backend**
- Add append-only activity events for creation, assignment, status changes and permitted edits.
- Add internal notes with author, timestamp and visibility rules.
- Prevent silent editing/deletion of audit events.

**Frontend**
- Display chronological activity timeline and note composer.

**Acceptance**
- Activity history is correctly attributed and branch-scoped.
- Internal notes are never exposed to unauthorized roles or public endpoints.

## Day 17 — Lead workflow integration and regression

- Test create → duplicate check → assign → update → note → status transition → detail/list consistency.
- Verify cache invalidation or surgical cache updates for create/edit/assignment/status changes.
- Test stale data, double submission and network failure.
- Run role × action × branch matrix.
- **Acceptance:** Full lead workflow passes API and UI tests with no branch-isolation regression.

## Day 18 — B1 independent review and release gate

**OpenCode**
- Independently test APIs, permissions, duplicate behavior, filters, pagination, mobile UI and regressions.
- Review query/index behavior and security-sensitive projections.
- Update `brain/backend`, `brain/frontend`, workflows, API reference, file maps and testing docs.

**Deliverables**
- B1 verification report and accepted limitations.

**Acceptance**
- Owner accepts Lead Management as ready for pipeline integration.
- Critical/high findings are fixed or explicitly block phase progression.

---

# Phase B2 — Admissions Pipeline (Days 19–30)

## Day 19 — Pipeline lifecycle and state-machine definition

- Confirm all 16 lifecycle stages with business owner; source roadmap describes 16 stages but does not enumerate their names.
- Define allowed transitions, terminal states, re-entry rules and role overrides.
- Define lost/deferred reasons and minimum reason length/rules.
- **Deliverables:** Approved stage dictionary, transition matrix and state diagram.
- **Acceptance:** No stage names or transition rules are invented without business approval.

## Day 20 — Pipeline data model and migration plan

**Backend**
- Design pipeline/application record relationship to lead/student.
- Define current stage, stage history, owner, branch, timestamps and reason fields.
- Add indexes for branch, stage, owner and common filters.
- Plan safe migration from any existing prototype records.

**Acceptance**
- One record has a clear identity and lifecycle; duplicate or orphan records are handled explicitly.

## Day 21 — Pipeline APIs: read and board data

- Implement branch-scoped board/list API.
- Add filters for stage, owner, intake, source and search where approved.
- Bound pagination and return counts only within authorized scope.
- **Acceptance:** Board data cannot leak other-branch records or unapproved fields.

## Day 22 — Pipeline transition API

- Implement server-side transition validation using the approved state machine.
- Enforce role and branch authorization on every transition.
- Require lost/deferred reason where business rules demand it.
- Record immutable stage-history events.

**Acceptance:** Invalid transitions, unauthorized overrides and cross-branch updates are rejected.

## Day 23 — Kanban board UI

**Frontend**
- Build stage columns and pipeline cards using existing theme tokens.
- Add counts, empty columns, loading and error states.
- Ensure responsive behavior and accessible alternatives to drag-and-drop.

**Acceptance:** Board reflects server state and works on desktop/tablet/mobile.

## Day 24 — Drag-and-drop and optimistic rollback

- Implement native HTML5 drag-and-drop as specified in the blueprint.
- Apply optimistic updates only when safe; automatically revert on API rejection.
- Prevent duplicate submissions and conflicting transitions.
- **Acceptance:** Failed transitions restore the original card position and show a clear message.

## Day 25 — Pipeline card and detail view

- Show only permitted student/lead summary fields.
- Add detail drawer/page with stage history and relevant notes.
- Enforce record-level authorization on direct URLs and API calls.

**Acceptance:** No sensitive document or financial data is exposed in board cards.

## Day 26 — Documents checklist gate

- Define document checklist items and which stage transitions require completion.
- Implement verification permissions and audit events.
- Prevent unauthorized users from verifying documents or bypassing gates.

**Acceptance:** Required documents block the relevant transition server-side, not just in UI.

## Day 27 — Lost/deferred workflow and recovery

- Implement reason capture, status history and authorized recovery/reopen behavior.
- Define whether reassignment is required on reopening.
- Add filters and reporting metadata.

**Acceptance:** Lost/deferred records remain traceable; reopening follows approved policy.

## Day 28 — Pipeline role/branch matrix and concurrency

- Test all five roles against view, create, move, override, verify and reopen actions.
- Test two users updating the same record and stale stage versions.
- Confirm branch scoping on list, detail and mutation endpoints.

**Acceptance:** No unauthorized transition or lost update under tested concurrency scenarios.

## Day 29 — Pipeline integration and regression

- Test lead-to-pipeline conversion and identity linking.
- Verify list, board, detail and activity history stay consistent.
- Test pagination, filters, error recovery and cache behavior.
- Run full backend suite and frontend build.

**Acceptance:** End-to-end workflow passes without duplicate records or broken lead references.

## Day 30 — B2 independent verification and release gate

**OpenCode**
- Perform independent state-machine, RBAC, branch, document-gate, concurrency and UI tests.
- Review all 16 approved stages against implementation.
- Update `brain/` workflows, API reference, file maps and security/testing notes.

**Acceptance:** Business owner signs off the 16-stage workflow; critical/high issues block B3.

---

# Phase B3 — Student 360° Profile & Documents Vault (Days 31–45)

## Day 31 — Student 360° requirements and data classification

- Define student profile sections: identity/contact, academics, test scores, budget, preferences, shortlist, applications and notes.
- Classify personal, identity, education and financial data by sensitivity.
- Define role visibility and branch ownership for each section.
- **Acceptance:** Field-level access and retention requirements are documented.

## Day 32 — Student profile model and lead conversion

- Design Student schema and relationship to original lead/application.
- Define conversion rules, duplicate handling and immutable source attribution.
- Add validation and indexes.
- **Acceptance:** Lead conversion does not lose source/branch/owner history or create duplicate students.

## Day 33 — Student profile APIs

- Implement create/read/update endpoints with field-level allowlists.
- Enforce branch and role authorization on each operation.
- Separate editable profile fields from system-managed fields.
- **Acceptance:** Unauthorized fields and cross-branch access are rejected.

## Day 34 — Student 360° overview UI

- Build profile header, key facts and section navigation.
- Add responsive layout, loading/empty/error states.
- Show only fields permitted for the current role.
- **Acceptance:** Profile is usable on desktop and mobile with no sensitive-field leakage.

## Day 35 — Academic history and test scores

- Model education history, grades, test type, score, date and supporting evidence.
- Validate score formats and dates without hardcoding unsupported test assumptions.
- Add CRUD UI/API and audit events.
- **Acceptance:** Invalid scores/dates are rejected and history remains traceable.

## Day 36 — Budget, preferences and counselling notes

- Model budget range/currency, destination preferences, course preferences and counselling notes.
- Define who can view/edit financial and internal-note fields.
- Add validation and history for sensitive changes.
- **Acceptance:** Role-based access and audit trail are verified.

## Day 37 — Object storage architecture and threat model

- Confirm provider (Cloudflare R2 or S3-compatible service) only after owner approval.
- Design private bucket layout, key naming, encryption, upload limits and retention.
- Define signed upload/download URL expiry and authorization checks.
- **Acceptance:** No public bucket/object access; provider credentials remain server-side.

## Day 38 — Secure upload API

- Implement authorized upload-intent endpoint and file metadata record.
- Validate MIME type, extension, size and allowed document category.
- Use short-lived signed upload URLs or a secure server upload flow.
- **Acceptance:** Unauthorized users cannot upload into another student’s namespace.

## Day 39 — Secure download and document preview

- Implement authorization before issuing short-lived signed download URLs.
- Add safe content disposition and preview policy.
- Prevent permanent public links and unauthorized enumeration.
- **Acceptance:** Expired/unauthorized downloads fail; links are not reusable indefinitely.

## Day 40 — Document checklist and verification

- Define required documents by application/stage and document category.
- Add upload status, verification status, verifier and timestamp.
- Restrict verification to approved roles.
- **Acceptance:** Checklist state is consistent with pipeline transition gates.

## Day 41 — Document vault UI

- Build document list, upload progress, preview/download and verification indicators.
- Add empty/error/retry states and clear file restrictions.
- Ensure accessible controls and responsive behavior.
- **Acceptance:** UI never treats an upload as verified until backend confirms it.

## Day 42 — Audit, retention and deletion lifecycle

- Define soft-delete, archive, retention and permanent deletion approvals for documents.
- Log upload, download authorization, verification and deletion events without logging file contents/secrets.
- Add cleanup process only after policy approval.
- **Acceptance:** Sensitive files and metadata follow approved lifecycle rules.

## Day 43 — Student/application integration

- Connect Student 360° to lead and pipeline records.
- Show application progress and document checklist context.
- Ensure a student can have the approved number of applications and relationships.
- **Acceptance:** Relationships remain consistent through conversion and stage changes.

## Day 44 — Security, privacy and regression tests

- Test IDOR, cross-branch access, signed URL expiry, MIME spoofing, oversized files and unauthorized verification.
- Test profile field allowlists and audit integrity.
- Test upload interruption and retry behavior.
- **Acceptance:** No public file access or cross-student document access in negative tests.

## Day 45 — B3 independent verification and release gate

**OpenCode**
- Independently test profile APIs, field permissions, object storage access and document lifecycle.
- Review privacy and retention documentation.
- Update `brain/` file maps, workflows, API reference, security and testing docs.

**Acceptance:** Owner approves data classification and storage configuration; unresolved critical privacy issues block phase completion.

---

# Phase B4 — Tasks, Follow-ups & Communications (Days 46–60)

## Day 46 — Task and follow-up business rules

- Define task types, due dates, priorities, ownership, reminders, completion and escalation rules.
- Define relationship to lead/student/application.
- Define role permissions and branch visibility.
- **Acceptance:** Task lifecycle and ownership rules are approved.

## Day 47 — Task model and APIs

- Implement task schema, validation, assignment and branch scope.
- Add list/create/update/complete endpoints with bounded filters and pagination.
- Record actor and activity metadata.
- **Acceptance:** Users cannot create or assign tasks outside their permission scope.

## Day 48 — Counsellor task queue UI

- Build “My Tasks” and permitted team queue views.
- Add priority, due date, overdue state and status filters.
- Provide desktop/mobile layouts and clear empty states.
- **Acceptance:** Queue reflects current user permissions and branch scope.

## Day 49 — Follow-up scheduling

- Implement follow-up date/time, timezone handling, outcome and next-action fields.
- Prevent invalid dates and duplicate follow-up submissions.
- Link follow-ups to the correct lead/student.
- **Acceptance:** Follow-up history is traceable and correctly ordered.

## Day 50 — Reminders and notification foundation

- Define notification channels and event types.
- Implement in-app notification records and read/unread state if approved.
- Add retry-safe background job boundary; do not send external messages yet without credentials/approval.
- **Acceptance:** Notification creation is idempotent and does not duplicate on retries.

## Day 51 — After-hours enquiry and SLA rules

- Define business hours, holidays, timezone and SLA targets with the owner.
- Implement due/overdue calculations and escalation eligibility.
- Avoid assuming a branch schedule without approval.
- **Acceptance:** SLA calculation is deterministic and covered by timezone/boundary tests.

## Day 52 — Task assignment and escalation

- Implement reassignment, team queue and escalation permissions.
- Record assignment history and reasons where required.
- Handle inactive staff and unassigned tasks.
- **Acceptance:** Escalations cannot bypass branch and role controls.

## Day 53 — Communication templates foundation

- Define approved template variables, language, opt-in state and message audit fields.
- Build template management boundary without sending live messages.
- Ensure secrets/provider tokens are server-only.
- **Acceptance:** Template preview is safe; no message is sent without explicit authorized action.

## Day 54 — Gmail integration readiness

- Confirm account ownership, OAuth/SMTP approach and required permissions with owner.
- Implement provider adapter/configuration and secret handling only after approval.
- Add dry-run/preview mode and delivery status contract.
- **Acceptance:** No credentials in source or frontend; live sending remains disabled until approved.

## Day 55 — WhatsApp Cloud API readiness

- Confirm WhatsApp Business account, Meta app, webhook verification and approved templates.
- Implement integration boundary and webhook signature verification plan.
- Store opt-in/opt-out and consent evidence.
- **Acceptance:** No outbound WhatsApp message without consent, approved template and human authorization.

## Day 56 — Communication activity timeline

- Link permitted email/WhatsApp activity metadata to lead/student.
- Store provider message ID, status and timestamp, not unnecessary message secrets.
- Enforce access to communication content and internal notes.
- **Acceptance:** Communication history is branch-scoped and auditable.

## Day 57 — Retry, idempotency and failure handling

- Define retry policy, backoff, dead-letter/manual retry behavior and duplicate prevention.
- Test provider timeout, rate limit, invalid credentials and webhook replay.
- **Acceptance:** Retries do not send duplicate communications or lose task state.

## Day 58 — Task/follow-up end-to-end workflow

- Test lead creation → assignment → task → follow-up → outcome → next task → escalation.
- Verify notifications and audit history.
- Test mobile queue and failure recovery.
- **Acceptance:** Complete workflow is traceable and permission-safe.

## Day 59 — B4 regression and operational review

- Run role/branch matrix, API tests, frontend build and integration tests.
- Review background job observability and failure visibility.
- Document any blocked live provider integration.
- **Acceptance:** No external integration is called “complete” unless credentials, approval and live test evidence exist.

## Day 60 — B4 independent verification and release gate

**OpenCode**
- Independently test task ownership, SLA, reminders, consent, communication authorization and webhook safety.
- Update `brain/` workflows, API docs, file maps and runbooks.

**Acceptance:** Owner approves operational rules; live communications remain disabled until legal/consent/provider requirements are satisfied.

---

# Phase B5 — Advanced Engineering & Management Reports (Days 61–75)

## Day 61 — Reporting definitions and KPI dictionary

- Agree on lead volume, source conversion, stage conversion, counsellor workload, application outcomes and branch scorecards.
- Define numerator, denominator, date window, attribution and exclusion rules for every KPI.
- **Acceptance:** KPI definitions are signed off; dashboard metrics are not guessed.

## Day 62 — Reporting data model and aggregation strategy

- Identify authoritative collections and event sources.
- Design indexes and aggregation pipelines for branch/date/owner dimensions.
- Define timezone and historical correction behavior.
- **Acceptance:** Reports reconcile to underlying records and enforce branch scope.

## Day 63 — Backend reporting APIs

- Implement summary and trend endpoints with bounded date ranges and permission checks.
- Prevent users from requesting unauthorized branches.
- Add caching only where freshness and invalidation rules are explicit.
- **Acceptance:** API values match test fixtures and cannot leak cross-branch aggregates.

## Day 64 — Branch scorecards

- Build branch-level lead, conversion, workload and outcome scorecards.
- Add date filters and clear metric definitions/tooltips.
- **Acceptance:** Branch managers see only authorized branch data; super admins see permitted global data.

## Day 65 — Conversion funnels

- Implement stage conversion and drop-off metrics using agreed cohort logic.
- Handle records created before the reporting period and records that re-enter stages.
- **Acceptance:** Funnel math is documented and reproducible.

## Day 66 — Counsellor performance views

- Define fair workload and conversion indicators; avoid ranking based on raw counts without context.
- Add filters for branch, date range and owner.
- **Acceptance:** Metrics account for assignment dates and approved attribution rules.

## Day 67 — Dashboard UI and responsive charts

- Build dashboard cards, charts, loading skeletons, empty states and error handling.
- Ensure charts have accessible text/table alternatives.
- **Acceptance:** Dashboard is responsive and values are traceable to KPI definitions.

## Day 68 — Advanced cache evaluation

- Measure actual API latency and repeated requests.
- Decide whether existing in-memory cache is sufficient or TanStack Query is justified.
- If adopted, define invalidation keys and mutation behavior before migration.
- **Acceptance:** No library migration without measurable benefit and regression plan.

## Day 69 — Cache and query optimization

- Implement only approved cache improvements.
- Add query indexes based on explain plans and measured slow queries.
- Prevent stale sensitive data after role/branch changes or logout.
- **Acceptance:** Performance improves without stale authorization or data leakage.

## Day 70 — Virtualized tables assessment

- Profile realistic large datasets and DOM performance.
- Introduce virtualization only if measured thresholds justify it.
- Preserve keyboard navigation, row actions and mobile card behavior.
- **Acceptance:** Decision is evidence-based; unnecessary dependency is avoided.

## Day 71 — Command palette

- Define searchable entities/routes and permission filtering.
- Implement keyboard activation, focus management and accessible results.
- Do not reveal hidden modules or records in suggestions.
- **Acceptance:** Search results respect role and branch permissions.

## Day 72 — Real-time notification architecture

- Define event names, authorization, reconnect behavior and delivery guarantees.
- Implement Socket.IO only if operational hosting supports sticky sessions/pub-sub as needed.
- Keep polling/fallback path if real-time transport is unavailable.
- **Acceptance:** Users receive only events for authorized branches/records.

## Day 73 — PDF export foundation

- Define A4 templates for student summary, fee receipt and application checklist.
- Ensure only authorized fields are included and exports are auditable where required.
- Generate PDFs client-side using the approved `jspdf`/`html-to-image` approach unless a security requirement dictates otherwise.
- **Acceptance:** Export layout is correct and does not expose hidden fields.

## Day 74 — Performance and accessibility pass

- Measure route bundle sizes, API latency, largest lists and rendering bottlenecks.
- Review keyboard navigation, contrast, labels and reduced-motion support.
- Fix only evidenced issues; avoid premature optimization.
- **Acceptance:** Baseline and post-change measurements are recorded.

## Day 75 — B5 independent verification and release gate

**OpenCode**
- Verify KPI calculations, report permissions, caching, command palette authorization, real-time event isolation and PDF field access.
- Update `brain/` architecture, workflows, API, file maps and performance/testing docs.

**Acceptance:** Business owner approves KPI definitions and report outputs; inaccurate metrics block release.

---

# Phase B6 — Production Hardening & Pilot Launch (Days 76–90)

## Day 76 — Production threat model refresh

- Reassess authentication, authorization, branch isolation, sensitive data, file storage, integrations and admin operations.
- Review all prior findings and confirm remediation evidence.
- **Acceptance:** Threat model lists assets, trust boundaries, attack paths and controls.

## Day 77 — Full security regression

- Run authentication, session, RBAC, IDOR, branch-isolation, input validation, rate-limit and file-access suites.
- Add negative tests for every high-risk endpoint.
- **Acceptance:** No unresolved critical/high security issue; all exceptions are documented and owner-approved.

## Day 78 — Dependency and configuration audit

- Review dependency vulnerabilities, outdated packages and unused dependencies.
- Check secrets, CORS, cookies, CSP, headers, logging and production environment configuration.
- **Acceptance:** No secrets committed or shipped; production config is reproducible and fail-closed.

## Day 79 — Database backup and recovery

- Define backup frequency, retention, encryption, access control and restore procedure.
- Perform a restore test in a non-production environment.
- Define recovery point and recovery time objectives with owner.
- **Acceptance:** A backup is not considered valid until restore is demonstrated.

## Day 80 — Observability and operational alerts

- Add structured logs, request correlation IDs and safe error metadata.
- Define health/readiness/liveness behavior and alert thresholds.
- Ensure logs exclude passwords, tokens, document contents and unnecessary personal data.
- **Acceptance:** Operators can diagnose failures without exposing sensitive information.

## Day 81 — CI/CD and release process

- Define automated install, lint, test, build and security-check pipeline.
- Add environment separation and protected deployment secrets.
- Define migration and rollback process.
- **Acceptance:** A release candidate can be built reproducibly; deployment requires owner approval.

## Day 82 — Staging deployment

- Deploy to staging with production-like configuration and non-production data.
- Verify database connectivity, cookies/CORS, file storage, background jobs and integrations.
- **Acceptance:** Staging smoke tests pass and no real student data is used without authorization.

## Day 83 — User acceptance testing preparation

- Prepare role-specific scenarios for super admin, branch manager, counsellor, marketing and application officer.
- Prepare branch-specific scenarios for Bengaluru, Mysuru and Belagavi.
- Create test accounts and synthetic test records only in staging.
- **Acceptance:** UAT script maps each business requirement to an expected result.

## Day 84 — UAT: Lead and pipeline workflows

- Run enquiry capture, duplicate handling, assignment, counselling, shortlist and stage progression scenarios.
- Capture usability feedback and defects.
- **Acceptance:** Business users confirm core lead-to-application workflow or record blocking issues.

## Day 85 — UAT: Student documents and communications

- Test profile updates, document upload/download/verification, tasks, reminders and approved communication flows.
- Validate role/branch restrictions with real user scenarios.
- **Acceptance:** Sensitive-data workflows are accepted; external messages are tested only with approved test recipients and consent.

## Day 86 — Defect triage and fixes

- Classify UAT issues by severity and business impact.
- Fix release-blocking defects first; avoid adding scope.
- Add regression tests for every defect.
- **Acceptance:** No open blocker/critical defect; remaining minor issues have owner and target date.

## Day 87 — Final independent audit

**OpenCode**
- Run full backend and frontend suites, security regression, dependency/config checks and staging smoke tests.
- Review documentation accuracy, runbooks, backup restore evidence and known limitations.
- **Acceptance:** Signed verification report lists exact commands, environment and results.

## Day 88 — Staff onboarding and training

- Prepare role-specific quick-start guides and safe operating procedures.
- Train branch representatives on lead handling, pipeline, student records, tasks and document privacy.
- Confirm account provisioning and least-privilege roles.
- **Acceptance:** Staff can complete core tasks in staging and know how to report incidents.

## Day 89 — Pilot readiness and go/no-go review

- Review security sign-off, UAT, backup/restore, monitoring, support ownership, data migration and rollback plan.
- Confirm external integration approvals and data protection responsibilities.
- Decide pilot scope and branch sequence.
- **Acceptance:** Owner makes an explicit go/no-go decision; unresolved risks are not silently waived.

## Day 90 — Controlled pilot launch and stabilization

- Launch only the approved pilot scope and authorized branches/users.
- Monitor errors, latency, failed jobs, access denials and support reports.
- Reconcile migrated data and verify backups.
- Hold a stabilization review and prioritize post-launch fixes.
- **Acceptance:** Pilot operates within agreed thresholds; rollback path remains available; next-phase backlog is approved.

---

# Cross-phase Definition of Done

Every feature must satisfy all applicable checks before it is marked complete:

1. **Business:** Workflow and rules approved; edge cases documented.
2. **Backend:** Validation, authorization, branch scope, error handling, pagination and audit behavior implemented.
3. **Database:** Schema, indexes, relationships and migration/retention implications documented.
4. **Frontend:** Loading, empty, error, success, validation, responsive and permission states implemented.
5. **Security:** Positive and negative tests include unauthorized roles, branch tampering, IDOR and malformed inputs where relevant.
6. **Testing:** Unit/integration/API tests run; exact command and result recorded. A passing build alone is not sufficient.
7. **Regression:** Existing workflows continue to work.
8. **Documentation:** Relevant `brain/` docs, API reference, workflows and file maps updated from actual code.
9. **Tracking:** `task.md` and `CRM_WORKSPACE.md` reflect implemented vs independently verified status accurately.
10. **Approval:** Owner approves external integrations, production data, deployment and scope changes.

## Agent responsibilities

### Antigravity — implementation owner
- Implements the active task and adds developer tests.
- Updates implementation notes and prepares an OpenCode handoff in `NEW_TASK.md`.
- Handoff must include exact changed files, test files, commands, acceptance criteria and known limitations.
- Does not mark work independently verified.

### OpenCode — independent verifier and knowledge-base maintainer
- Reads the handoff and inspects actual diffs; does not trust summaries alone.
- Runs independent positive, negative, boundary and regression tests.
- Does not modify application source during a verification-only task.
- Updates relevant `brain/` documents and records exact evidence.
- Marks verification complete only when evidence supports it; reports failures without hiding them.

### Project owner
- Confirms business rules, approves scope and external credentials/integrations.
- Reviews screenshots/builds/UAT and signs off phase gates.
- Decides go/no-go for production or pilot.

## Important schedule note

This is a 90-working-day sequence derived from the supplied roadmap's phase ranges. It is not a guarantee that one developer can finish every task in one day. External approvals, storage credentials, WhatsApp/Meta verification, real business-rule decisions, defects and review cycles can extend the schedule. If a day is not accepted, carry it forward; do not compress testing or documentation to preserve the calendar.

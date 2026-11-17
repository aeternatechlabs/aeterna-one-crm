# AETERNA ONE CRM — PHASE 1 SECURITY AUDIT & VULNERABILITY ASSESSMENT REPORT

> **Document Type:** Independent Penetration Test & Architectural Security Audit  
> **Target Scope:** Phase 1 (Phase A, Days 1–5 Foundation, RBAC, API Shield, Super Admin Gateway)  
> **Status:** Assessment Complete — Vulnerabilities Documented (Code modifications withheld per instruction)  
> **Date:** 17 November 2026  
> **Auditor Role:** Senior Principal Security Engineer & Adversarial Red-Team Auditor  

---

## 🎯 Executive Summary

An exhaustive adversarial security review was performed across the Phase 1 backend implementation of **Aeterna One CRM** (`server/src/**`, middleware, authentication lifecycle, RBAC, branch isolation, and the API Shield).

The system exhibits strong foundational security controls:
- Fail-closed JWT token creation (`JWT_SECRET` absence terminates execution).
- Strong Helmet security headers, CORS origin allowlist, and zero `X-Powered-By` leakage.
- Strict branch-scoping isolation and record-level mutation guards.
- Centralized API Shield with request ID tracking, payload limits, and an English-only error engine.

However, deep code analysis and adversarial edge-case probing identified **11 distinct security vulnerabilities and architectural gaps** categorized as:
- **3 High-Severity Vulnerabilities** (Race conditions, hardcoded fallback secrets, credential stuffing vectors).
- **5 Medium-Severity Vulnerabilities** (Stateless JWT zombie sessions, Content-Type bypasses, ReDoS full-table scans, concurrency state collisions, timing attacks).
- **3 Low-Severity / Operational Risks** (Unthrottled refresh endpoints, weak password complexity, in-memory rate-limiter clustering limits).

Per explicit instruction, **no application code was modified**. All findings, attack clues, mechanics, and recommended mitigations are catalogued below for engineering triage.

---

## 📊 Vulnerability Severity Breakdown & Remediation Tracking

| ID | Vulnerability Title | Category | Severity | Status | Verification Suite |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **SEC-01** | TOCTOU Race Condition in Super Admin One-Time Provisioning | Concurrency / Integrity | **HIGH** | 🟢 **RESOLVED (Batch 1)** | `batch1-security-hardening.test.js` (SEC-01.1–01.4) |
| **SEC-02** | Hardcoded Fallback Developer Secret Key in Source Code | Credential Management | **HIGH** | 🟢 **RESOLVED (Batch 1)** | `batch1-security-hardening.test.js` (SEC-02.1–02.3) |
| **SEC-03** | Distributed Credential Stuffing Vector (Lack of Account-Level Lockout) | Authentication | **HIGH** | 🟢 **RESOLVED (Batch 1)** | `batch1-security-hardening.test.js` (SEC-03.1–03.5) |
| **SEC-04** | Stateless Zombie JWT Sessions Post-Logout | Session Management | **MEDIUM-HIGH** | 🟢 **RESOLVED (Batch 2)** | `batch2-security-hardening.test.js` (SEC-04.1–04.4) |
| **SEC-05** | Payload Shield Content-Type Bypass via Omitted Header / Chunked Encoding | Input Validation | **MEDIUM** | 🟢 **RESOLVED (Batch 2)** | `batch2-security-hardening.test.js` (SEC-05.1–05.5) |
| **SEC-06** | Database CPU Starvation / ReDoS via Unindexed Case-Insensitive `$regex` Search | Denial of Service | **MEDIUM** | 🟢 **RESOLVED (Batch 2)** | `batch2-security-hardening.test.js` (SEC-06.1–06.4) |
| **SEC-07** | Pipeline State Transition Concurrency Race Condition | Business Logic | **MEDIUM** | 🟢 **RESOLVED (Batch 3)** | `batch3-security-hardening.test.js` (SEC-07.1–07.6) |
| **SEC-08** | Side-Channel Timing Attack on Developer Setup Key Verification | Cryptography | **MEDIUM** | 🟢 **RESOLVED (Batch 1 & 3)** | `batch1-security-hardening.test.js` & `batch3-security-hardening.test.js` (SEC-08.1–08.4) |
| **SEC-09** | Unthrottled Token Refresh Endpoint (`POST /api/v1/auth/refresh`) | Rate Limiting | **LOW** | 🟢 **RESOLVED (Batch 3)** | `batch3-security-hardening.test.js` (SEC-09.1–09.3) |
| **SEC-10** | Permissive Password Complexity Baseline (Min 6 Characters) | Identity & Access | **LOW** | 🟡 Pending Future Batch | Backlog |
| **SEC-11** | In-Memory Rate Limiter Reset & Multi-Instance Cluster Ineffectiveness | Operational Security | **LOW** | 🟡 Pending Future Batch | Backlog |

---

## 🔍 Detailed Vulnerability Findings & Attack Mechanics

---

### 🔴 FINDING SEC-01: TOCTOU Race Condition in Super Admin Provisioning
- **Affected File:** `server/src/modules/auth/auth.controller.js` (lines 60–66, 119–125) & `server/src/modules/users/user.model.js` (line 29)
- **Vulnerability Class:** Time-Of-Check to Time-Of-Use (TOCTOU) / Missing Database Unique Index
- **Severity:** **HIGH**
- **Clue & Root Cause:**
  In `setupSuperAdmin` and `register`:
  ```javascript
  const superAdminExists = await User.exists({ role: ROLES.SUPER_ADMIN });
  if (superAdminExists) {
    throw new ApiError(403, "Hold up, Chief! There can only be ONE Super Admin...");
  }
  const user = await User.create({ ... role: ROLES.SUPER_ADMIN, branch: BRANCHES.ALL });
  ```
  In MongoDB, `role` only has a standard secondary index:
  ```javascript
  role: { type: String, enum: ..., default: ROLES.COUNSELLOR, index: true }
  ```
  There is **no partial unique index** (`{ role: 1 }, { unique: true, partialFilterExpression: { role: 'super_admin' } }`) on the MongoDB collection.
- **Attack Path:**
  1. On a fresh database installation, an attacker fires 10 simultaneous asynchronous HTTP requests to `POST /api/v1/auth/setup-super-admin` with the developer key.
  2. Because all 10 requests reach `await User.exists({ role: 'super_admin' })` before the first `User.create()` completes its BSON write, all 10 queries resolve to `false`.
  3. All 10 requests proceed to insert a Super Admin.
  4. MongoDB inserts all 10 Super Admins without error, completely shattering the "Only One Super Admin" system rule.
- **Remediation Recommendation:**
  1. Add a MongoDB partial unique index in `user.model.js`:
     ```javascript
     userSchema.index(
       { role: 1 },
       { unique: true, partialFilterExpression: { role: ROLES.SUPER_ADMIN } }
     );
     ```
  2. Perform an atomic database operation or transaction during initial setup.

---

### 🔴 FINDING SEC-02: Hardcoded Fallback Developer Secret Key
- **Affected File:** `server/src/modules/auth/auth.controller.js` (lines 51, 128)
- **Vulnerability Class:** CWE-798: Use of Hardcoded Credentials
- **Severity:** **HIGH**
- **Clue & Root Cause:**
  ```javascript
  const expectedKey = process.env.DEVELOPER_SETUP_KEY || 'aeterna_dev_secret_key_2026_super_admin_setup';
  ```
  If an operator deploys the backend container to Docker/Kubernetes/Staging and forgets to supply `DEVELOPER_SETUP_KEY` in environment variables, the system silently uses the plain-text string `'aeterna_dev_secret_key_2026_super_admin_setup'`.
  This contradicts Rule 1 and the Fail-Closed security standard established in `P0-SEC-003` for `JWT_SECRET`.
- **Attack Path:**
  1. An attacker checks public git commits or leaked repository source.
  2. Attacker probes the deployment: `POST /api/v1/auth/setup-super-admin` with header `x-developer-key: aeterna_dev_secret_key_2026_super_admin_setup`.
  3. If environment variable was omitted, attacker instantly provisions themselves as the Supreme Commander.
- **Remediation Recommendation:**
  Enforce fail-closed validation:
  ```javascript
  const expectedKey = process.env.DEVELOPER_SETUP_KEY;
  if (!expectedKey) {
    throw new ApiError(500, 'Server configuration error: DEVELOPER_SETUP_KEY is not configured.');
  }
  ```

---

### 🔴 FINDING SEC-03: Lack of Account-Level Brute-Force Lockout
- **Affected File:** `server/src/modules/auth/auth.controller.js` (lines 83–124) & `server/src/modules/users/user.model.js`
- **Vulnerability Class:** CWE-307: Improper Restriction of Excessive Authentication Attempts
- **Severity:** **HIGH**
- **Clue & Root Cause:**
  Rate limiting on `/login` (`authLimiter`) is tied strictly to the client IP address (`10 req / 15 min`).
  The `User` document contains **no state tracking failed logins** (e.g. `failedLoginAttempts`, `lockUntil`, or last failed timestamp).
- **Attack Path:**
  1. An attacker targets an executive email (e.g. `admin@aeterna.com`).
  2. The attacker uses a distributed proxy network (Tor, AWS Lambda proxies, or residential VPNs with 2,000 distinct IP addresses).
  3. Each IP sends 9 login guesses (just below the 10-attempt threshold).
  4. The attacker executes **18,000 password guesses** against `admin@aeterna.com` in a 15-minute window without triggering IP rate limits and without the targeted account ever being locked.
- **Remediation Recommendation:**
  Add account-level security fields to `user.model.js`:
  - `failedLoginAttempts: { type: Number, default: 0 }`
  - `lockUntil: { type: Date }`
  - Temporarily lock an account for 15 minutes after 5 consecutive failed password attempts.

---

### 🟡 FINDING SEC-04: Stateless Zombie JWT Sessions Post-Logout
- **Affected File:** `server/src/modules/auth/auth.controller.js` (lines 143–159) & `server/src/middleware/authMiddleware.js`
- **Vulnerability Class:** CWE-613: Insufficient Session Expiration
- **Severity:** **MEDIUM-HIGH**
- **Clue & Root Cause:**
  When a user logs out (`POST /api/v1/auth/logout`), the controller only calls `res.clearCookie('accessToken')` and `res.clearCookie('refreshToken')`.
  `authMiddleware.js` verifies incoming Bearer tokens statelessly using `jwt.verify(token, jwtSecret)` and checks `user.isActive`.
- **Attack Path:**
  1. A user logs in from a shared computer or their JWT access token is intercepted via network logging or browser extension.
  2. The user clicks "Logout". Their browser deletes the cookie.
  3. The attacker re-submits the intercepted JWT access token via `Authorization: Bearer <token>`.
  4. The server accepts the token and permits full API access for the remaining duration of the 24-hour token lifetime (`JWT.ACCESS_EXPIRES_IN = '1d'`).
- **Remediation Recommendation:**
  1. Introduce a `tokenVersion: { type: Number, default: 0 }` in the User model.
  2. Embed `tokenVersion` in the JWT payload.
  3. On logout or password change, increment `tokenVersion`, instantly invalidating all outstanding tokens.

---

### 🟡 FINDING SEC-05: Payload Shield Content-Type Bypass
- **Affected File:** `server/src/shield/payloadShield.js` (lines 14–37)
- **Vulnerability Class:** CWE-436: Interpretation Conflict / Incomplete Validation
- **Severity:** **MEDIUM**
- **Clue & Root Cause:**
  In `validateContentType`:
  ```javascript
  const contentLength = req.headers['content-length'];
  if (!contentLength || contentLength === '0') {
    return next();
  }

  const contentType = (req.headers['content-type'] || '').toLowerCase();
  if (!contentType) {
    return next();
  }
  ```
- **Attack Path:**
  1. **Case A (Omitted Content-Type):** An attacker sends a `POST` request with a payload and `Content-Length: 128`, but omits `Content-Type` entirely. `if (!contentType) return next()` executes, bypassing the shield.
  2. **Case B (Chunked Transfer Encoding):** An attacker sends `POST` with `Transfer-Encoding: chunked` and no `Content-Length`. `const contentLength` is `undefined`, so `if (!contentLength) return next()` triggers, skipping all Content-Type verification while streaming data.
- **Remediation Recommendation:**
  Enforce explicit Content-Type on any mutation request containing a body, regardless of chunked encoding:
  ```javascript
  const hasBody = req.headers['content-length'] || req.headers['transfer-encoding'];
  if (hasBody && !req.headers['content-type']) {
    return res.status(400).json({ success: false, message: 'Content-Type header is required for request payloads.' });
  }
  ```

---

### 🟡 FINDING SEC-06: Database CPU Starvation via Unindexed `$regex` Search
- **Affected File:** `server/src/modules/pipeline/pipeline.controller.js` (lines 48–63) & `server/src/modules/users/user.controller.js` (lines 27–39)
- **Vulnerability Class:** CWE-400: Uncontrolled Resource Consumption (Database Denial of Service)
- **Severity:** **MEDIUM**
- **Clue & Root Cause:**
  Both controllers implement search as follows:
  ```javascript
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  filter.$or = [
    { studentName: { $regex: escaped, $options: 'i' } },
    { email: { $regex: escaped, $options: 'i' } },
    { programme: { $regex: escaped, $options: 'i' } },
    { university: { $regex: escaped, $options: 'i' } },
    { destination: { $regex: escaped, $options: 'i' } },
  ];
  ```
  In MongoDB, substring regexes with leading wildcards and `$options: 'i'` **cannot utilize B-tree indexes**. MongoDB must perform a full collection scan (`COLLSCAN`), inspecting every document in the collection.
- **Attack Path:**
  1. An authenticated counsellor or external actor requests `GET /api/v1/pipeline?search=a` repeated 40 times concurrently.
  2. As pipeline records reach tens of thousands of rows, MongoDB CPU spikes to 100%, causing server thread pool starvation and 504 Gateway Timeouts across all branches.
- **Remediation Recommendation:**
  Implement MongoDB text indexes (`$text: { $search: term }`) or prefix-only matching (`^term`), and throttle search query frequency.

---

### 🟡 FINDING SEC-07: Concurrency Race Condition in Stage Transitions
- **Affected File:** `server/src/modules/pipeline/pipeline.controller.js` (lines 98–169)
- **Vulnerability Class:** Concurrency / Non-Atomic State Machine Transition
- **Severity:** **MEDIUM**
- **Clue & Root Cause:**
  `updateStage` executes:
  1. `student = await PipelineStudent.findById(id)`
  2. Performs business validations (e.g. `stage === 'application_submitted' && !student.documentsVerified`)
  3. `student.stage = stage`
  4. `await student.save()`
  Because `versionKey: false` is configured on the schema and no atomic predicate is used, concurrent requests operate on stale document states.
- **Attack Path:**
  1. Student documents are currently `unverified`.
  2. Counsellor A issues `PATCH /documents` to unverify documents.
  3. At the exact same time, Counsellor B issues `PATCH /stage` to move student to `Application Submitted`.
  4. If Counsellor B's read occurs before Counsellor A's save, Counsellor B's write can persist the student into `Application Submitted` without valid verified documents.
- **Remediation Recommendation:**
  Use atomic conditional updates:
  ```javascript
  const updated = await PipelineStudent.findOneAndUpdate(
    { _id: id, stage: previousStage, documentsVerified: true },
    { $set: { stage: newStage }, $push: { stageHistory: transition } },
    { new: true }
  );
  ```

---

### 🟡 FINDING SEC-08: Side-Channel Timing Attack on Developer Key
- **Affected File:** `server/src/modules/auth/auth.controller.js` (lines 53, 129)
- **Vulnerability Class:** CWE-208: Observable Timing Discrepancy
- **Severity:** **MEDIUM**
- **Clue & Root Cause:**
  ```javascript
  if (!devKey || devKey !== expectedKey)
  ```
  JavaScript's standard `!==` operator performs character-by-character comparison and terminates execution upon encountering the first non-matching byte.
- **Attack Path:**
  1. An attacker submits automated requests measuring round-trip network response times down to nanosecond/microsecond resolution.
  2. Variations in response latency allow the attacker to deduce individual characters of the secret key sequentially.
- **Remediation Recommendation:**
  Use Node.js crypto's constant-time comparison:
  ```javascript
  const crypto = require('crypto');
  function safeCompare(a, b) {
    if (!a || !b) return false;
    const bufA = Buffer.from(String(a));
    const bufB = Buffer.from(String(b));
    return bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB);
  }
  ```

---

### 🟢 FINDING SEC-09: Unthrottled Token Refresh Endpoint
- **Affected File:** `server/src/modules/auth/auth.routes.js` (line 17)
- **Vulnerability Class:** Rate Limiting Incompleteness
- **Severity:** **LOW**
- **Clue & Root Cause:**
  `authLimiter` (10 req / 15 min) was attached to `/login` and `/setup-super-admin`, but `/refresh` was left under the broad `globalLimiter` (100 req / 15 min):
  ```javascript
  router.post('/login', authLimiter, loginValidator, validate, login);
  router.post('/refresh', refresh);
  ```
- **Attack Path:**
  An attacker can flood `/refresh` with invalid refresh tokens, forcing the server to repeatedly execute cryptographic signature verification (`jwt.verify`) and database lookups without encountering strict rate-limiting.
- **Remediation Recommendation:**
  Attach a dedicated token refresh rate limiter (e.g. 20 req / 15 min).

---

### 🟢 FINDING SEC-10: Permissive Password Complexity Baseline
- **Affected File:** `server/src/modules/auth/auth.validator.js` (lines 18–22), `server/src/modules/auth/auth.controller.js` (lines 96–98), `server/src/modules/users/user.model.js` (lines 23–35)
- **Vulnerability Class:** Weak Password Policy
- **Severity:** **LOW**
- **Clue & Root Cause:**
  Previously, the validator and controller accepted passwords as short as 6 characters without requiring mixed case, digits, or symbols.
- **Remediation Implemented (Batch 4):**
  1. Created `server/src/utils/passwordPolicy.js` defining a unified standard: minimum 8 characters, maximum 128 characters, requiring at least one uppercase letter (`/[A-Z]/`), one numeric digit (`/[0-9]/`), and one special character (`/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/`).
  2. Applied policy across `registerValidator` (`auth.validator.js`), `setupSuperAdmin` (`auth.controller.js`), and `userSchema` (`user.model.js`).
  3. Preserved existing hashed bcrypt passwords without forced logouts or breaking existing test seeds.
  4. Passwords are never trimmed or silently modified prior to hashing.
- **Verification:** Verified by `batch4-security-hardening.test.js` (tests SEC-10.1 through SEC-10.7: PASS).

---

### 🟢 FINDING SEC-11: In-Memory Rate Limiter Reset on Clustering / Restart
- **Affected File:** `server/src/shield/rateLimiters.js`, `server/src/shield/shieldConfig.js`
- **Vulnerability Class:** Non-Distributed Rate Limiting State (Horizontal Scaling)
- **Severity:** **LOW**
- **Current Architecture:**
  - Standard single-instance In-Memory Rate Limiting powered by `express-rate-limit` v7 built-in `MemoryStore`.
  - Configured with module-specific thresholds (`authLimiter`: 10 req / 15 min, `refreshLimiter`: 20 req / 15 min, `globalLimiter`: 100 req / 15 min, `pipelineLimiter`: 120 req / 15 min).
  - Preserves standard headers (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`) and custom 429 JSON responses.
  - Sized appropriately and operating reliably for the target single-process internal team deployment (~25 users).
- **Documented Limitations in Current Architecture:**
  1. *Restart Volatility:* Rate limit counters reset when the Node.js server process restarts or redeploys.
  2. *Process Isolation:* Multiple workers (e.g. cluster mode or multiple pods) maintain independent memory spaces, multiplying allowed requests per IP by the number of instances.
- **Future Solution & Scalability Roadmap:**
  - Introduce Redis-backed distributed rate limiting (`rate-limit-redis` / `ioredis`) to centralize counters across multiple instances.
- **Migration Trigger:**
  - Deploying behind a load balancer with multiple backend instances, enabling PM2 cluster mode with multiple worker processes, or scaling horizontally across Kubernetes pods.
- **Status:** **DOCUMENTED / SCHEDULED FOR HORIZONTAL SCALING (Current in-memory implementation active and verified).**

---

## 🛡️ Remediation Status Summary (SEC-01 through SEC-11)

| ID | Title | Severity | Status | Batch | Verification Test Suite |
|---|---|---|---|---|---|
| **SEC-01** | Super Admin Provisioning Race Condition | HIGH | **RESOLVED** | Batch 1 | `batch1-security-hardening.test.js` |
| **SEC-02** | Hardcoded Fallback Developer Setup Secret | HIGH | **RESOLVED** | Batch 1 | `batch1-security-hardening.test.js` |
| **SEC-03** | Lack of Account-Level Brute-Force Lockout | HIGH | **RESOLVED** | Batch 1 | `batch1-security-hardening.test.js` |
| **SEC-04** | Stateless Zombie JWT Sessions Post-Logout | MEDIUM-HIGH | **RESOLVED** | Batch 2 | `batch2-security-hardening.test.js` |
| **SEC-05** | Payload Shield Content-Type Bypass | MEDIUM | **RESOLVED** | Batch 2 | `batch2-security-hardening.test.js` |
| **SEC-06** | Unindexed Pipeline Student Search Denial of Service | MEDIUM | **RESOLVED** | Batch 2 | `batch2-security-hardening.test.js` |
| **SEC-07** | Concurrency Race Condition in Stage Transitions | MEDIUM | **RESOLVED** | Batch 3 | `batch3-security-hardening.test.js` |
| **SEC-08** | Side-Channel Timing Attack on Developer Key | MEDIUM | **RESOLVED** | Batch 1 & 3 | `batch1-security-hardening.test.js`, `batch3-security-hardening.test.js` |
| **SEC-09** | Unthrottled Token Refresh Endpoint | LOW | **RESOLVED** | Batch 3 | `batch3-security-hardening.test.js` |
| **SEC-10** | Permissive Password Complexity Baseline | LOW | **RESOLVED** | Batch 4 | `batch4-security-hardening.test.js` |
| **SEC-11** | In-Memory Rate Limiter Reset on Clustering / Restart | LOW | **FUTURE ROADMAP (In-Memory Active)** | Batch 4 | Documented Architecture & `batch4-security-hardening.test.js` |

---

## 🛡️ Recommended Hardening Roadmap

```mermaid
flowchart TD
    subgraph Priority_1["Priority 1: Immediate Security Defenses"]
        P1_A["1. Add MongoDB Partial Unique Index for Super Admin role"]
        P1_B["2. Enforce Fail-Closed validation on DEVELOPER_SETUP_KEY (no fallback)"]
        P1_C["3. Constant-time comparison (crypto.timingSafeEqual) for developer keys"]
    end

    subgraph Priority_2["Priority 2: Authentication & Pipeline Resilience"]
        P2_A["4. Add account-level lockout (5 failed attempts -> 15 min lock)"]
        P2_B["5. Token versioning / revoking on logout (eliminate zombie JWTs)"]
        P2_C["6. Atomic conditional updates in updateStage (concurrency guard)"]
    end

    subgraph Priority_3["Priority 3: Scalability & Operational Defense"]
        P3_A["7. MongoDB Text Indexes for Pipeline & User search (kill COLLSCAN)"]
        P3_B["8. Strict Content-Type check for chunked / omitted payloads"]
        P3_C["9. Redis-backed distributed rate limiting for horizontal clusters"]
    end

    Priority_1 --> Priority_2 --> Priority_3
```

---

## 📜 Audit Attestation

This vulnerability report reflects the actual operational state of the Phase 1 codebase as of **17 November 2026**. Per user request, **no code modifications have been made**. Engineering leadership can review these findings and approve remediation during scheduled maintenance or Phase B sprint cycles.

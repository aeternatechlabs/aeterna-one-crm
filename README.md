# 🎓 AETERNA ONE CRM — Production Architecture & Initial Setup

A branch-aware, multi-tenant Overseas Education CRM built for **Aeterna Education Consultancy** (Bengaluru, Mysuru, Belagavi).

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React.js (Vite, React Router v7, Context API, Axios)
- **Backend**: Node.js & Express.js
- **Database**: MongoDB with Mongoose ODM
- **Custom Backend Package**: [`devil-backend-nodejs`](https://www.npmjs.com/package/devil-backend-nodejs) (v4.1.0)
- **Companion Frontend Package**: [`devil-frontend`](https://www.npmjs.com/package/devil-frontend) (v1.0.4)

---

## 📦 `devil-backend-nodejs` Package Integration

The backend is built around the custom [`devil-backend-nodejs`](https://www.npmjs.com/package/devil-backend-nodejs) package, utilizing its core utilities directly:

1. **`asyncHandler`**: Standard wrapper for all asynchronous controller actions.
2. **`ApiError`**: Standardized application error class with auto-detection of status codes and validation errors.
3. **`ApiResponse`**: Standardized JSON response formatting across all endpoints.
4. **`validateEnv`**: Validates mandatory environment variables at server boot (`PORT`, `MONGO_URI`, `JWT_SECRET`).
5. **`paginate` & `calculatePagination`**: Database pagination utility for query handling.
6. **`generateAccessToken` & `setTokenCookies`**: JWT access and refresh token generation with HTTP-only cookie support.
7. **`exclude`, `pick`, `isEmptyObject`**: Object sanitization utilities for secure user data responses.

---

## 📁 Repository Structure

```text
aeterna-one-crm/
├── package.json                          # Root development scripts
├── .gitignore                            # Root git ignore rules
├── README.md                             # Setup & architecture documentation
├── Aeterna_One_CRM_Phase_Wise_Plan.md    # 90-day phase-wise roadmap
├── Aeterna_Overseas_CRM_Prototype.html   # High-end interactive prototype
│
├── server/                               # Node.js + Express + MongoDB Backend
│   ├── .env                              # Development environment variables
│   ├── .env.example                      # Environment template
│   ├── package.json                      # Backend dependencies & scripts
│   └── src/
│       ├── app.js                        # Express application configuration
│       ├── server.js                     # HTTP server startup & MongoDB connect
│       ├── config/
│       │   ├── constants.js              # Roles, Branches, JWT & Rate limits
│       │   └── db.js                     # Mongoose connection & lifecycle
│       ├── middleware/
│       │   ├── authMiddleware.js         # JWT verification (protect)
│       │   ├── roleMiddleware.js         # Role-Based Access Control (requireRole)
│       │   ├── branchMiddleware.js       # Branch-level isolation (requireBranchAccess)
│       │   ├── validateMiddleware.js     # express-validator result handler
│       │   └── errorHandlerMiddleware.js # Centralized global error handler
│       ├── modules/
│       │   ├── auth/                     # Authentication (login, register, me, logout)
│       │   ├── users/                    # User model & staff directory
│       │   └── health/                   # Diagnostic health-check endpoint
│       ├── routes/
│       │   └── v1.js                     # Version 1 route aggregator (/api/v1)
│       └── utils/
│           └── devilWrapper.js           # Safe adapter for devil-backend-nodejs
│
└── client/                               # React.js (Vite) Frontend
    ├── .env                              # Frontend environment variables
    ├── .env.example                      # Frontend environment template
    ├── package.json                      # Client dependencies & scripts
    ├── vite.config.js                    # Vite configuration & proxy settings
    ├── index.html                        # Application entry HTML
    └── src/
        ├── main.jsx                      # React 19 root bootstrap
        ├── App.jsx                       # Providers & top-level router
        ├── index.css                     # Brand typography & layout styles
        ├── config/
        │   └── constants.js              # Roles, Branches & Nav item definitions
        ├── context/
        │   └── AuthContext.jsx           # Global authentication state & helpers
        ├── services/
        │   ├── api.js                    # Axios instance with interceptors
        │   └── auth.service.js           # Auth & health API calls
        ├── components/
        │   ├── auth/
        │   │   └── ProtectedRoute.jsx    # Auth & role-guarded route wrapper
        │   ├── common/
        │   │   ├── Button.jsx            # Reusable button with variants
        │   │   ├── Input.jsx             # Reusable form field
        │   │   ├── Badge.jsx             # Status, role & branch badges
        │   │   └── LoadingSpinner.jsx    # Async loading indicator
        │   └── layout/
        │       ├── AppLayout.jsx         # Layout container shell
        │       ├── Sidebar.jsx           # Role-filtered navigation sidebar
        │       └── Header.jsx            # Top bar with user profile & logout
        ├── pages/
        │   ├── LoginPage.jsx             # Secure staff login interface
        │   ├── DashboardPage.jsx         # Foundation dashboard & live health diagnostics
        │   ├── UnauthorizedPage.jsx      # 403 Access Forbidden page
        │   └── NotFoundPage.jsx          # 404 Route Not Found page
        └── routes/
            └── AppRoutes.jsx             # React Router routing configuration
```

---

## 👥 Roles & Branch Isolation

### Configured Roles
1. **`super_admin`** (Founder / Super Admin): Global access across all branches, settings, and integrations.
2. **`branch_manager`** (Branch Manager): Manages leads, staff, and operations for their assigned branch.
3. **`counsellor`** (Education Counsellor): Accesses assigned student profiles, pipeline, and tasks.
4. **`marketing`** (Marketing Lead): Manages acquisition channels, campaigns, and enquiries.
5. **`application_officer`** (Application Officer): Handles university submissions and documents.

### Operating Branches
- **`bengaluru`**: Central operations / HQ
- **`mysuru`**: Regional branch hub
- **`belagavi`**: North Karnataka regional branch hub
- **`all`**: Cross-branch visibility (reserved for Super Admins)

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v18+` (Tested on `v22.23.4`)
- **npm**: `v10+` (Tested on `v10.9.9`)
- **MongoDB**: Local MongoDB instance (`mongodb://127.0.0.1:27017/aeterna_one_crm`) or MongoDB Atlas URI

### 2. Environment Setup

**Backend (`server/.env`):**
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/aeterna_one_crm
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

**Frontend (`client/.env`):**
```env
VITE_API_BASE_URL=/api/v1
VITE_APP_TITLE=Aeterna One CRM
```

### 3. Running the Backend

```bash
cd server
npm run dev
```

Server listens on `http://localhost:5000`.
- Health check: `GET http://localhost:5000/health`
- API Base: `http://localhost:5000/api/v1`

### 4. Running the Frontend

```bash
cd client
npm run dev
```

Client runs on `http://localhost:3000` with automated proxy to backend on `/api` and `/health`.

### 5. Running from Root

```bash
# Start backend
npm run dev:server

# Start frontend
npm run dev:client

# Build frontend for production
npm run build:client
```

---

## 📡 Core API Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Diagnostic system health check | No |
| `GET` | `/api/v1/health` | Versioned system health check | No |
| `POST` | `/api/v1/auth/register` | Register new staff user | No / Admin |
| `POST` | `/api/v1/auth/login` | Authenticate staff user | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated profile | Bearer / Cookie |
| `POST` | `/api/v1/auth/logout` | Clear session cookies | Bearer / Cookie |
| `GET` | `/api/v1/users` | List staff directory (branch-filtered) | `super_admin`, `branch_manager` |

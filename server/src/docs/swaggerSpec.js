module.exports = {
  "openapi": "3.0.0",
  "info": {
    "title": "Aeterna One CRM — Interactive API Explorer",
    "version": "1.0.0",
    "description": "### 🌟 Aeterna One CRM Production API Documentation & Live Testing Sandbox\nWelcome to the interactive Swagger UI for **Aeterna One CRM** (Bengaluru, Mysuru, Belagavi).\n\n#### 🛡️ How to Authenticate & Test APIs:\n1. Open the **Auth** section below and execute `POST /api/v1/auth/login` with your credentials.\n2. Copy the returned `token` from the response JSON.\n3. Click the green **Authorize 🔓** button at the top right of this page.\n4. Paste the token into the **bearerAuth** box and click **Authorize**.\n5. All authorized endpoints will now automatically send your `Bearer <token>` and authenticate seamlessly!",
    "contact": {
      "name": "Aeterna One CRM Engineering Team",
      "email": "tech@aeterna.one"
    }
  },
  "servers": [
    {
      "url": "{baseUrl}",
      "description": "Custom Target API URL (Type or paste any URL below)",
      "variables": {
        "baseUrl": {
          "default": "/api/v1",
          "description": "Type any custom API base URL to test"
        }
      }
    },
    {
      "url": "/api/v1",
      "description": "Default Relative Path (/api/v1)"
    }
  ],
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "Enter your JWT token (e.g. from /auth/login)"
      },
      "cookieAuth": {
        "type": "apiKey",
        "in": "cookie",
        "name": "accessToken",
        "description": "HTTP-only Session cookie accessToken"
      }
    }
  },
  "security": [
    {
      "bearerAuth": []
    },
    {
      "cookieAuth": []
    }
  ],
  "tags": [
    {
      "name": "Health",
      "description": "System health & MongoDB Atlas connectivity diagnostics"
    },
    {
      "name": "Auth",
      "description": "Authentication, token refresh, OTP password recovery, and RBAC matrix"
    },
    {
      "name": "Employees",
      "description": "Staff directory, role assignments, trash vault, and permanent purge (Super Admin)"
    },
    {
      "name": "Institutions",
      "description": "Global university directory, program courses, and country statistics"
    },
    {
      "name": "Leads",
      "description": "Lead ingestion, pipeline status updates, and candidate conversion"
    },
    {
      "name": "Pipelines",
      "description": "Kanban board stages, progression, and funnel tracking"
    },
    {
      "name": "Students",
      "description": "Student 360 profiles, academics, test scores, and visa applications"
    },
    {
      "name": "Document Vault",
      "description": "Signed Cloudflare R2 preview/download URLs, upload intents, verification gates"
    },
    {
      "name": "Tasks",
      "description": "Daily 25-task counsellor queue, reach-out logs, and follow-up completion"
    },
    {
      "name": "Reports",
      "description": "Executive KPIs, counsellor conversion performance, and branch scorecards"
    },
    {
      "name": "Settings",
      "description": "Cloudflare R2 storage credentials, Brevo email tests, and environment status"
    },
    {
      "name": "Communications",
      "description": "Template management, WhatsApp, and Brevo transactional dispatch"
    },
    {
      "name": "Notifications",
      "description": "In-app alert dispatch, read status tracking, and mark all read"
    }
  ],
  "paths": {
    "/health": {
      "get": {
        "tags": [
          "Health"
        ],
        "summary": "Root System Health Check",
        "description": "Verifies server uptime, system version, and MongoDB connection status.",
        "security": [],
        "responses": {
          "200": {
            "description": "System healthy",
            "content": {
              "application/json": {
                "example": {
                  "status": "healthy",
                  "database": "connected"
                }
              }
            }
          }
        }
      }
    },
    "/auth/login": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Login to CRM (Returns JWT and Session Cookie)",
        "description": "Authenticates user and returns an accessToken with user profile and branch scope.",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "password"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "example": "superadmin@aeterna.one"
                  },
                  "password": {
                    "type": "string",
                    "example": "Admin@123456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Login successful"
          },
          "401": {
            "description": "Invalid email or password"
          }
        }
      }
    },
    "/auth/me": {
      "get": {
        "tags": [
          "Auth"
        ],
        "summary": "Get Authenticated User Profile",
        "description": "Returns profile details, role, permissions, and branch assignments of current session.",
        "responses": {
          "200": {
            "description": "Profile retrieved successfully"
          },
          "401": {
            "description": "Unauthorized"
          }
        }
      }
    },
    "/auth/refresh": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Refresh Access Token",
        "description": "Uses refresh token from cookies to generate a new short-lived access token.",
        "security": [],
        "responses": {
          "200": {
            "description": "New token generated"
          },
          "401": {
            "description": "Refresh token invalid or expired"
          }
        }
      }
    },
    "/auth/logout": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Logout User",
        "description": "Clears HTTP-only session cookies and revokes active session.",
        "responses": {
          "200": {
            "description": "Logged out successfully"
          }
        }
      }
    },
    "/auth/forgot-password": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Step 1: Request 6-Digit Password Reset OTP",
        "description": "Dispatches a 6-digit OTP code to the registered email address.",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "example": "counsellor@aeterna.one"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP dispatched successfully"
          }
        }
      }
    },
    "/auth/verify-reset-otp": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Step 2: Verify Password Reset OTP",
        "description": "Verifies the 6-digit OTP code and returns a short-lived resetToken.",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "email",
                  "otp"
                ],
                "properties": {
                  "email": {
                    "type": "string",
                    "example": "counsellor@aeterna.one"
                  },
                  "otp": {
                    "type": "string",
                    "example": "123456"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "OTP verified"
          }
        }
      }
    },
    "/auth/reset-password": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Step 3: Set New Password",
        "description": "Applies new password using verified resetToken.",
        "security": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "resetToken",
                  "newPassword"
                ],
                "properties": {
                  "resetToken": {
                    "type": "string",
                    "example": "jwt_reset_token_here"
                  },
                  "newPassword": {
                    "type": "string",
                    "example": "NewSecret@123"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Password reset successful"
          }
        }
      }
    },
    "/auth/permissions-matrix": {
      "get": {
        "tags": [
          "Auth"
        ],
        "summary": "Get Authoritative RBAC Permissions Matrix",
        "description": "Returns the full system permission table for all 5 roles.",
        "responses": {
          "200": {
            "description": "Matrix retrieved"
          }
        }
      }
    },
    "/auth/check-permission": {
      "post": {
        "tags": [
          "Auth"
        ],
        "summary": "Verify Single Permission for Current Role",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "action"
                ],
                "properties": {
                  "action": {
                    "type": "string",
                    "example": "leads.delete"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Permission evaluation result"
          }
        }
      }
    },
    "/employees": {
      "get": {
        "tags": [
          "Employees"
        ],
        "summary": "List All Employees (Super Admin only)",
        "parameters": [
          {
            "name": "role",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Filter by role"
          },
          {
            "name": "branch",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "Filter by branch"
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 20
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Employee list"
          },
          "403": {
            "description": "Forbidden (Requires Super Admin)"
          }
        }
      },
      "post": {
        "tags": [
          "Employees"
        ],
        "summary": "Create New Employee / Staff Member",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "email",
                  "password",
                  "role",
                  "branch"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "example": "Priya Sharma"
                  },
                  "email": {
                    "type": "string",
                    "example": "priya.s@aeterna.one"
                  },
                  "password": {
                    "type": "string",
                    "example": "StaffPass@2026"
                  },
                  "role": {
                    "type": "string",
                    "enum": [
                      "super_admin",
                      "branch_manager",
                      "counsellor",
                      "application_officer",
                      "marketing"
                    ],
                    "example": "counsellor"
                  },
                  "branch": {
                    "type": "string",
                    "enum": [
                      "bengaluru",
                      "mysuru",
                      "belagavi"
                    ],
                    "example": "bengaluru"
                  },
                  "phone": {
                    "type": "string",
                    "example": "+91 9876543210"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Employee created"
          }
        }
      }
    },
    "/employees/trash": {
      "get": {
        "tags": [
          "Employees"
        ],
        "summary": "Get Soft-Deleted Employees in Trash Vault",
        "responses": {
          "200": {
            "description": "Trashed employees"
          }
        }
      }
    },
    "/employees/{id}": {
      "get": {
        "tags": [
          "Employees"
        ],
        "summary": "Get Single Employee Profile by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Employee details"
          }
        }
      },
      "put": {
        "tags": [
          "Employees"
        ],
        "summary": "Update Employee Details",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name": {
                    "type": "string"
                  },
                  "phone": {
                    "type": "string"
                  },
                  "branch": {
                    "type": "string"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Employee updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Employees"
        ],
        "summary": "Soft Delete Employee (Move to Trash Vault)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Employee soft-deleted"
          }
        }
      }
    },
    "/employees/{id}/status": {
      "patch": {
        "tags": [
          "Employees"
        ],
        "summary": "Toggle Employee Active/Inactive Status",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Status updated"
          }
        }
      }
    },
    "/employees/{id}/restore": {
      "post": {
        "tags": [
          "Employees"
        ],
        "summary": "Restore Soft-Deleted Employee from Trash",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Employee restored"
          }
        }
      }
    },
    "/employees/{id}/permanent": {
      "delete": {
        "tags": [
          "Employees"
        ],
        "summary": "Permanent Purge Employee (Cannot be undone)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Employee permanently purged"
          }
        }
      }
    },
    "/institutions": {
      "get": {
        "tags": [
          "Institutions"
        ],
        "summary": "Search & List Global Partner Institutions",
        "parameters": [
          {
            "name": "country",
            "in": "query",
            "schema": {
              "type": "string"
            },
            "description": "e.g. UK, USA, Canada, Germany"
          },
          {
            "name": "search",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Institutions list"
          }
        }
      },
      "post": {
        "tags": [
          "Institutions"
        ],
        "summary": "Create Global Partner Institution",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "name",
                  "country",
                  "city"
                ],
                "properties": {
                  "name": {
                    "type": "string",
                    "example": "University of Manchester"
                  },
                  "country": {
                    "type": "string",
                    "example": "United Kingdom"
                  },
                  "city": {
                    "type": "string",
                    "example": "Manchester"
                  },
                  "ranking": {
                    "type": "integer",
                    "example": 28
                  },
                  "intakes": {
                    "type": "array",
                    "items": {
                      "type": "string"
                    },
                    "example": [
                      "September",
                      "January"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Institution created"
          }
        }
      }
    },
    "/institutions/stats": {
      "get": {
        "tags": [
          "Institutions"
        ],
        "summary": "Get Country & Tier Distribution Statistics",
        "responses": {
          "200": {
            "description": "Stats retrieved"
          }
        }
      }
    },
    "/institutions/{id}": {
      "get": {
        "tags": [
          "Institutions"
        ],
        "summary": "Get Single Institution Details by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Institution details"
          }
        }
      },
      "put": {
        "tags": [
          "Institutions"
        ],
        "summary": "Update Institution Information",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Institution updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Institutions"
        ],
        "summary": "Delete Institution",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Institution deleted"
          }
        }
      }
    },
    "/leads": {
      "get": {
        "tags": [
          "Leads"
        ],
        "summary": "Query Leads with Role & Branch Scoping",
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "source",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "counsellorId",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "page",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 1
            }
          },
          {
            "name": "limit",
            "in": "query",
            "schema": {
              "type": "integer",
              "default": 25
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Leads list"
          }
        }
      },
      "post": {
        "tags": [
          "Leads"
        ],
        "summary": "Ingest New Candidate Lead",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "firstName",
                  "lastName",
                  "phone",
                  "targetCountry"
                ],
                "properties": {
                  "firstName": {
                    "type": "string",
                    "example": "Rohan"
                  },
                  "lastName": {
                    "type": "string",
                    "example": "Verma"
                  },
                  "phone": {
                    "type": "string",
                    "example": "+91 9988776655"
                  },
                  "email": {
                    "type": "string",
                    "example": "rohan.v@gmail.com"
                  },
                  "targetCountry": {
                    "type": "string",
                    "example": "United Kingdom"
                  },
                  "targetDegree": {
                    "type": "string",
                    "example": "MSc Data Science"
                  },
                  "leadSource": {
                    "type": "string",
                    "example": "Meta Ads"
                  },
                  "branch": {
                    "type": "string",
                    "example": "bengaluru"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Lead created"
          }
        }
      }
    },
    "/leads/stats": {
      "get": {
        "tags": [
          "Leads"
        ],
        "summary": "Get Branch & Lead Conversion Funnel Stats",
        "responses": {
          "200": {
            "description": "Lead stats"
          }
        }
      }
    },
    "/leads/{id}": {
      "get": {
        "tags": [
          "Leads"
        ],
        "summary": "Get Lead by ID",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Lead details"
          }
        }
      },
      "put": {
        "tags": [
          "Leads"
        ],
        "summary": "Update Lead Information",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Lead updated"
          }
        }
      },
      "delete": {
        "tags": [
          "Leads"
        ],
        "summary": "Delete Lead (Super Admin & Branch Manager only)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Lead deleted"
          },
          "403": {
            "description": "Forbidden for Counsellors"
          }
        }
      }
    },
    "/leads/{id}/status": {
      "patch": {
        "tags": [
          "Leads"
        ],
        "summary": "Update Lead Call Disposition & Status",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "status"
                ],
                "properties": {
                  "status": {
                    "type": "string",
                    "example": "contacted"
                  },
                  "dispositionNotes": {
                    "type": "string",
                    "example": "Candidate interested in UK Fall 2026"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Status updated"
          }
        }
      }
    },
    "/leads/{id}/convert": {
      "post": {
        "tags": [
          "Leads"
        ],
        "summary": "Convert Qualified Lead into Active Student Profile",
        "description": "Converts lead into Student 360 entity and initializes pipeline track.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Converted to student"
          }
        }
      }
    },
    "/pipeline": {
      "get": {
        "tags": [
          "Pipelines"
        ],
        "summary": "Get Kanban Board Columns & Stage Cards",
        "parameters": [
          {
            "name": "branch",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "counsellorId",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Pipeline cards grouped by stages"
          }
        }
      }
    },
    "/pipeline/dashboard-summary": {
      "get": {
        "tags": [
          "Pipelines"
        ],
        "summary": "Get Pipeline Stage Totals & Value Summary",
        "responses": {
          "200": {
            "description": "Summary metrics"
          }
        }
      }
    },
    "/pipeline/{id}/stage": {
      "patch": {
        "tags": [
          "Pipelines"
        ],
        "summary": "Transition Candidate to Next Pipeline Stage",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "targetStage"
                ],
                "properties": {
                  "targetStage": {
                    "type": "string",
                    "example": "document_collection"
                  },
                  "notes": {
                    "type": "string",
                    "example": "All academic transcripts received"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Stage updated"
          }
        }
      }
    },
    "/students": {
      "get": {
        "tags": [
          "Students"
        ],
        "summary": "List Student Profiles with Filters",
        "parameters": [
          {
            "name": "stage",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "country",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Students list"
          }
        }
      }
    },
    "/students/{id}": {
      "get": {
        "tags": [
          "Students"
        ],
        "summary": "Get Full Student 360 Record",
        "description": "Fetches student profile, academics, test scores, financials, applications, and documents.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Student 360 record"
          }
        }
      },
      "patch": {
        "tags": [
          "Students"
        ],
        "summary": "Update Student Profile Fields",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Student updated"
          }
        }
      }
    },
    "/students/{id}/academics": {
      "post": {
        "tags": [
          "Students"
        ],
        "summary": "Add Academic Record (10th, 12th, Bachelor degree)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "level",
                  "institution",
                  "percentageOrGpa",
                  "yearOfPassing"
                ],
                "properties": {
                  "level": {
                    "type": "string",
                    "example": "Undergraduate"
                  },
                  "institution": {
                    "type": "string",
                    "example": "Bangalore University"
                  },
                  "percentageOrGpa": {
                    "type": "string",
                    "example": "8.4 CGPA"
                  },
                  "yearOfPassing": {
                    "type": "integer",
                    "example": 2025
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Academics recorded"
          }
        }
      }
    },
    "/students/{id}/test-scores": {
      "post": {
        "tags": [
          "Students"
        ],
        "summary": "Add IELTS / TOEFL / GRE / GMAT Test Score",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "testType",
                  "overallScore"
                ],
                "properties": {
                  "testType": {
                    "type": "string",
                    "example": "IELTS"
                  },
                  "overallScore": {
                    "type": "string",
                    "example": "7.5"
                  },
                  "subScores": {
                    "type": "object",
                    "example": {
                      "listening": 8,
                      "reading": 7.5,
                      "writing": 7,
                      "speaking": 7.5
                    }
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Test score recorded"
          }
        }
      }
    },
    "/students/{id}/applications": {
      "post": {
        "tags": [
          "Students"
        ],
        "summary": "File University Application for Candidate",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "institutionName",
                  "courseName",
                  "intake"
                ],
                "properties": {
                  "institutionName": {
                    "type": "string",
                    "example": "University of Birmingham"
                  },
                  "courseName": {
                    "type": "string",
                    "example": "MSc Computer Science"
                  },
                  "intake": {
                    "type": "string",
                    "example": "Sept 2026"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Application filed"
          }
        }
      }
    },
    "/students/{id}/vault": {
      "get": {
        "tags": [
          "Document Vault"
        ],
        "summary": "List All Documents in Candidate Vault",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Vault documents"
          }
        }
      }
    },
    "/students/{id}/vault/upload-intent": {
      "post": {
        "tags": [
          "Document Vault"
        ],
        "summary": "Generate Signed Direct-to-Cloud Upload URL (Cloudflare R2)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "fileName",
                  "category",
                  "mimeType"
                ],
                "properties": {
                  "fileName": {
                    "type": "string",
                    "example": "Passport_Scan.pdf"
                  },
                  "category": {
                    "type": "string",
                    "example": "passport"
                  },
                  "mimeType": {
                    "type": "string",
                    "example": "application/pdf"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Presigned upload URL"
          }
        }
      }
    },
    "/students/{id}/vault/{docId}/preview": {
      "get": {
        "tags": [
          "Document Vault"
        ],
        "summary": "Get Short-Lived Signed Inline Preview URL (15 min expiry)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "docId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Signed preview URL generated"
          }
        }
      }
    },
    "/students/{id}/vault/{docId}/download": {
      "get": {
        "tags": [
          "Document Vault"
        ],
        "summary": "Get Signed Download URL (Forces Attachment Download)",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "docId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Signed download URL generated"
          }
        }
      }
    },
    "/students/{id}/vault/{docId}/verify": {
      "patch": {
        "tags": [
          "Document Vault"
        ],
        "summary": "Verify or Reject Document (Gatekeeper only)",
        "description": "Application Officer and Branch Manager exclusive gate. If rejected, audit reason is required.",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "docId",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "verificationStatus"
                ],
                "properties": {
                  "verificationStatus": {
                    "type": "string",
                    "enum": [
                      "verified",
                      "rejected"
                    ],
                    "example": "verified"
                  },
                  "rejectionReason": {
                    "type": "string",
                    "example": "Page 2 signature is missing"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Verification status updated"
          },
          "403": {
            "description": "Forbidden for Counsellors"
          }
        }
      }
    },
    "/tasks/daily-queue": {
      "get": {
        "tags": [
          "Tasks"
        ],
        "summary": "Get Counsellor Daily 25-Task Queue (Prioritized Follow-ups)",
        "responses": {
          "200": {
            "description": "Queue retrieved"
          }
        }
      }
    },
    "/tasks": {
      "get": {
        "tags": [
          "Tasks"
        ],
        "summary": "List All Tasks",
        "parameters": [
          {
            "name": "status",
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "priority",
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "Tasks list"
          }
        }
      },
      "post": {
        "tags": [
          "Tasks"
        ],
        "summary": "Create Follow-up Task",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "title",
                  "dueDate",
                  "leadId"
                ],
                "properties": {
                  "title": {
                    "type": "string",
                    "example": "Call candidate to confirm offer acceptance"
                  },
                  "dueDate": {
                    "type": "string",
                    "example": "2026-11-25T10:00:00.000Z"
                  },
                  "priority": {
                    "type": "string",
                    "enum": [
                      "high",
                      "medium",
                      "low"
                    ],
                    "example": "high"
                  },
                  "leadId": {
                    "type": "string",
                    "example": "lead_id_here"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Task created"
          }
        }
      }
    },
    "/tasks/{id}/complete": {
      "post": {
        "tags": [
          "Tasks"
        ],
        "summary": "Mark Task as Completed with Follow-up Outcome",
        "parameters": [
          {
            "name": "id",
            "in": "path",
            "required": true,
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "outcomeNotes": {
                    "type": "string",
                    "example": "Spoke with candidate, document submission confirmed."
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Task completed"
          }
        }
      }
    },
    "/reports/overview": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Executive Overview Dashboard Metrics (Super Admin)",
        "responses": {
          "200": {
            "description": "Executive metrics"
          },
          "403": {
            "description": "Forbidden"
          }
        }
      }
    },
    "/reports/branch-scorecards": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Branch Performance Scorecards (Bengaluru, Mysuru, Belagavi)",
        "responses": {
          "200": {
            "description": "Branch scorecards"
          }
        }
      }
    },
    "/reports/counsellor-performance": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Counsellor Conversion & Activity Leaderboard",
        "responses": {
          "200": {
            "description": "Performance metrics"
          }
        }
      }
    },
    "/reports/funnel": {
      "get": {
        "tags": [
          "Reports"
        ],
        "summary": "Full Candidate Stage Conversion Funnel",
        "responses": {
          "200": {
            "description": "Funnel analytics"
          }
        }
      }
    },
    "/settings/integrations": {
      "get": {
        "tags": [
          "Settings"
        ],
        "summary": "Inspect Cloud Integration Status (R2 Storage, Brevo, Meta)",
        "responses": {
          "200": {
            "description": "Integration status"
          },
          "403": {
            "description": "Super Admin only"
          }
        }
      }
    },
    "/settings/test-email": {
      "post": {
        "tags": [
          "Settings"
        ],
        "summary": "Dispatch Test Email via Brevo API",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": [
                  "recipientEmail"
                ],
                "properties": {
                  "recipientEmail": {
                    "type": "string",
                    "example": "admin@aeterna.one"
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Test email sent"
          }
        }
      }
    },
    "/settings/test-storage": {
      "post": {
        "tags": [
          "Settings"
        ],
        "summary": "Test Cloudflare R2 S3-Compatible Storage Connectivity",
        "responses": {
          "200": {
            "description": "Storage test passed"
          }
        }
      }
    },
    "/notifications": {
      "get": {
        "tags": [
          "Notifications"
        ],
        "summary": "Get Unread In-App Notifications for Current User",
        "responses": {
          "200": {
            "description": "Notifications list"
          }
        }
      }
    },
    "/notifications/mark-all-read": {
      "post": {
        "tags": [
          "Notifications"
        ],
        "summary": "Mark All Notifications as Read",
        "responses": {
          "200": {
            "description": "Notifications updated"
          }
        }
      }
    }
  }
};

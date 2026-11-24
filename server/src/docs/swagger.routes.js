const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerSpec');

const router = express.Router();

// Premium Developer Dashboard Theme for Aeterna One CRM
const customCss = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');

  :root {
    --bg-base: #0b0f19;
    --bg-surface: #111827;
    --bg-card: #1f2937;
    --border-color: #374151;
    --text-primary: #f3f4f6;
    --text-secondary: #9ca3af;
    --accent-blue: #3b82f6;
    --accent-indigo: #6366f1;
    --accent-emerald: #10b981;
    --accent-amber: #f59e0b;
    --accent-rose: #ef4444;
    --accent-purple: #8b5cf6;
  }

  body {
    background-color: var(--bg-base) !important;
    color: var(--text-primary) !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
    margin: 0;
    padding: 0;
  }

  /* --- Topbar Styling --- */
  .swagger-ui .topbar {
    background: linear-gradient(90deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%) !important;
    border-bottom: 1px solid #312e81 !important;
    padding: 16px 0 !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
  }

  .swagger-ui .topbar .topbar-wrapper {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 0 24px !important;
  }

  .swagger-ui .topbar .topbar-wrapper a {
    display: flex !important;
    align-items: center !important;
    text-decoration: none !important;
  }

  .swagger-ui .topbar .topbar-wrapper a span {
    font-size: 1.35rem !important;
    font-weight: 800 !important;
    background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%) !important;
    -webkit-background-clip: text !important;
    -webkit-text-fill-color: transparent !important;
    letter-spacing: -0.02em !important;
  }

  .swagger-ui .topbar .topbar-wrapper a::after {
    content: "OVERSEAS CRM API SANDBOX" !important;
    font-size: 0.75rem !important;
    font-weight: 700 !important;
    color: #fbbf24 !important;
    background: rgba(251, 191, 36, 0.12) !important;
    border: 1px solid rgba(251, 191, 36, 0.3) !important;
    border-radius: 9999px !important;
    padding: 3px 10px !important;
    margin-left: 14px !important;
    letter-spacing: 0.05em !important;
  }

  /* --- Info Header Container --- */
  .swagger-ui .wrapper {
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 24px !important;
  }

  .swagger-ui .info {
    margin: 20px 0 32px 0 !important;
    background: var(--bg-surface) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 16px !important;
    padding: 28px !important;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3) !important;
  }

  .swagger-ui .info .title {
    color: #ffffff !important;
    font-size: 2.25rem !important;
    font-weight: 800 !important;
    letter-spacing: -0.03em !important;
  }

  .swagger-ui .info .title small {
    background: #3b82f6 !important;
    color: #ffffff !important;
    font-size: 0.8rem !important;
    font-weight: 700 !important;
    border-radius: 6px !important;
    padding: 4px 8px !important;
    vertical-align: middle !important;
    margin-left: 10px !important;
  }

  .swagger-ui .info p, .swagger-ui .info li, .swagger-ui .info code {
    color: var(--text-secondary) !important;
    font-size: 0.95rem !important;
    line-height: 1.6 !important;
  }

  .swagger-ui .info code {
    background: #030712 !important;
    color: #93c5fd !important;
    padding: 2px 6px !important;
    border-radius: 4px !important;
    font-family: 'JetBrains Mono', monospace !important;
  }

  /* --- Server Dropdown & Custom URL Input Bar --- */
  .swagger-ui .servers {
    background: #0f172a !important;
    border: 1px solid #3b82f6 !important;
    border-radius: 14px !important;
    padding: 18px 24px !important;
    margin-bottom: 28px !important;
    box-shadow: 0 4px 20px rgba(59, 130, 246, 0.15) !important;
  }

  .swagger-ui .servers > label {
    color: #60a5fa !important;
    font-weight: 700 !important;
    font-size: 0.95rem !important;
    margin-bottom: 8px !important;
    display: flex !important;
    align-items: center !important;
  }

  .swagger-ui .servers select {
    background-color: #030712 !important;
    color: #ffffff !important;
    border: 1px solid #4b5563 !important;
    border-radius: 8px !important;
    padding: 10px 14px !important;
    font-size: 0.95rem !important;
    font-weight: 600 !important;
    width: 100% !important;
    max-width: 600px !important;
    cursor: pointer !important;
  }

  .swagger-ui .servers table {
    margin-top: 14px !important;
    width: 100% !important;
    max-width: 700px !important;
  }

  .swagger-ui .servers table td {
    padding: 8px 12px !important;
    color: #e5e7eb !important;
    vertical-align: middle !important;
  }

  .swagger-ui .servers table td:first-child {
    font-weight: 700 !important;
    color: #93c5fd !important;
    font-size: 0.9rem !important;
    width: 120px !important;
  }

  .swagger-ui .servers table td input {
    background: #030712 !important;
    color: #38bdf8 !important;
    border: 1.5px solid #3b82f6 !important;
    border-radius: 8px !important;
    padding: 10px 16px !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-size: 0.95rem !important;
    font-weight: 600 !important;
    width: 100% !important;
    box-shadow: 0 0 10px rgba(59, 130, 246, 0.25) !important;
  }

  .swagger-ui .servers table td input:focus {
    border-color: #60a5fa !important;
    box-shadow: 0 0 15px rgba(96, 165, 250, 0.5) !important;
    outline: none !important;
  }

  /* --- Authorize Button --- */
  .swagger-ui .btn.authorize {
    background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 10px !important;
    padding: 10px 22px !important;
    font-weight: 700 !important;
    font-size: 0.95rem !important;
    box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4) !important;
    transition: all 0.2s ease !important;
  }

  .swagger-ui .btn.authorize:hover {
    transform: translateY(-1px) !important;
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6) !important;
  }

  .swagger-ui .btn.authorize svg {
    fill: #ffffff !important;
    margin-right: 6px !important;
  }

  /* --- Tag Category Headers --- */
  .swagger-ui .opblock-tag-section {
    margin-bottom: 24px !important;
  }

  .swagger-ui .opblock-tag {
    color: #f9fafb !important;
    font-size: 1.3rem !important;
    font-weight: 700 !important;
    border-bottom: 1px solid var(--border-color) !important;
    padding: 14px 8px !important;
  }

  .swagger-ui .opblock-tag small {
    color: var(--text-secondary) !important;
    font-size: 0.85rem !important;
    font-weight: 500 !important;
    margin-left: 12px !important;
  }

  /* --- Operation Blocks (API Endpoints) --- */
  .swagger-ui .opblock {
    background: var(--bg-surface) !important;
    border: 1px solid var(--border-color) !important;
    border-radius: 12px !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
    margin: 0 0 16px 0 !important;
    transition: transform 0.15s ease, border-color 0.15s ease !important;
  }

  .swagger-ui .opblock:hover {
    border-color: #60a5fa !important;
  }

  .swagger-ui .opblock .opblock-summary {
    padding: 12px 18px !important;
    align-items: center !important;
  }

  .swagger-ui .opblock .opblock-summary-method {
    border-radius: 8px !important;
    font-weight: 800 !important;
    font-size: 0.85rem !important;
    letter-spacing: 0.05em !important;
    min-width: 80px !important;
    text-align: center !important;
    padding: 6px 12px !important;
  }

  /* Method Badges */
  .swagger-ui .opblock.opblock-post .opblock-summary-method { background: linear-gradient(135deg, #2563eb, #3b82f6) !important; color: #fff !important; }
  .swagger-ui .opblock.opblock-get .opblock-summary-method { background: linear-gradient(135deg, #059669, #10b981) !important; color: #fff !important; }
  .swagger-ui .opblock.opblock-put .opblock-summary-method { background: linear-gradient(135deg, #d97706, #f59e0b) !important; color: #fff !important; }
  .swagger-ui .opblock.opblock-patch .opblock-summary-method { background: linear-gradient(135deg, #7c3aed, #8b5cf6) !important; color: #fff !important; }
  .swagger-ui .opblock.opblock-delete .opblock-summary-method { background: linear-gradient(135deg, #dc2626, #ef4444) !important; color: #fff !important; }

  .swagger-ui .opblock .opblock-summary-path {
    color: #e5e7eb !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 600 !important;
    font-size: 0.95rem !important;
  }

  .swagger-ui .opblock .opblock-summary-description {
    color: var(--text-secondary) !important;
    font-size: 0.85rem !important;
  }

  /* --- Body / Expanded Panel --- */
  .swagger-ui .opblock-body {
    background: #0d131f !important;
    border-top: 1px solid var(--border-color) !important;
    padding: 20px !important;
    border-bottom-left-radius: 12px !important;
    border-bottom-right-radius: 12px !important;
  }

  .swagger-ui .opblock-section-header {
    background: transparent !important;
    color: #93c5fd !important;
    font-weight: 700 !important;
    border-bottom: 1px solid #1f2937 !important;
    padding: 8px 0 !important;
  }

  .swagger-ui table thead tr th {
    color: #9ca3af !important;
    border-bottom: 1px solid #374151 !important;
    font-size: 0.85rem !important;
  }

  .swagger-ui table tbody tr td {
    color: #e5e7eb !important;
    border-bottom: 1px solid #1f2937 !important;
    font-size: 0.85rem !important;
  }

  .swagger-ui .parameters-col_name .parameter__name {
    color: #60a5fa !important;
    font-family: 'JetBrains Mono', monospace !important;
    font-weight: 600 !important;
  }

  .swagger-ui .parameters-col_name .parameter__type {
    color: #9ca3af !important;
  }

  .swagger-ui input[type=text], .swagger-ui textarea {
    background: #030712 !important;
    color: #f3f4f6 !important;
    border: 1px solid #4b5563 !important;
    border-radius: 8px !important;
    font-family: 'JetBrains Mono', monospace !important;
    padding: 8px 12px !important;
  }

  .swagger-ui input[type=text]:focus, .swagger-ui textarea:focus {
    border-color: #3b82f6 !important;
    outline: none !important;
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3) !important;
  }

  .swagger-ui .btn.execute {
    background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
    color: #ffffff !important;
    border: none !important;
    border-radius: 8px !important;
    font-weight: 700 !important;
    padding: 10px 24px !important;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4) !important;
  }

  .swagger-ui .btn.btn-clear {
    background: #374151 !important;
    color: #e5e7eb !important;
    border: none !important;
    border-radius: 8px !important;
  }

  /* Responses block */
  .swagger-ui .responses-inner {
    padding: 16px 0 !important;
  }

  .swagger-ui .responses-table thead tr th {
    color: #cbd5e1 !important;
  }

  .swagger-ui .response-col_status {
    font-weight: 700 !important;
    color: #34d399 !important;
  }

  .swagger-ui .highlight-code pre {
    background: #030712 !important;
    color: #38bdf8 !important;
    border-radius: 8px !important;
    border: 1px solid #1f2937 !important;
    font-family: 'JetBrains Mono', monospace !important;
    padding: 16px !important;
  }

  /* Filter search bar */
  .swagger-ui .filter-container {
    padding: 16px 0 !important;
  }

  .swagger-ui .filter-container .operation-filter-input {
    background: #111827 !important;
    color: #ffffff !important;
    border: 1px solid #4b5563 !important;
    border-radius: 10px !important;
    padding: 10px 16px !important;
    font-size: 0.95rem !important;
  }

  /* Modal Auth Dialog */
  .swagger-ui .dialog-ux .modal-ux {
    background: #111827 !important;
    border: 1px solid #4b5563 !important;
    border-radius: 16px !important;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7) !important;
  }

  .swagger-ui .dialog-ux .modal-ux-header {
    border-bottom: 1px solid #374151 !important;
    padding: 20px 24px !important;
  }

  .swagger-ui .dialog-ux .modal-ux-header h3 {
    color: #ffffff !important;
    font-weight: 700 !important;
  }

  .swagger-ui .dialog-ux .modal-ux-content {
    padding: 24px !important;
    color: #e5e7eb !important;
  }

  .swagger-ui .auth-btn-wrapper {
    padding: 16px 0 !important;
  }
`;

const swaggerUiOptions = {
  explorer: true,
  customCss,
  customSiteTitle: 'Aeterna One CRM — Interactive API Explorer',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    docExpansion: 'none',
    defaultModelsExpandDepth: -1,
    tryItOutEnabled: true,
  },
};

// Serve raw JSON OpenAPI specification
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

router.get('/openapi.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Mount Swagger UI
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));

module.exports = router;

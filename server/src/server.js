const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const app = require('./app');
const { connectDB } = require('./config/db');
const { validateEnv } = require('./utils/devilWrapper');

// Default PORT to 5000 if not explicitly provided (e.g. Render/Cloud default)
if (!process.env.PORT) {
  process.env.PORT = '5000';
}

// Validate critical environment variables (Fail-Closed)
const REQUIRED_ENV_VARS = ['PORT', 'MONGO_URI', 'JWT_SECRET'];
const missingVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);

if (missingVars.length > 0) {
  const errMsg = `FATAL: Missing required environment variable(s): ${missingVars.join(', ')}`;
  console.error(errMsg);
  process.exit(1);
}

if (validateEnv && typeof validateEnv === 'function') {
  try {
    validateEnv(REQUIRED_ENV_VARS);
    console.log('Environment variables validated successfully.');
  } catch (err) {
    console.error(`FATAL environment validation error: ${err.message}`);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and start HTTP listener
connectDB()
  .finally(() => {
  const server = app.listen(PORT, () => {
    console.log('='.repeat(55));
    console.log('   AETERNA ONE CRM - BACKEND API SERVER');
    console.log('='.repeat(55));
    console.log(`Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server Port : ${PORT}`);
    console.log(`API Base URL: http://localhost:${PORT}/api/v1`);
    console.log(`Health Check: http://localhost:${PORT}/health`);
    console.log('='.repeat(55));
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    // Keep running in development; close gracefully in production
    if (process.env.NODE_ENV === 'production') {
      server.close(() => process.exit(1));
    }
  });

  // Handle SIGTERM
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing HTTP server gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
    });
  });
});

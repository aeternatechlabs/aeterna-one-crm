const mongoose = require('mongoose');

let isConnected = false;

/**
 * Connect to MongoDB with graceful error handling and event monitoring
 */
const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm';

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log('='.repeat(50));
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    console.log(`Database Name: ${conn.connection.name}`);
    console.log('='.repeat(50));
    return conn;
  } catch (error) {
    isConnected = false;
    console.error('='.repeat(50));
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.error(`Configured URI: ${mongoUri}`);
    console.error('Please verify your MongoDB service is running or check your MONGO_URI in .env');
    console.error('='.repeat(50));

    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

mongoose.connection.on('connected', () => {
  isConnected = true;
  console.log('MongoDB connection established');
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('MongoDB reconnected');
});

process.on('SIGINT', async () => {
  if (isConnected) {
    await mongoose.connection.close();
    console.log('MongoDB connection closed on app termination');
  }
  process.exit(0);
});

module.exports = {
  connectDB,
  isDbConnected: () => isConnected || mongoose.connection.readyState === 1,
};

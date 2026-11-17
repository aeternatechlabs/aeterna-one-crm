require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/users/user.model');
const { ROLES, BRANCHES } = require('../config/constants');

const DEMO_USERS = [
  {
    name: 'Sachin Tiwari (Super Admin)',
    email: 'admin@aeterna.com',
    password: 'Password@123',
    role: ROLES.SUPER_ADMIN,
    branch: BRANCHES.ALL,
    phone: '+91 99000 11223',
    isActive: true,
  },
  {
    name: 'Rajesh Varma (Bengaluru Manager)',
    email: 'manager.bengaluru@aeterna.com',
    password: 'Password@123',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.BENGALURU,
    phone: '+91 98450 33445',
    isActive: true,
  },
  {
    name: 'Priya Nair (Education Counsellor)',
    email: 'counsellor.bengaluru@aeterna.com',
    password: 'Password@123',
    role: ROLES.COUNSELLOR,
    branch: BRANCHES.BENGALURU,
    phone: '+91 98860 55667',
    isActive: true,
  },
  {
    name: 'Vikram Joshi (Mysuru Manager)',
    email: 'manager.mysuru@aeterna.com',
    password: 'Password@123',
    role: ROLES.BRANCH_MANAGER,
    branch: BRANCHES.MYSURU,
    phone: '+91 98220 77889',
    isActive: true,
  },
  {
    name: 'Ananya Rao (Application Officer)',
    email: 'admissions@aeterna.com',
    password: 'Password@123',
    role: ROLES.APPLICATION_OFFICER,
    branch: BRANCHES.BENGALURU,
    phone: '+91 97400 99001',
    isActive: true,
  },
];

/**
 * Idempotent seeder: stores demo users in the database
 */
async function seedDemoUsers() {
  let createdCount = 0;
  let existingCount = 0;

  for (const demoUser of DEMO_USERS) {
    const existing = await User.findOne({ email: demoUser.email.toLowerCase() });
    if (!existing) {
      await User.create(demoUser);
      createdCount++;
    } else {
      existing.name = demoUser.name;
      existing.role = demoUser.role;
      existing.branch = demoUser.branch;
      existing.isActive = true;
      await existing.save({ validateBeforeSave: false });
      existingCount++;
    }
  }

  return {
    createdCount,
    existingCount,
    total: DEMO_USERS.length,
  };
}

// Standalone execution script
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aeterna_one_crm';
  console.log(`Connecting to MongoDB for demo seeding: ${mongoUri}`);

  mongoose
    .connect(mongoUri, { serverSelectionTimeoutMS: 5000 })
    .then(async () => {
      console.log('Connected to MongoDB. Seeding demo accounts...');
      const result = await seedDemoUsers();
      console.log('='.repeat(50));
      console.log(`Demo Users Seeded Successfully:`);
      console.log(`- Created : ${result.createdCount}`);
      console.log(`- Updated : ${result.existingCount}`);
      console.log(`- Total   : ${result.total}`);
      console.log('='.repeat(50));
      process.exit(0);
    })
    .catch((err) => {
      console.error('Failed to seed demo accounts:', err.message);
      process.exit(1);
    });
}

module.exports = {
  DEMO_USERS,
  seedDemoUsers,
};

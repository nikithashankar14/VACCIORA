/**
 * bootstrapAdmin.js
 * One-time CLI script to create the initial super-admin account.
 * 
 * STRICT RULES:
 * 1. Refuses to run if any user with role 'admin' already exists.
 * 2. Reads credentials from BOOTSTRAP_ADMIN_* env vars or prompts interactively via readline.
 * 3. Never hardcodes any default credentials.
 * 4. Password hashed with bcrypt.
 */

require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const AuditLog = require('../src/models/AuditLog');
const { ROLES, CONSENT_VERSION } = require('../src/config/constants');

const askQuestion = (query) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
};

const bootstrapAdmin = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vacciora';
  console.log(`[Admin Bootstrap] Connecting to database at ${mongoUri}...`);

  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('[Admin Bootstrap] Connected.');

    // Check if an admin already exists
    const existingAdmin = await User.findOne({ role: ROLES.ADMIN });
    if (existingAdmin) {
      console.error('\n[Admin Bootstrap REFUSED] An administrator account already exists in this database:');
      console.error(`- Email: ${existingAdmin.email}`);
      console.error(`- Created At: ${existingAdmin.createdAt}`);
      console.error('The bootstrap script creates exactly ONE initial administrator. Further staff/admin accounts');
      console.error('must be onboarded via the in-app "Request Access -> Admin Approval" workflow.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Read from environment variables or prompt interactively
    let name = process.env.BOOTSTRAP_ADMIN_NAME;
    let email = process.env.BOOTSTRAP_ADMIN_EMAIL;
    let mobile = process.env.BOOTSTRAP_ADMIN_MOBILE;
    let password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

    if (!name || !email || !mobile || !password) {
      console.log('\n--- Vacciora Administrator Setup ---');
      console.log('No BOOTSTRAP_ADMIN_* environment variables detected. Prompting for details:');
      
      if (!name) name = await askQuestion('Admin Full Name: ');
      if (!email) email = await askQuestion('Admin Email Address: ');
      if (!mobile) mobile = await askQuestion('Admin Mobile Number (with country code or 10 digits): ');
      if (!password) password = await askQuestion('Admin Password (min 8 chars): ');
    }

    if (!name || !email || !mobile || !password) {
      console.error('\n[Admin Bootstrap Error] All fields (Name, Email, Mobile, Password) are mandatory.');
      await mongoose.disconnect();
      process.exit(1);
    }

    if (password.length < 8) {
      console.error('\n[Admin Bootstrap Error] Password must be at least 8 characters long.');
      await mongoose.disconnect();
      process.exit(1);
    }

    // Salt and hash the password with bcrypt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const newAdmin = new User({
      name,
      email: email.toLowerCase(),
      mobileNumber: mobile,
      whatsappNumber: mobile,
      passwordHash,
      role: ROLES.ADMIN,
      preferredLanguage: 'en',
      consentGiven: true,
      consentGivenAt: new Date(),
      consentVersion: CONSENT_VERSION,
      accountStatus: 'active',
      requirePasswordChange: false,
      isActive: true,
      notificationPreferences: {
        webApp: true,
        sms: true,
        email: true,
        whatsapp: true
      }
    });

    await newAdmin.save();

    await AuditLog.create({
      userId: newAdmin._id,
      action: 'BOOTSTRAP_ADMIN_CREATED',
      targetCollection: 'User',
      targetId: newAdmin._id.toString(),
      meta: { email: newAdmin.email, mobile: newAdmin.mobileNumber }
    });

    console.log('\n========================================');
    console.log('  SUCCESS: Initial Admin Created!       ');
    console.log('========================================');
    console.log(`Admin ID:     ${newAdmin._id}`);
    console.log(`Name:         ${newAdmin.name}`);
    console.log(`Email:        ${newAdmin.email}`);
    console.log(`Mobile:       ${newAdmin.mobileNumber}`);
    console.log(`Role:         ${newAdmin.role}`);
    console.log('========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(`\n[Admin Bootstrap Exception] ${err.message}`);
    process.exit(1);
  }
};

bootstrapAdmin();

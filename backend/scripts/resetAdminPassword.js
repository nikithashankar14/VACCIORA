/**
 * resetAdminPassword.js
 * Safely resets the admin password to a clean, known value and ensures required schema fields.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');

const reset = async () => {
  const newPassword = process.argv[2] || 'Admin@123456';
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vacciora';

  try {
    await mongoose.connect(mongoUri);
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found.');
      process.exit(1);
    }

    const salt = await bcrypt.genSalt(10);
    admin.passwordHash = await bcrypt.hash(newPassword, salt);
    admin.mobileNumber = admin.mobileNumber || '+919999000001';
    admin.whatsappNumber = admin.whatsappNumber || '+919999000001';
    admin.requirePasswordChange = false;
    admin.isActive = true;
    admin.accountStatus = 'active';
    await admin.save();

    const isMatch = await bcrypt.compare(newPassword, admin.passwordHash);
    console.log(`\n========================================`);
    console.log(`[SUCCESS] Admin password reset completed!`);
    console.log(`Email / Login: ${admin.email}`);
    console.log(`Mobile:        ${admin.mobileNumber}`);
    console.log(`Password:      ${newPassword}`);
    console.log(`Bcrypt check:  ${isMatch}`);
    console.log(`========================================\n`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

reset();

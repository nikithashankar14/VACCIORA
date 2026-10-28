require('dotenv').config();
const mongoose = require('mongoose');
const { orchestrateVaccineReminder } = require('../src/services/notificationService');
const Child = require('../src/models/Child');
const VaccineSchedule = require('../src/models/VaccineSchedule');

async function testReminder() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vacciora');
  const child = await Child.findOne({ name: 'Ria' });
  const sched = await VaccineSchedule.findOne({ dueAgeDays: { $gt: 0 } });
  const User = require('../src/models/User');
  const parent = await User.findById(child.guardianUserId || child.parentId);
  console.log('Testing reminder for child:', child.name, 'guardian:', child.guardianMobileAtBirth);
  console.log('Parent user:', parent ? parent.email : 'not found');
  console.log('Schedule:', sched.vaccineName, 'dueAge:', sched.dueAgeLabel);

  const createdReminders = await orchestrateVaccineReminder({
    child,
    parent,
    schedule: sched,
    dueDate: new Date()
  });

  console.log('Dispatched Channels count:', createdReminders.length);
  createdReminders.forEach(r => {
    console.log(`- Channel: ${r.channel} | Status: ${r.status} | Mode: ${r.deliveryMode} | ProviderRef: ${r.providerReference}`);
  });

  await mongoose.disconnect();
}

testReminder().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});

const mongoose = require('mongoose');

async function updateParentPrefs() {
  await mongoose.connect('mongodb://127.0.0.1:27017/vacciora');
  const users = await mongoose.connection.collection('users').find({}).toArray();
  console.log('Current users:', users.map(u => ({ email: u.email, role: u.role, prefs: u.notificationPreferences })));

  const result = await mongoose.connection.collection('users').updateMany(
    { role: 'parent' },
    {
      $set: {
        'notificationPreferences.email': true,
        'notificationPreferences.whatsapp': true,
        'notificationPreferences.sms': true
      }
    }
  );
  console.log('Updated parent count:', result.modifiedCount);

  const updatedUsers = await mongoose.connection.collection('users').find({ role: 'parent' }).toArray();
  console.log('Updated parents:', updatedUsers.map(u => ({ email: u.email, prefs: u.notificationPreferences })));

  await mongoose.disconnect();
}

updateParentPrefs().catch(err => {
  console.error(err);
  process.exit(1);
});

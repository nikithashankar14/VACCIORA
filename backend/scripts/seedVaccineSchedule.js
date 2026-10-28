/**
 * seedVaccineSchedule.js
 * Dedicated script to seed real India Universal Immunization Programme (UIP) reference data.
 * 
 * STRICT RULE: This is the ONLY pre-seeded collection in the entire Vacciora platform.
 * NO demo users, NO demo children, NO demo facilities.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const VaccineSchedule = require('../src/models/VaccineSchedule');
const { UIP_VACCINE_SCHEDULE } = require('../src/config/constants');

const seedSchedule = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vacciora';
  console.log(`[Seed UIP Schedule] Connecting to MongoDB at ${mongoUri}...`);
  
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.log('[Seed UIP Schedule] Connected successfully.');

    let insertedCount = 0;
    let updatedCount = 0;

    for (const item of UIP_VACCINE_SCHEDULE) {
      const result = await VaccineSchedule.findOneAndUpdate(
        { vaccineCode: item.vaccineCode },
        { $set: item },
        { upsert: true, new: true }
      );
      if (result) {
        insertedCount++;
      }
    }

    const totalInDb = await VaccineSchedule.countDocuments();
    console.log(`[Seed UIP Schedule] Complete. Seeded/Updated: ${insertedCount} UIP schedules.`);
    console.log(`[Seed UIP Schedule] Total UIP schedule documents in DB: ${totalInDb}`);

    await mongoose.disconnect();
    console.log('[Seed UIP Schedule] Disconnected cleanly from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error(`[Seed UIP Schedule] Error: ${error.message}`);
    process.exit(1);
  }
};

seedSchedule();

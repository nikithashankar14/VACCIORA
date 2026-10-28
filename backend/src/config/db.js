/**
 * db.js
 * MongoDB persistence layer via Mongoose.
 * 
 * STRICT RULE: No in-memory or JSON file fallback of any kind.
 * If connection fails, logs a fatal error and immediately exits with code 1.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/vacciora';
  
  if (!mongoUri) {
    console.error('FATAL DATABASE ERROR: MONGO_URI environment variable is not defined.');
    process.exit(1);
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });
    console.log(`[MongoDB Connected] Host: ${conn.connection.host}, Port: ${conn.connection.port}, DB: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`FATAL DATABASE ERROR: Failed to connect to MongoDB at ${mongoUri}.`);
    console.error(`Details: ${error.message}`);
    console.error('Vacciora refuses to start without a valid MongoDB instance. Exiting.');
    process.exit(1);
  }
};

module.exports = connectDB;

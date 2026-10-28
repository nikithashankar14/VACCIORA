/**
 * server.js
 * Main entry point for Vacciora Backend API.
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const connectDB = require('./config/db');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const childrenRoutes = require('./routes/childrenRoutes');
const recordsRoutes = require('./routes/recordsRoutes');
const scheduleRoutes = require('./routes/scheduleRoutes');
const riskRoutes = require('./routes/riskRoutes');
const remindersRoutes = require('./routes/remindersRoutes');
const adminRoutes = require('./routes/adminRoutes');
const certificatesRoutes = require('./routes/certificatesRoutes');
const qrRoutes = require('./routes/qrRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Body parsing middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'vacciora-backend',
    timestamp: new Date().toISOString()
  });
});

// Mount Feature API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/children', childrenRoutes);
app.use('/api/records', recordsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/qr', qrRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.'
  });
});

// Server Initialization Gated on Strict MongoDB Connection
const startServer = async () => {
  // STRICT RULE: Must connect to MongoDB first.
  // connectDB() will call process.exit(1) on failure.
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  VACCIORA BACKEND RUNNING ON PORT ${PORT}             `);
    console.log(`  Universal Immunization Programme (UIP) Online       `);
    console.log(`  Persistence: Strict MongoDB / Mongoose               `);
    console.log(`======================================================\n`);
  });
};

startServer();

const mongoose = require('mongoose');

const reminderSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VaccineSchedule',
    default: null
  },
  predictionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RiskPrediction',
    default: null
  },
  reminderStrategy: {
    type: String,
    enum: ['standard', 'enhanced', 'intensive'],
    default: 'standard'
  },
  channel: {
    type: String,
    enum: ['web_app', 'sms', 'email', 'whatsapp'],
    required: true,
    index: true
  },
  message: {
    type: String,
    required: true
  },
  scheduledSendAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  sentAt: {
    type: Date,
    default: null
  },
  deliveryMode: {
    type: String,
    enum: ['live', 'mock', 'failed'],
    default: 'mock',
    index: true
  },
  providerReference: {
    type: String,
    default: null
  },
  fallbackFrom: {
    type: String,
    default: null
  },
  acknowledged: {
    type: Boolean,
    default: false
  },
  acknowledgementMethod: {
    type: String,
    default: null
  },
  acknowledgedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Reminder', reminderSchema);

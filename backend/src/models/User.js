const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  whatsappNumber: {
    type: String,
    trim: true,
    default: function() {
      return this.mobileNumber;
    }
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['parent', 'staff', 'admin'],
    default: 'parent',
    required: true
  },
  preferredLanguage: {
    type: String,
    default: 'en'
  },
  facilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    default: null
  },
  consentGiven: {
    type: Boolean,
    default: false
  },
  consentGivenAt: {
    type: Date,
    default: null
  },
  consentVersion: {
    type: String,
    default: null
  },
  notificationPreferences: {
    webApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true }
  },
  accountStatus: {
    type: String,
    enum: ['pending', 'active', 'rejected'],
    default: 'active'
  },
  requirePasswordChange: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);

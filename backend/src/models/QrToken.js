const mongoose = require('mongoose');

const qrTokenSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  tokenValue: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  lastUsedAt: {
    type: Date,
    default: null
  },
  lastUsedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('QrToken', qrTokenSchema);

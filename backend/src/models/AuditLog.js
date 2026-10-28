const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  targetCollection: {
    type: String,
    required: true
  },
  targetId: {
    type: String,
    default: null
  },
  ipAddress: {
    type: String,
    default: null
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);

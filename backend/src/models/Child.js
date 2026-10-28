const mongoose = require('mongoose');

const childSchema = new mongoose.Schema({
  childUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: true
  },
  birthFacilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    required: true
  },
  guardianUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  guardianMobileAtBirth: {
    type: String,
    required: true,
    index: true,
    trim: true
  },
  duplicateStatus: {
    type: String,
    enum: ['none', 'suspected', 'confirmed_duplicate', 'resolved'],
    default: 'none'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Child', childSchema);

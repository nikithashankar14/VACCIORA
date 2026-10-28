const mongoose = require('mongoose');

const vaccinationRecordSchema = new mongoose.Schema({
  recordUid: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VaccineSchedule',
    required: true,
    index: true
  },
  source: {
    type: String,
    enum: ['parent_uploaded', 'hw_administered'],
    default: 'hw_administered',
    required: true
  },
  status: {
    type: String,
    enum: ['pending_verification', 'verified', 'rejected', 'correction_required'],
    default: 'verified',
    required: true
  },
  dateAdministered: {
    type: Date,
    default: Date.now
  },
  scheduledDueDate: {
    type: Date,
    default: null
  },
  administeredFacilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    default: null
  },
  administeredByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  batchLotNumber: {
    type: String,
    trim: true,
    default: ''
  },
  remarks: {
    type: String,
    default: ''
  },
  verifiedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  verifiedAt: {
    type: Date,
    default: null
  },
  recordHash: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VaccinationRecord', vaccinationRecordSchema);

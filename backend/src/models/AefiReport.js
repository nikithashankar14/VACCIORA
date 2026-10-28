const mongoose = require('mongoose');

const aefiReportSchema = new mongoose.Schema({
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VaccinationRecord',
    required: true,
    index: true
  },
  reportedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  eventDatetime: {
    type: Date,
    required: true,
    default: Date.now
  },
  eventDescription: {
    type: String,
    required: true,
    trim: true
  },
  severityCategory: {
    type: String,
    enum: ['minor', 'severe', 'serious'],
    default: 'minor',
    required: true
  },
  actionTaken: {
    type: String,
    default: '',
    trim: true
  },
  followUpStatus: {
    type: String,
    enum: ['under_investigation', 'resolved', 'referred', 'hospitalized'],
    default: 'under_investigation'
  },
  referralFacilityId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Facility',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AefiReport', aefiReportSchema);

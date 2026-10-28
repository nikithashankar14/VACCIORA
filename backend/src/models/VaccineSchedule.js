const mongoose = require('mongoose');

const vaccineScheduleSchema = new mongoose.Schema({
  vaccineCode: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  vaccineName: {
    type: String,
    required: true,
    trim: true
  },
  doseNumber: {
    type: Number,
    required: true
  },
  antigenGroup: {
    type: String,
    required: true,
    trim: true
  },
  dueAgeDays: {
    type: Number,
    required: true,
    index: true
  },
  dueAgeLabel: {
    type: String,
    required: true
  },
  upperLimitAgeDays: {
    type: Number,
    required: true
  },
  route: {
    type: String,
    default: ''
  },
  site: {
    type: String,
    default: ''
  },
  endemicDistrictsOnly: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  effectiveFrom: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('VaccineSchedule', vaccineScheduleSchema);

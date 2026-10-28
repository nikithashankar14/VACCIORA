const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema({
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VaccinationRecord',
    default: null
  },
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  certificateUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  recordHash: {
    type: String,
    required: true,
    index: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  filePath: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Certificate', certificateSchema);

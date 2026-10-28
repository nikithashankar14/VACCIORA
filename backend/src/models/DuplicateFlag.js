const mongoose = require('mongoose');

const duplicateFlagSchema = new mongoose.Schema({
  childId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  possibleMatchChildId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Child',
    required: true,
    index: true
  },
  matchBasis: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed_duplicate', 'not_duplicate'],
    default: 'pending'
  },
  resolvedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  resolvedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('DuplicateFlag', duplicateFlagSchema);

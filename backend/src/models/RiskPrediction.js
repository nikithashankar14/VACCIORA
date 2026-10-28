const mongoose = require('mongoose');

const riskPredictionSchema = new mongoose.Schema({
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
  predictionType: {
    type: String,
    enum: ['cold_start_baseline', 'ml_model', 'js_fallback_rules'],
    required: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  riskCategory: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  contributingFactors: {
    type: [String],
    default: []
  },
  modelVersion: {
    type: String,
    default: 'v1.0.0'
  },
  predictedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('RiskPrediction', riskPredictionSchema);

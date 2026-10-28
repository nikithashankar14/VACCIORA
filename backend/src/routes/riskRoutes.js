/**
 * riskRoutes.js
 * AI Risk Prediction endpoints with cold-start gating and microservice dispatch.
 */

const express = require('express');
const router = express.Router();

const Child = require('../models/Child');
const RiskPrediction = require('../models/RiskPrediction');
const { requireAuth } = require('../middleware/auth');
const { predictMissedDoseRisk } = require('../services/mlClient');

// GET /api/risk/:childId (Compute or fetch latest AI risk evaluation for a child)
router.get('/:childId', requireAuth, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    // Run prediction (saves to DB and returns full telemetry)
    const prediction = await predictMissedDoseRisk(child._id, { saveToDb: true });

    res.json({
      success: true,
      childId: child._id,
      childUid: child.childUid,
      childName: child.name,
      ...prediction
    });
  } catch (err) {
    console.error('Risk Evaluation Route Error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute risk assessment.' });
  }
});

module.exports = router;

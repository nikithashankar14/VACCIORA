/**
 * scheduleRoutes.js
 * Reference UIP vaccine schedules and next-due computation.
 */

const express = require('express');
const router = express.Router();

const VaccineSchedule = require('../models/VaccineSchedule');
const Child = require('../models/Child');
const VaccinationRecord = require('../models/VaccinationRecord');
const { requireAuth } = require('../middleware/auth');
const { evaluateChildSchedule } = require('../services/scheduleEngine');

// GET /api/schedule (Public/Authenticated: returns full UIP reference schedule)
router.get('/', async (req, res) => {
  try {
    const schedules = await VaccineSchedule.find({ isActive: true }).sort({ dueAgeDays: 1, doseNumber: 1 });
    res.json({ success: true, count: schedules.length, schedules });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve vaccine schedule.' });
  }
});

// GET /api/schedule/next-due/:childId (Compute next due vaccination for a specific child)
router.get('/next-due/:childId', requireAuth, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    const [verifiedRecords, allSchedules] = await Promise.all([
      VaccinationRecord.find({ childId: child._id, status: 'verified' }),
      VaccineSchedule.find({ isActive: true })
    ]);

    const evaluation = evaluateChildSchedule(child, verifiedRecords, allSchedules);

    res.json({
      success: true,
      childUid: child.childUid,
      childName: child.name,
      childAge: evaluation.childAge,
      nextDue: evaluation.nextDue,
      summary: evaluation.summary
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to compute next due vaccination.' });
  }
});

module.exports = router;

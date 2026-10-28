/**
 * remindersRoutes.js
 * Reminders retrieval, triggering, and acknowledgement tracking.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');

const Reminder = require('../models/Reminder');
const Child = require('../models/Child');
const User = require('../models/User');
const VaccineSchedule = require('../models/VaccineSchedule');
const RiskPrediction = require('../models/RiskPrediction');
const AuditLog = require('../models/AuditLog');
const { requireAuth } = require('../middleware/auth');
const { orchestrateVaccineReminder } = require('../services/notificationService');
const { predictMissedDoseRisk } = require('../services/mlClient');

// GET /api/reminders/:childId (Get reminder logs for a child)
router.get('/:childId', requireAuth, async (req, res) => {
  try {
    const reminders = await Reminder.find({ childId: req.params.childId })
      .populate('scheduleId')
      .populate('predictionId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: reminders.length, reminders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve reminders.' });
  }
});

// POST /api/reminders/send (Trigger reminder for child & dose)
router.post('/send', requireAuth, [
  body('childId').isMongoId().withMessage('Valid childId required'),
  body('scheduleId').optional().isMongoId()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { childId, scheduleId, customMessage, dueDate } = req.body;

    const child = await Child.findById(childId).populate('guardianUserId');
    if (!child) return res.status(404).json({ success: false, message: 'Child not found.' });

    let parent = child.guardianUserId;
    if (!parent) {
      const cleanMobile = (child.guardianMobileAtBirth || '').replace(/\D/g, '');
      parent = await User.findOne({
        $or: [
          { mobileNumber: child.guardianMobileAtBirth },
          { mobileNumber: cleanMobile },
          { mobileNumber: `+91${cleanMobile}` }
        ]
      });
    }
    if (!parent) {
      // Fallback pseudo-parent object using guardianMobileAtBirth
      parent = {
        name: 'Parent / Guardian',
        mobileNumber: child.guardianMobileAtBirth,
        whatsappNumber: child.guardianMobileAtBirth,
        email: null,
        notificationPreferences: { webApp: true, sms: true, whatsapp: true, email: true }
      };
    }

    let schedule = null;
    if (scheduleId) {
      schedule = await VaccineSchedule.findById(scheduleId);
    } else {
      schedule = await VaccineSchedule.findOne({ dueAgeDays: { $gt: 0 } }).sort({ dueAgeDays: 1 });
    }

    // Get risk prediction
    const risk = await predictMissedDoseRisk(child._id, { saveToDb: true, scheduleId: schedule?._id });

    // Target due date
    const targetDueDate = dueDate 
      ? new Date(dueDate) 
      : (schedule 
          ? new Date(new Date(child.dateOfBirth).getTime() + schedule.dueAgeDays * 24 * 60 * 60 * 1000)
          : new Date());

    const createdReminders = await orchestrateVaccineReminder({
      child,
      parent,
      schedule,
      riskPrediction: risk,
      dueDate: targetDueDate,
      customMessage,
      reminderStrategy: risk.reminderStrategy || 'standard'
    });

    await AuditLog.create({
      userId: req.user._id,
      action: 'REMINDER_TRIGGERED',
      targetCollection: 'Reminder',
      targetId: child._id.toString(),
      ipAddress: req.ip,
      meta: { sentChannelsCount: createdReminders.length }
    });

    res.json({
      success: true,
      message: `Sent ${createdReminders.length} reminder message(s) across selected channels.`,
      reminders: createdReminders
    });
  } catch (err) {
    console.error('Trigger Reminder Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send reminder.' });
  }
});

// PATCH /api/reminders/:id/acknowledge (Mark reminder as acknowledged)
router.patch('/:id/acknowledge', requireAuth, async (req, res) => {
  try {
    const { method = 'web_app_click' } = req.body;
    const reminder = await Reminder.findById(req.params.id);

    if (!reminder) {
      return res.status(404).json({ success: false, message: 'Reminder not found.' });
    }

    reminder.acknowledged = true;
    reminder.acknowledgementMethod = method;
    reminder.acknowledgedAt = new Date();
    await reminder.save();

    res.json({ success: true, message: 'Reminder acknowledged.', reminder });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to acknowledge reminder.' });
  }
});

module.exports = router;

/**
 * adminRoutes.js
 * Admin dashboards, notification health panel, notification history audit table,
 * facility management, duplicate flags, user administration, and system analytics.
 */

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Child = require('../models/Child');
const Facility = require('../models/Facility');
const Reminder = require('../models/Reminder');
const VaccinationRecord = require('../models/VaccinationRecord');
const RiskPrediction = require('../models/RiskPrediction');
const DuplicateFlag = require('../models/DuplicateFlag');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { getNotificationHealth } = require('../services/notificationService');
const { ROLES } = require('../config/constants');

// GET /api/admin/notifications/health (Live vs Mock status, last send, 24h metrics)
router.get('/notifications/health', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const health = await getNotificationHealth();
    res.json({ success: true, ...health });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve notification health.' });
  }
});

// GET /api/admin/notifications (Paginated notification history table joined to parent and child)
router.get('/notifications', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const channel = req.query.channel;
    const deliveryMode = req.query.deliveryMode;

    const filter = {};
    if (channel && channel !== 'all') filter.channel = channel;
    if (deliveryMode && deliveryMode !== 'all') filter.deliveryMode = deliveryMode;

    const [total, reminders] = await Promise.all([
      Reminder.countDocuments(filter),
      Reminder.find(filter)
        .populate({
          path: 'childId',
          select: 'name childUid guardianMobileAtBirth',
          populate: { path: 'guardianUserId', select: 'name email mobileNumber' }
        })
        .populate('scheduleId', 'vaccineCode vaccineName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
    ]);

    const formattedList = reminders.map(r => ({
      id: r._id,
      parentName: r.childId?.guardianUserId?.name || 'Guardian (' + (r.childId?.guardianMobileAtBirth || 'N/A') + ')',
      childName: r.childId?.name || 'N/A',
      childUid: r.childId?.childUid || 'N/A',
      vaccine: r.scheduleId?.vaccineCode || 'Vaccine',
      channel: r.channel,
      status: r.deliveryMode,
      sentAt: r.sentAt || r.createdAt,
      providerReference: r.providerReference,
      fallbackFrom: r.fallbackFrom,
      acknowledged: r.acknowledged,
      message: r.message
    }));

    res.json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      notifications: formattedList
    });
  } catch (err) {
    console.error('Notification History Error:', err);
    res.status(500).json({ success: false, message: 'Failed to load notification history.' });
  }
});

// GET /api/admin/analytics (Real-time analytics for charts)
router.get('/analytics', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const [
      totalChildren,
      totalVaccinationsAdministered,
      totalParents,
      totalStaff,
      totalFacilities,
      predictionsDistribution,
      remindersByChannel,
      recentRecords
    ] = await Promise.all([
      Child.countDocuments({ isActive: true }),
      VaccinationRecord.countDocuments({ status: 'verified' }),
      User.countDocuments({ role: ROLES.PARENT, isActive: true }),
      User.countDocuments({ role: ROLES.STAFF, isActive: true }),
      Facility.countDocuments({ approvalStatus: 'approved' }),
      RiskPrediction.aggregate([
        { $group: { _id: '$riskCategory', count: { $sum: 1 } } }
      ]),
      Reminder.aggregate([
        { $group: { _id: '$channel', count: { $sum: 1 } } }
      ]),
      VaccinationRecord.find({ status: 'verified' })
        .populate('childId', 'name childUid')
        .populate('scheduleId', 'vaccineCode')
        .sort({ createdAt: -1 })
        .limit(6)
    ]);

    // Format risk distribution
    const riskMap = { low: 0, medium: 0, high: 0 };
    for (const item of predictionsDistribution) {
      if (item._id && riskMap[item._id] !== undefined) {
        riskMap[item._id] = item.count;
      }
    }

    // Format channel breakdown
    const channelMap = { whatsapp: 0, sms: 0, email: 0, web_app: 0 };
    for (const item of remindersByChannel) {
      if (item._id && channelMap[item._id] !== undefined) {
        channelMap[item._id] = item.count;
      }
    }

    res.json({
      success: true,
      summary: {
        totalChildren,
        totalVaccinationsAdministered,
        totalParents,
        totalStaff,
        totalFacilities
      },
      riskDistribution: [
        { name: 'Low Risk', value: riskMap.low, color: '#10B981' },
        { name: 'Medium Risk', value: riskMap.medium, color: '#F59E0B' },
        { name: 'High Risk', value: riskMap.high, color: '#EF4444' }
      ],
      channelBreakdown: [
        { name: 'WhatsApp', count: channelMap.whatsapp, color: '#25D366' },
        { name: 'SMS', count: channelMap.sms, color: '#3B82F6' },
        { name: 'Email', count: channelMap.email, color: '#8B5CF6' },
        { name: 'In-App Web', count: channelMap.web_app, color: '#0F766E' }
      ],
      recentRecords
    });
  } catch (err) {
    console.error('Admin Analytics Error:', err);
    res.status(500).json({ success: false, message: 'Failed to compute analytics.' });
  }
});

// GET /api/admin/facilities (List all facilities)
router.get('/facilities', requireAuth, async (req, res) => {
  try {
    const facilities = await Facility.find().sort({ createdAt: -1 });
    res.json({ success: true, facilities });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch facilities.' });
  }
});

// POST /api/admin/facilities (Create new facility)
router.post('/facilities', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { name, type, district, state, address } = req.body;
    const facility = await Facility.create({
      name,
      type: type || 'hospital',
      district,
      state,
      address: address || '',
      approvalStatus: 'approved'
    });
    res.status(201).json({ success: true, facility });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create facility.' });
  }
});

// PATCH /api/admin/facilities/:id (Approve or update facility status)
router.patch('/facilities/:id', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { approvalStatus, isActive } = req.body;
    const facility = await Facility.findById(req.params.id);
    if (!facility) return res.status(404).json({ success: false, message: 'Facility not found.' });

    if (approvalStatus) facility.approvalStatus = approvalStatus;
    if (isActive !== undefined) facility.isActive = Boolean(isActive);

    await facility.save();
    res.json({ success: true, facility });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update facility.' });
  }
});

// GET /api/admin/duplicates (List detected potential child duplicates)
router.get('/duplicates', requireAuth, requireRole(ROLES.ADMIN, ROLES.STAFF), async (req, res) => {
  try {
    const flags = await DuplicateFlag.find({ status: 'pending' })
      .populate('childId')
      .populate('possibleMatchChildId')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: flags.length, duplicates: flags });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load duplicates.' });
  }
});

// PATCH /api/admin/duplicates/:id (Resolve duplicate flag)
router.patch('/duplicates/:id', requireAuth, requireRole(ROLES.ADMIN, ROLES.STAFF), async (req, res) => {
  try {
    const { resolution } = req.body; // 'confirmed_duplicate' | 'not_duplicate'
    const flag = await DuplicateFlag.findById(req.params.id);
    if (!flag) return res.status(404).json({ success: false, message: 'Duplicate flag not found.' });

    flag.status = resolution;
    flag.resolvedByUserId = req.user._id;
    flag.resolvedAt = new Date();
    await flag.save();

    const child = await Child.findById(flag.childId);
    if (child) {
      child.duplicateStatus = resolution === 'confirmed_duplicate' ? 'confirmed_duplicate' : 'resolved';
      await child.save();
    }

    res.json({ success: true, message: 'Duplicate flag resolved.', flag });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve duplicate.' });
  }
});

// GET /api/admin/audit-logs (View audit trail)
router.get('/audit-logs', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ success: true, count: logs.length, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});

// GET /api/admin/users (View registered users)
router.get('/users', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const users = await User.find()
      .select('-passwordHash')
      .populate('facilityId')
      .sort({ createdAt: -1 });

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

module.exports = router;

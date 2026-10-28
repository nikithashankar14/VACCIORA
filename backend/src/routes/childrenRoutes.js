/**
 * childrenRoutes.js
 * Child registration, hospital birth records, parent-child linking, duplicate detection,
 * and live UIP schedule timeline endpoints.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const Child = require('../models/Child');
const User = require('../models/User');
const Facility = require('../models/Facility');
const VaccineSchedule = require('../models/VaccineSchedule');
const VaccinationRecord = require('../models/VaccinationRecord');
const DuplicateFlag = require('../models/DuplicateFlag');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { evaluateChildSchedule } = require('../services/scheduleEngine');
const { ROLES } = require('../config/constants');

/**
 * Generates official UID for a newborn or child: CHD-YYYY-XXXXXX
 */
async function generateUniqueChildUid() {
  const year = new Date().getFullYear();
  let unique = false;
  let uid = '';

  while (!unique) {
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
    uid = `CHD-${year}-${randomHex}`;
    const exists = await Child.findOne({ childUid: uid });
    if (!exists) unique = true;
  }
  return uid;
}

/**
 * Detects potential duplicate children based on normalized name, dateOfBirth, and mobile.
 */
async function detectDuplicates(newChild) {
  const normName = newChild.name.trim().toLowerCase();
  const dob = new Date(newChild.dateOfBirth);
  const startOfDay = new Date(dob);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(dob);
  endOfDay.setHours(23, 59, 59, 999);

  // Exact or close match: same DOB and same guardianMobile
  const candidates = await Child.find({
    _id: { $ne: newChild._id },
    guardianMobileAtBirth: newChild.guardianMobileAtBirth,
    dateOfBirth: { $gte: startOfDay, $lte: endOfDay }
  });

  for (const candidate of candidates) {
    const candNormName = candidate.name.trim().toLowerCase();
    let basis = null;

    if (candNormName === normName) {
      basis = 'exact_name_dob_mobile';
    } else if (candNormName.includes(normName) || normName.includes(candNormName)) {
      basis = 'partial_name_dob_mobile';
    }

    if (basis) {
      await DuplicateFlag.create({
        childId: newChild._id,
        possibleMatchChildId: candidate._id,
        matchBasis: basis,
        status: 'pending'
      });

      newChild.duplicateStatus = 'suspected';
      await newChild.save();
      break;
    }
  }
}

// POST /api/children/birth-record (Facility Staff: registers newborn + day-1 birth doses BCG, OPV-0, HepB-0)
router.post('/birth-record', requireAuth, requireRole(ROLES.STAFF, ROLES.ADMIN), [
  body('name').trim().notEmpty().withMessage('Child full name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid birth date is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required'),
  body('guardianMobileAtBirth').trim().notEmpty().withMessage('Guardian mobile number is required'),
  body('birthFacilityId').optional().isMongoId()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, dateOfBirth, gender, guardianMobileAtBirth, administerBirthDoses = true } = req.body;
    const facilityId = req.body.birthFacilityId || req.user.facilityId;

    if (!facilityId) {
      return res.status(400).json({ success: false, message: 'Facility ID is required for birth registration.' });
    }

    const childUid = await generateUniqueChildUid();

    // Check if guardian is already an existing registered parent
    const existingGuardian = await User.findOne({
      mobileNumber: guardianMobileAtBirth,
      role: ROLES.PARENT
    });

    const child = new Child({
      childUid,
      name,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      birthFacilityId: facilityId,
      guardianUserId: existingGuardian ? existingGuardian._id : null,
      guardianMobileAtBirth,
      duplicateStatus: 'none',
      isActive: true
    });

    await child.save();
    await detectDuplicates(child);

    // Auto-administer Day 0 Birth Doses (BCG, OPV-0, HepB-0) if requested
    const createdRecords = [];
    if (administerBirthDoses) {
      const birthSchedules = await VaccineSchedule.find({
        vaccineCode: { $in: ['BCG', 'OPV-0', 'HepB-0'] }
      });

      for (const schedule of birthSchedules) {
        const recordUid = `REC-${child.childUid}-${schedule.vaccineCode}`;
        const hashPayload = `${child.childUid}:${schedule.vaccineCode}:${child.dateOfBirth}:${facilityId}`;
        const recordHash = crypto.createHash('sha256').update(hashPayload).digest('hex');

        const record = await VaccinationRecord.create({
          recordUid,
          childId: child._id,
          scheduleId: schedule._id,
          source: 'hw_administered',
          status: 'verified',
          dateAdministered: child.dateOfBirth,
          scheduledDueDate: child.dateOfBirth,
          administeredFacilityId: facilityId,
          administeredByUserId: req.user._id,
          batchLotNumber: `BIRTH-${schedule.vaccineCode}-LOT`,
          remarks: 'Administered at birth in labor ward',
          verifiedByUserId: req.user._id,
          verifiedAt: new Date(),
          recordHash
        });
        createdRecords.push(record);
      }
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'BIRTH_RECORD_REGISTERED',
      targetCollection: 'Child',
      targetId: child._id.toString(),
      ipAddress: req.ip,
      meta: { childUid: child.childUid, birthDosesCount: createdRecords.length }
    });

    res.status(201).json({
      success: true,
      message: 'Birth record and Day-0 immunization doses registered successfully.',
      child,
      birthDoses: createdRecords
    });
  } catch (err) {
    console.error('Birth Record Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create birth record.' });
  }
});

// POST /api/children/manual (Parent fallback creation for children born outside participating facility)
router.post('/manual', requireAuth, [
  body('name').trim().notEmpty().withMessage('Child name is required'),
  body('dateOfBirth').isISO8601().withMessage('Valid date of birth is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Valid gender is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, dateOfBirth, gender, birthFacilityName } = req.body;

    let facility = await Facility.findOne({ approvalStatus: 'approved' });
    if (!facility) {
      facility = await Facility.create({
        name: birthFacilityName || 'General Health Clinic',
        type: 'PHC',
        district: 'Central',
        state: 'National',
        approvalStatus: 'approved'
      });
    }

    const childUid = await generateUniqueChildUid();
    const child = new Child({
      childUid,
      name,
      dateOfBirth: new Date(dateOfBirth),
      gender,
      birthFacilityId: facility._id,
      guardianUserId: req.user._id,
      guardianMobileAtBirth: req.user.mobileNumber,
      duplicateStatus: 'none',
      isActive: true
    });

    await child.save();
    await detectDuplicates(child);

    await AuditLog.create({
      userId: req.user._id,
      action: 'CHILD_MANUAL_REGISTRATION',
      targetCollection: 'Child',
      targetId: child._id.toString(),
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'Child registered successfully.',
      child
    });
  } catch (err) {
    console.error('Manual Child Register Error:', err);
    res.status(500).json({ success: false, message: 'Failed to register child.' });
  }
});

// POST /api/children/link (Parent links existing hospital birth record to their account)
router.post('/link', requireAuth, [
  body('childUid').trim().notEmpty().withMessage('Child UID is required'),
  body('guardianMobileAtBirth').trim().notEmpty().withMessage('Guardian mobile number used at birth is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { childUid, guardianMobileAtBirth } = req.body;

    const child = await Child.findOne({
      childUid: childUid.trim().toUpperCase(),
      guardianMobileAtBirth: guardianMobileAtBirth.trim()
    }).populate('birthFacilityId');

    if (!child) {
      return res.status(404).json({
        success: false,
        message: 'No matching birth record found with this Child UID and verification mobile number.'
      });
    }

    if (child.guardianUserId && child.guardianUserId.toString() !== req.user._id.toString()) {
      return res.status(409).json({
        success: false,
        message: 'This child record is already linked to another parent account.'
      });
    }

    child.guardianUserId = req.user._id;
    await child.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'CHILD_LINKED_TO_PARENT',
      targetCollection: 'Child',
      targetId: child._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: `Successfully linked ${child.name}'s record to your account.`,
      child
    });
  } catch (err) {
    console.error('Link Child Error:', err);
    res.status(500).json({ success: false, message: 'Failed to link child record.' });
  }
});

// GET /api/children/mine (Get all children linked to current parent)
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const children = await Child.find({
      guardianUserId: req.user._id,
      isActive: true
    }).populate('birthFacilityId').sort({ createdAt: -1 });

    res.json({ success: true, children });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch children.' });
  }
});

// GET /api/children/search?query= (Staff / Admin search by UID, Name, or Mobile)
router.get('/search', requireAuth, requireRole(ROLES.STAFF, ROLES.ADMIN), async (req, res) => {
  try {
    const query = (req.query.query || '').trim();
    if (!query) {
      const recentChildren = await Child.find({ isActive: true })
        .populate('birthFacilityId')
        .populate('guardianUserId', 'name mobileNumber email')
        .sort({ createdAt: -1 })
        .limit(20);
      return res.json({ success: true, children: recentChildren });
    }

    const regex = new RegExp(query, 'i');
    const children = await Child.find({
      isActive: true,
      $or: [
        { childUid: regex },
        { name: regex },
        { guardianMobileAtBirth: regex }
      ]
    })
      .populate('birthFacilityId')
      .populate('guardianUserId', 'name mobileNumber email')
      .limit(30);

    res.json({ success: true, children });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
});

// GET /api/children/:id (Child profile details)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id)
      .populate('birthFacilityId')
      .populate('guardianUserId', 'name email mobileNumber whatsappNumber notificationPreferences');

    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    // Access check: Parents can only view their own child; staff/admin can view any
    if (req.user.role === ROLES.PARENT && String(child.guardianUserId?._id || child.guardianUserId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access denied to this child record.' });
    }

    res.json({ success: true, child });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error retrieving child.' });
  }
});

// GET /api/children/:id/timeline (Computes real-time UIP schedule timeline with status)
router.get('/:id/timeline', requireAuth, async (req, res) => {
  try {
    const child = await Child.findById(req.params.id).populate('birthFacilityId');
    if (!child) {
      return res.status(404).json({ success: false, message: 'Child not found.' });
    }

    const [verifiedRecords, allSchedules] = await Promise.all([
      VaccinationRecord.find({ childId: child._id, status: 'verified' })
        .populate('scheduleId')
        .populate('administeredFacilityId')
        .lean(),
      VaccineSchedule.find({ isActive: true }).lean()
    ]);

    const evaluated = evaluateChildSchedule(child, verifiedRecords, allSchedules);

    res.json({
      success: true,
      child: {
        id: child._id,
        childUid: child.childUid,
        name: child.name,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender,
        facility: child.birthFacilityId?.name
      },
      ...evaluated
    });
  } catch (err) {
    console.error('Timeline Error:', err);
    res.status(500).json({ success: false, message: 'Error computing immunization timeline.' });
  }
});

// POST /api/children/:id/check-duplicate (Trigger duplicate check manually)
router.post('/:id/check-duplicate', requireAuth, requireRole(ROLES.STAFF, ROLES.ADMIN), async (req, res) => {
  try {
    const child = await Child.findById(req.params.id);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found.' });

    await detectDuplicates(child);
    const flags = await DuplicateFlag.find({ childId: child._id }).populate('possibleMatchChildId');

    res.json({ success: true, duplicateStatus: child.duplicateStatus, flags });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to run duplicate check.' });
  }
});

module.exports = router;

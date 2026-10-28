/**
 * recordsRoutes.js
 * Vaccination records administration, verification with SHA-256 cryptographic hashing,
 * and AEFI adverse event reporting.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');

const VaccinationRecord = require('../models/VaccinationRecord');
const VaccineSchedule = require('../models/VaccineSchedule');
const Child = require('../models/Child');
const AefiReport = require('../models/AefiReport');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

/**
 * Computes deterministic SHA-256 hash for a verified vaccination record.
 */
function generateRecordHash(record, child, schedule) {
  const payload = [
    child.childUid,
    schedule.vaccineCode,
    new Date(record.dateAdministered).toISOString().split('T')[0],
    record.batchLotNumber || 'NO_BATCH',
    record.administeredFacilityId?.toString() || 'NO_FACILITY',
    record._id.toString()
  ].join('|');

  return crypto.createHash('sha256').update(payload).digest('hex');
}

// POST /api/records (Log administered vaccine or parent submission)
router.post('/', requireAuth, [
  body('childId').isMongoId().withMessage('Valid child ID is required'),
  body('scheduleId').isMongoId().withMessage('Valid vaccine schedule ID is required'),
  body('dateAdministered').isISO8601().withMessage('Valid administration date is required'),
  body('batchLotNumber').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { childId, scheduleId, dateAdministered, batchLotNumber, remarks, administeredFacilityId } = req.body;

    const [child, schedule] = await Promise.all([
      Child.findById(childId),
      VaccineSchedule.findById(scheduleId)
    ]);

    if (!child || !schedule) {
      return res.status(404).json({ success: false, message: 'Child or Vaccine Schedule not found.' });
    }

    // Check if record for this schedule already exists
    const existingRecord = await VaccinationRecord.findOne({
      childId,
      scheduleId,
      status: { $in: ['verified', 'pending_verification'] }
    });
    if (existingRecord) {
      return res.status(409).json({
        success: false,
        message: `A record for ${schedule.vaccineName} is already logged (${existingRecord.status}).`
      });
    }

    const isStaff = req.user.role === ROLES.STAFF || req.user.role === ROLES.ADMIN;
    const source = isStaff ? 'hw_administered' : 'parent_uploaded';
    const status = isStaff ? 'verified' : 'pending_verification';

    const recordUid = `REC-${child.childUid}-${schedule.vaccineCode}-${Date.now().toString(36).toUpperCase()}`;
    const facilityId = administeredFacilityId || (isStaff ? req.user.facilityId : child.birthFacilityId);

    const record = new VaccinationRecord({
      recordUid,
      childId,
      scheduleId,
      source,
      status,
      dateAdministered: new Date(dateAdministered),
      scheduledDueDate: new Date(new Date(child.dateOfBirth).getTime() + schedule.dueAgeDays * 24 * 60 * 60 * 1000),
      administeredFacilityId: facilityId,
      administeredByUserId: req.user._id,
      batchLotNumber: batchLotNumber || '',
      remarks: remarks || '',
      verifiedByUserId: isStaff ? req.user._id : null,
      verifiedAt: isStaff ? new Date() : null
    });

    if (isStaff) {
      record.recordHash = generateRecordHash(record, child, schedule);
    }

    await record.save();

    await AuditLog.create({
      userId: req.user._id,
      action: isStaff ? 'VACCINATION_LOGGED_VERIFIED' : 'VACCINATION_SUBMITTED_FOR_VERIFICATION',
      targetCollection: 'VaccinationRecord',
      targetId: record._id.toString(),
      ipAddress: req.ip,
      meta: { vaccineCode: schedule.vaccineCode, childUid: child.childUid }
    });

    res.status(201).json({
      success: true,
      message: isStaff ? 'Vaccination administered and cryptographically verified.' : 'Record submitted for verification.',
      record
    });
  } catch (err) {
    console.error('Add Record Error:', err);
    res.status(500).json({ success: false, message: 'Failed to record vaccination.' });
  }
});

// POST /api/records/:id/verify (Staff/Admin verifies a pending record)
router.post('/:id/verify', requireAuth, requireRole(ROLES.STAFF, ROLES.ADMIN), async (req, res) => {
  try {
    const { action = 'verified', remarks = '' } = req.body;
    const record = await VaccinationRecord.findById(req.params.id)
      .populate('childId')
      .populate('scheduleId');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Vaccination record not found.' });
    }

    if (action === 'rejected') {
      record.status = 'rejected';
      record.remarks = remarks || 'Verification rejected by health staff';
    } else {
      record.status = 'verified';
      record.verifiedByUserId = req.user._id;
      record.verifiedAt = new Date();
      record.recordHash = generateRecordHash(record, record.childId, record.scheduleId);
    }

    await record.save();

    await AuditLog.create({
      userId: req.user._id,
      action: `RECORD_VERIFICATION_${action.toUpperCase()}`,
      targetCollection: 'VaccinationRecord',
      targetId: record._id.toString(),
      ipAddress: req.ip
    });

    res.json({ success: true, message: `Record ${action}.`, record });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to verify record.' });
  }
});

// GET /api/records/child/:childId (Get records for a child)
router.get('/child/:childId', requireAuth, async (req, res) => {
  try {
    const records = await VaccinationRecord.find({ childId: req.params.childId })
      .populate('scheduleId')
      .populate('administeredFacilityId')
      .populate('administeredByUserId', 'name')
      .populate('verifiedByUserId', 'name')
      .sort({ dateAdministered: 1 });

    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve records.' });
  }
});

// POST /api/records/:id/aefi (Submit Adverse Events Following Immunization report)
router.post('/:id/aefi', requireAuth, [
  body('eventDescription').trim().notEmpty().withMessage('Description of adverse reaction is required'),
  body('severityCategory').isIn(['minor', 'severe', 'serious']).withMessage('Valid severity category required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { eventDescription, severityCategory, actionTaken, referralFacilityId, eventDatetime } = req.body;

    const record = await VaccinationRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Associated vaccination record not found.' });
    }

    const aefi = new AefiReport({
      recordId: record._id,
      reportedByUserId: req.user._id,
      eventDatetime: eventDatetime ? new Date(eventDatetime) : new Date(),
      eventDescription,
      severityCategory,
      actionTaken: actionTaken || '',
      followUpStatus: 'under_investigation',
      referralFacilityId: referralFacilityId || null
    });

    await aefi.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'AEFI_REPORT_SUBMITTED',
      targetCollection: 'AefiReport',
      targetId: aefi._id.toString(),
      ipAddress: req.ip,
      meta: { recordId: record._id, severityCategory }
    });

    res.status(201).json({
      success: true,
      message: 'Adverse event (AEFI) reported successfully and flagged for review.',
      aefi
    });
  } catch (err) {
    console.error('AEFI Error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit AEFI report.' });
  }
});

module.exports = router;

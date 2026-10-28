/**
 * qrRoutes.js
 * Digital QR Pass generation and resolution for quick clinic intake.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const QRCode = require('qrcode');

const QrToken = require('../models/QrToken');
const Child = require('../models/Child');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ROLES } = require('../config/constants');

// POST /api/qr/:childId/generate (Generate fresh QR pass token)
router.post('/:childId/generate', requireAuth, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId);
    if (!child) return res.status(404).json({ success: false, message: 'Child not found.' });

    // Revoke existing active tokens
    await QrToken.updateMany({ childId: child._id, isRevoked: false }, { $set: { isRevoked: true } });

    // Generate cryptographic opaque token
    const tokenValue = `VACCPASS_${child.childUid}_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    const qrToken = await QrToken.create({
      childId: child._id,
      tokenValue,
      expiresAt
    });

    const qrDataUrl = await QRCode.toDataURL(tokenValue, { width: 250, margin: 1 });

    res.json({
      success: true,
      tokenValue,
      expiresAt,
      qrDataUrl
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to generate QR pass.' });
  }
});

// POST /api/qr/resolve (Staff/Admin resolves scanned QR token)
router.post('/resolve', requireAuth, requireRole(ROLES.STAFF, ROLES.ADMIN), async (req, res) => {
  try {
    const { tokenValue } = req.body;
    if (!tokenValue) return res.status(400).json({ success: false, message: 'Token value is required.' });

    const qrToken = await QrToken.findOne({
      tokenValue: tokenValue.trim(),
      isRevoked: false,
      expiresAt: { $gt: new Date() }
    }).populate({
      path: 'childId',
      populate: [
        { path: 'birthFacilityId' },
        { path: 'guardianUserId', select: 'name mobileNumber email' }
      ]
    });

    if (!qrToken || !qrToken.childId) {
      return res.status(404).json({
        success: false,
        message: 'Invalid, expired, or revoked digital QR pass.'
      });
    }

    qrToken.lastUsedAt = new Date();
    qrToken.lastUsedByUserId = req.user._id;
    await qrToken.save();

    await AuditLog.create({
      userId: req.user._id,
      action: 'QR_PASS_SCANNED_RESOLVED',
      targetCollection: 'QrToken',
      targetId: qrToken._id.toString(),
      ipAddress: req.ip,
      meta: { childUid: qrToken.childId.childUid }
    });

    res.json({
      success: true,
      message: 'QR Pass successfully resolved.',
      child: qrToken.childId
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to resolve QR pass.' });
  }
});

module.exports = router;

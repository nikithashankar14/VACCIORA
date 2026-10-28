/**
 * authRoutes.js
 * Authentication, access requests, consent, and profile management.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const User = require('../models/User');
const AccessRequest = require('../models/AccessRequest');
const Facility = require('../models/Facility');
const AuditLog = require('../models/AuditLog');
const { requireAuth, requireRole, JWT_SECRET } = require('../middleware/auth');
const { deliverTemporaryPassword } = require('../services/notificationService');
const { ROLES, CONSENT_VERSION } = require('../config/constants');

// POST /api/auth/register (Parent self-registration with explicit consent)
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Full name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('mobileNumber').trim().notEmpty().withMessage('Mobile number is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('consentGiven').isBoolean().equals('true').withMessage('Explicit informed consent is required to register')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { name, email, mobileNumber, whatsappNumber, password, preferredLanguage } = req.body;

    const existingUser = await User.findOne({
      $or: [{ mobileNumber }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email
          ? 'An account with this email already exists.'
          : 'An account with this mobile number already exists.'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email,
      mobileNumber,
      whatsappNumber: whatsappNumber || mobileNumber,
      passwordHash,
      role: ROLES.PARENT,
      preferredLanguage: preferredLanguage || 'en',
      consentGiven: true,
      consentGivenAt: new Date(),
      consentVersion: CONSENT_VERSION,
      accountStatus: 'active',
      requirePasswordChange: false,
      notificationPreferences: {
        webApp: true,
        sms: true,
        email: true,
        whatsapp: true
      }
    });

    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: 'PARENT_REGISTERED',
      targetCollection: 'User',
      targetId: user._id.toString(),
      ipAddress: req.ip,
      meta: { email: user.email, mobile: user.mobileNumber }
    });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        role: user.role,
        requirePasswordChange: user.requirePasswordChange,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// POST /api/auth/access-requests (Facility Staff / Admin access request)
router.post('/access-requests', [
  body('requestedRole').isIn([ROLES.STAFF, ROLES.ADMIN]).withMessage('Role must be staff or admin'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { requestedRole, name, email, mobile, facilityName, note } = req.body;

    const existingUser = await User.findOne({
      $or: [{ mobileNumber: mobile }, { email }]
    });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'An active user with this mobile or email already exists.' });
    }

    const accessRequest = await AccessRequest.create({
      requestedRole,
      name,
      email,
      mobile,
      facilityName: facilityName || null,
      note: note || '',
      status: 'pending'
    });

    await AuditLog.create({
      action: 'ACCESS_REQUEST_SUBMITTED',
      targetCollection: 'AccessRequest',
      targetId: accessRequest._id.toString(),
      ipAddress: req.ip,
      meta: { requestedRole, email, mobile, facilityName }
    });

    res.status(201).json({
      success: true,
      message: 'Access request submitted successfully. An administrator will review your application.',
      requestId: accessRequest._id
    });
  } catch (err) {
    console.error('Access Request Error:', err);
    res.status(500).json({ success: false, message: 'Server error creating access request.' });
  }
});

// GET /api/auth/admin/access-requests (Admin views pending and past access requests)
router.get('/admin/access-requests', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const requests = await AccessRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to retrieve access requests.' });
  }
});

// PATCH /api/auth/admin/access-requests/:id (Admin approves/rejects request)
router.patch('/admin/access-requests/:id', requireAuth, requireRole(ROLES.ADMIN), async (req, res) => {
  try {
    const { action } = req.body; // 'approve' | 'reject'
    const request = await AccessRequest.findById(req.params.id);

    if (!request) {
      return res.status(404).json({ success: false, message: 'Access request not found.' });
    }
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Request is already ${request.status}.` });
    }

    if (action === 'reject') {
      request.status = 'rejected';
      request.reviewedByUserId = req.user._id;
      request.reviewedAt = new Date();
      await request.save();

      await AuditLog.create({
        userId: req.user._id,
        action: 'ACCESS_REQUEST_REJECTED',
        targetCollection: 'AccessRequest',
        targetId: request._id.toString(),
        ipAddress: req.ip
      });

      return res.json({ success: true, message: 'Access request rejected.' });
    }

    if (action === 'approve') {
      // Find or create facility if facilityName was provided for staff
      let facilityId = null;
      if (request.facilityName) {
        let facility = await Facility.findOne({ name: new RegExp(`^${request.facilityName.trim()}$`, 'i') });
        if (!facility) {
          facility = await Facility.create({
            name: request.facilityName.trim(),
            type: 'hospital',
            district: 'Central',
            state: 'National',
            approvalStatus: 'approved',
            isActive: true
          });
        }
        facilityId = facility._id;
      }

      // Generate cryptographically random temporary password
      const tempPassword = `Vacciora@${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(tempPassword, salt);

      const newUser = new User({
        name: request.name,
        email: request.email,
        mobileNumber: request.mobile,
        whatsappNumber: request.mobile,
        passwordHash,
        role: request.requestedRole,
        facilityId,
        consentGiven: true,
        consentGivenAt: new Date(),
        consentVersion: CONSENT_VERSION,
        accountStatus: 'active',
        requirePasswordChange: true, // MUST change on first login!
        isActive: true,
        notificationPreferences: {
          webApp: true,
          sms: true,
          email: true,
          whatsapp: true
        }
      });

      await newUser.save();

      request.status = 'approved';
      request.reviewedByUserId = req.user._id;
      request.reviewedAt = new Date();
      request.createdUserId = newUser._id;
      await request.save();

      // Deliver temporary password via notification sender
      await deliverTemporaryPassword(newUser, tempPassword);

      await AuditLog.create({
        userId: req.user._id,
        action: 'ACCESS_REQUEST_APPROVED',
        targetCollection: 'User',
        targetId: newUser._id.toString(),
        ipAddress: req.ip,
        meta: { newUserId: newUser._id, role: newUser.role }
      });

      return res.json({
        success: true,
        message: 'Access request approved. Account created and temporary password delivered.',
        tempPasswordForDev: process.env.NODE_ENV !== 'production' ? tempPassword : undefined
      });
    }

    res.status(400).json({ success: false, message: 'Invalid action. Must be approve or reject.' });
  } catch (err) {
    console.error('Approve Access Request Error:', err);
    res.status(500).json({ success: false, message: 'Error processing access request.' });
  }
});

// POST /api/auth/login (Unified login with role detection and password change enforcement)
router.post('/login', [
  body('identifier').trim().notEmpty().withMessage('Mobile or email is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { mobileNumber: identifier }
      ]
    }).populate('facilityId');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, requirePasswordChange: user.requirePasswordChange },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    await AuditLog.create({
      userId: user._id,
      action: 'USER_LOGIN',
      targetCollection: 'User',
      targetId: user._id.toString(),
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token,
      requirePasswordChange: user.requirePasswordChange,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        role: user.role,
        facility: user.facilityId ? {
          id: user.facilityId._id,
          name: user.facilityId.name,
          type: user.facilityId.type
        } : null,
        notificationPreferences: user.notificationPreferences
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// POST /api/auth/change-password (Mandatory for new staff/admin accounts or normal password update)
router.post('/change-password', requireAuth, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id);

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.requirePasswordChange = false; // Successfully cleared
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: 'PASSWORD_CHANGED',
      targetCollection: 'User',
      targetId: user._id.toString(),
      ipAddress: req.ip
    });

    // Issue refreshed token without requirePasswordChange
    const token = jwt.sign(
      { id: user._id, role: user.role, requirePasswordChange: false },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Password updated successfully.',
      token,
      requirePasswordChange: false
    });
  } catch (err) {
    console.error('Change Password Error:', err);
    res.status(500).json({ success: false, message: 'Server error changing password.' });
  }
});

// POST /api/auth/consent (Record explicit consent)
router.post('/consent', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.consentGiven = true;
    user.consentGivenAt = new Date();
    user.consentVersion = CONSENT_VERSION;
    await user.save();

    res.json({ success: true, message: 'Consent acknowledged successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update consent.' });
  }
});

// GET /api/auth/me (Get profile)
router.get('/me', requireAuth, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      mobileNumber: req.user.mobileNumber,
      whatsappNumber: req.user.whatsappNumber,
      role: req.user.role,
      facility: req.user.facilityId,
      notificationPreferences: req.user.notificationPreferences,
      requirePasswordChange: req.user.requirePasswordChange,
      consentGiven: req.user.consentGiven
    }
  });
});

// PATCH /api/auth/notification-preferences (Update communication channels)
router.patch('/notification-preferences', requireAuth, async (req, res) => {
  try {
    const { webApp, sms, email, whatsapp } = req.body;
    const user = await User.findById(req.user._id);

    if (webApp !== undefined) user.notificationPreferences.webApp = Boolean(webApp);
    if (sms !== undefined) user.notificationPreferences.sms = Boolean(sms);
    if (email !== undefined) user.notificationPreferences.email = Boolean(email);
    if (whatsapp !== undefined) user.notificationPreferences.whatsapp = Boolean(whatsapp);

    await user.save();
    res.json({
      success: true,
      message: 'Notification preferences updated.',
      notificationPreferences: user.notificationPreferences
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update notification preferences.' });
  }
});

module.exports = router;

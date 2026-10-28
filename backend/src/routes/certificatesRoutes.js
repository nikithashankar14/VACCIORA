/**
 * certificatesRoutes.js
 * Immunization certificate generation, authenticated PDF download,
 * and public cryptographic verification.
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');

const Certificate = require('../models/Certificate');
const Child = require('../models/Child');
const VaccinationRecord = require('../models/VaccinationRecord');
const { requireAuth } = require('../middleware/auth');
const { generateImmunizationCertificate, computeCertificateHash } = require('../services/certificateService');

// POST /api/certificates/:childId/generate (Generate fresh certificate for child)
router.post('/:childId/generate', requireAuth, async (req, res) => {
  try {
    const child = await Child.findById(req.params.childId).populate('birthFacilityId');
    if (!child) return res.status(404).json({ success: false, message: 'Child not found.' });

    const records = await VaccinationRecord.find({ childId: child._id, status: 'verified' })
      .populate('scheduleId')
      .populate('administeredFacilityId')
      .sort({ dateAdministered: 1 });

    const result = await generateImmunizationCertificate({
      child,
      records,
      facility: child.birthFacilityId
    });

    res.json({
      success: true,
      message: 'Certificate generated successfully.',
      certificateUid: result.certificateUid,
      recordHash: result.recordHash,
      certificateId: result.certificate._id
    });
  } catch (err) {
    console.error('Certificate Generation Error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate certificate.' });
  }
});

// GET /api/certificates/child/:childId (Get latest certificate info for child)
router.get('/child/:childId', requireAuth, async (req, res) => {
  try {
    const cert = await Certificate.findOne({ childId: req.params.childId })
      .sort({ createdAt: -1 });

    if (!cert) {
      return res.status(404).json({ success: false, message: 'No certificate found for this child.' });
    }

    res.json({ success: true, certificate: cert });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to find certificate.' });
  }
});

// GET /api/certificates/:id/download (Authenticated download of PDF certificate)
router.get('/:id/download', requireAuth, async (req, res) => {
  try {
    const cert = await Certificate.findById(req.params.id);
    if (!cert || !fs.existsSync(cert.filePath)) {
      return res.status(404).json({ success: false, message: 'Certificate PDF file not found.' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${cert.certificateUid}.pdf"`);

    const readStream = fs.createReadStream(cert.filePath);
    readStream.pipe(res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to stream certificate file.' });
  }
});

// GET /api/certificates/verify/:identifier (Public/Staff verification of certificate UID or SHA-256 hash)
router.get('/verify/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier.trim();

    const cert = await Certificate.findOne({
      $or: [
        { certificateUid: identifier },
        { recordHash: identifier }
      ]
    }).populate({
      path: 'childId',
      populate: { path: 'birthFacilityId' }
    });

    if (!cert) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Invalid certificate. No record matching this identifier or SHA-256 hash exists in Vacciora registry.'
      });
    }

    res.json({
      success: true,
      verified: true,
      certificateUid: cert.certificateUid,
      recordHash: cert.recordHash,
      generatedAt: cert.generatedAt,
      child: {
        childUid: cert.childId.childUid,
        name: cert.childId.name,
        gender: cert.childId.gender,
        birthFacility: cert.childId.birthFacilityId?.name
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification error.' });
  }
});

module.exports = router;

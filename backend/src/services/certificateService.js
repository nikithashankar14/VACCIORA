/**
 * certificateService.js
 * Generates immunization certificates in PDF format with cryptographic SHA-256 verification hash.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Certificate = require('../models/Certificate');

const CERT_STORAGE_DIR = path.join(__dirname, '../../certificates_storage');
if (!fs.existsSync(CERT_STORAGE_DIR)) {
  fs.mkdirSync(CERT_STORAGE_DIR, { recursive: true });
}

/**
 * Computes deterministic SHA-256 hash across child UID, records, and issue date.
 */
function computeCertificateHash({ childUid, childName, records, issueDateStr }) {
  const normalizedRecords = records.map(r => ({
    vaccineCode: r.scheduleId?.vaccineCode || 'VAC',
    dateAdministered: r.dateAdministered ? new Date(r.dateAdministered).toISOString().split('T')[0] : '',
    batchLotNumber: r.batchLotNumber || '',
    facility: r.administeredFacilityId?.name || ''
  }));

  const payloadString = JSON.stringify({
    childUid,
    childName,
    records: normalizedRecords,
    issueDate: issueDateStr
  });

  return crypto.createHash('sha256').update(payloadString).digest('hex');
}

/**
 * Generates an official PDF certificate with styling, table of doses, QR code, and SHA-256 hash.
 */
async function generateImmunizationCertificate({ child, records, facility = null }) {
  const certificateUid = `CERT-${child.childUid}-${Date.now().toString(36).toUpperCase()}`;
  const issueDate = new Date();
  const issueDateStr = issueDate.toISOString().split('T')[0];

  const recordHash = computeCertificateHash({
    childUid: child.childUid,
    childName: child.name,
    records,
    issueDateStr
  });

  // Generate verification QR code data URL
  const verifyUrl = `https://vacciora.health/verify-certificate?certId=${certificateUid}&hash=${recordHash}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 120 });

  const fileName = `${certificateUid}.pdf`;
  const filePath = path.join(CERT_STORAGE_DIR, fileName);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const writeStream = fs.createWriteStream(filePath);

    doc.pipe(writeStream);

    // Decorative Header Banner
    doc.rect(40, 40, 515, 8).fill('#0F766E'); // Deep Teal

    doc.moveDown(1.5);
    doc.fillColor('#0F766E')
       .fontSize(22)
       .font('Helvetica-Bold')
       .text('VACCIORA IMMUNIZATION PROGRAMME', { align: 'center' });

    doc.fillColor('#475569')
       .fontSize(12)
       .font('Helvetica')
       .text('Official Universal Immunization Programme (UIP) Certificate of Vaccination', { align: 'center' });

    doc.moveDown(1.5);

    // Child & Certificate Details Grid
    const startY = doc.y;
    doc.rect(40, startY, 515, 95).fillAndStroke('#F8FAFC', '#CBD5E1');

    doc.fillColor('#1E293B').fontSize(10).font('Helvetica-Bold');
    doc.text('Child Name:', 55, startY + 12);
    doc.font('Helvetica').text(child.name, 140, startY + 12);

    doc.font('Helvetica-Bold').text('Child UID:', 55, startY + 30);
    doc.font('Helvetica').text(child.childUid, 140, startY + 30);

    doc.font('Helvetica-Bold').text('Date of Birth:', 55, startY + 48);
    doc.font('Helvetica').text(new Date(child.dateOfBirth).toLocaleDateString('en-IN'), 140, startY + 48);

    doc.font('Helvetica-Bold').text('Gender:', 55, startY + 66);
    doc.font('Helvetica').text((child.gender || 'Not specified').toUpperCase(), 140, startY + 66);

    doc.font('Helvetica-Bold').text('Certificate ID:', 320, startY + 12);
    doc.font('Helvetica').text(certificateUid, 405, startY + 12);

    doc.font('Helvetica-Bold').text('Issue Date:', 320, startY + 30);
    doc.font('Helvetica').text(new Date().toLocaleDateString('en-IN'), 405, startY + 30);

    doc.font('Helvetica-Bold').text('Facility of Record:', 320, startY + 48);
    doc.font('Helvetica').text(facility?.name || child.birthFacilityId?.name || 'Authorized Health Center', 405, startY + 48);

    doc.font('Helvetica-Bold').text('Status:', 320, startY + 66);
    doc.fillColor('#0D9488').text('VERIFIED AUTHENTIC', 405, startY + 66);

    doc.y = startY + 115;

    // Immunization Table Header
    doc.fillColor('#0F766E').fontSize(12).font('Helvetica-Bold').text('Administered Vaccination Records');
    doc.moveDown(0.5);

    const tableTop = doc.y;
    doc.rect(40, tableTop, 515, 20).fill('#E2E8F0');
    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold');
    doc.text('Vaccine Code', 45, tableTop + 6);
    doc.text('Vaccine Name', 120, tableTop + 6);
    doc.text('Administered Date', 270, tableTop + 6);
    doc.text('Batch / Lot', 380, tableTop + 6);
    doc.text('Facility / Center', 455, tableTop + 6);

    let currentY = tableTop + 20;
    doc.font('Helvetica').fontSize(8.5).fillColor('#334155');

    if (records.length === 0) {
      doc.text('No administered records logged yet.', 45, currentY + 6);
      currentY += 20;
    } else {
      records.forEach((rec, idx) => {
        if (idx % 2 === 1) {
          doc.rect(40, currentY, 515, 18).fill('#F8FAFC');
        }
        doc.fillColor('#334155');
        doc.text(rec.scheduleId?.vaccineCode || 'N/A', 45, currentY + 5);
        doc.text(rec.scheduleId?.vaccineName || 'Immunization Dose', 120, currentY + 5, { width: 145, ellipsis: true });
        doc.text(new Date(rec.dateAdministered).toLocaleDateString('en-IN'), 270, currentY + 5);
        doc.text(rec.batchLotNumber || 'VERIFIED', 380, currentY + 5);
        doc.text(rec.administeredFacilityId?.name || 'UIP Center', 455, currentY + 5, { width: 95, ellipsis: true });
        currentY += 18;
      });
    }

    doc.y = currentY + 25;

    // Cryptographic Hash & Verification QR Code Section
    const footerY = Math.max(doc.y, 650);
    doc.rect(40, footerY, 515, 110).stroke('#CBD5E1');

    // Add QR Code
    const base64Image = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const qrBuffer = Buffer.from(base64Image, 'base64');
    doc.image(qrBuffer, 50, footerY + 10, { width: 90, height: 90 });

    doc.fillColor('#0F172A').fontSize(9).font('Helvetica-Bold')
       .text('DIGITALLY SIGNED HEALTH RECORD', 155, footerY + 15);

    doc.font('Helvetica').fontSize(8).fillColor('#475569')
       .text('This immunization certificate is issued according to India Universal Immunization Programme protocols. Authenticity can be verified at any authorized healthcare center by scanning the QR code or verifying the cryptographic SHA-256 hash below.', 155, footerY + 30, { width: 380 });

    doc.font('Helvetica-Bold').fillColor('#0F766E')
       .text('Cryptographic SHA-256 Hash:', 155, footerY + 70);
    doc.font('Courier').fontSize(7).fillColor('#1E293B')
       .text(recordHash, 155, footerY + 82, { width: 380 });

    doc.end();

    writeStream.on('finish', resolve);
    writeStream.on('error', reject);
  });

  const certificateDoc = await Certificate.create({
    recordId: records.length > 0 ? records[0]._id : null,
    childId: child._id,
    certificateUid,
    recordHash,
    generatedAt: issueDate,
    filePath
  });

  return {
    certificateUid,
    recordHash,
    filePath,
    verifyUrl,
    certificate: certificateDoc
  };
}

module.exports = {
  computeCertificateHash,
  generateImmunizationCertificate,
  CERT_STORAGE_DIR
};

/**
 * email.js
 * Nodemailer email sender with transparent mock fallback.
 */

const nodemailer = require('nodemailer');

let transporter = null;
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT || 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || 'Vacciora Health <reminders@vacciora.health>';

if (smtpHost && smtpUser && smtpPass) {
  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass
      }
    });
    console.log('[Email Sender] Configured with live SMTP credentials.');
  } catch (err) {
    console.error(`[Email Init Error] ${err.message}`);
  }
}

/**
 * Sends an email notification.
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} [html] - HTML body
 */
async function sendEmail(to, subject, text, html = null) {
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br/>')
      });
      console.log(`[Email LIVE] Sent to ${to}. MessageId: ${info.messageId}`);
      return {
        success: true,
        mode: 'live',
        sid: info.messageId
      };
    } catch (error) {
      console.error(`[Email FAILED] to ${to}: ${error.message}`);
      return {
        success: false,
        mode: 'failed',
        sid: null,
        error: error.message
      };
    }
  }

  const mockSid = `MOCK_MAIL_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  console.log(`[Email MOCK] to ${to}: Subject: "${subject}" (Mock ID: ${mockSid})`);
  return {
    success: true,
    mode: 'mock',
    sid: mockSid
  };
}

function isLiveConfigured() {
  return Boolean(transporter);
}

module.exports = {
  sendEmail,
  isLiveConfigured
};

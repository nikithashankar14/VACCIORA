/**
 * sms.js
 * Twilio SMS sender with transparent mock fallback for local development.
 */

const twilio = require('twilio');

let twilioClient = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const smsFrom = process.env.TWILIO_SMS_FROM;

if (accountSid && authToken && smsFrom) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('[Twilio SMS] Initialized with live account credentials.');
  } catch (err) {
    console.error(`[Twilio SMS Init Error] ${err.message}`);
  }
}

/**
 * Sends an SMS to a recipient mobile number.
 * @param {string} to - Destination phone number with country code (e.g. +919876543210)
 * @param {string} message - Message text body
 * @returns {Promise<{success: boolean, mode: 'live'|'mock'|'failed', sid: string, error?: string}>}
 */
async function sendSms(to, message) {
  const normalizedTo = to.startsWith('+') ? to : `+91${to.replace(/\D/g, '')}`;

  if (twilioClient && smsFrom) {
    try {
      const res = await twilioClient.messages.create({
        body: message,
        from: smsFrom,
        to: normalizedTo
      });
      console.log(`[Twilio SMS LIVE] Sent to ${normalizedTo}. SID: ${res.sid}`);
      return {
        success: true,
        mode: 'live',
        sid: res.sid
      };
    } catch (error) {
      console.error(`[Twilio SMS FAILED] to ${normalizedTo}: ${error.message}`);
      return {
        success: false,
        mode: 'failed',
        sid: null,
        error: error.message
      };
    }
  }

  // Mock delivery for local development without credentials
  const mockSid = `MOCK_SMS_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  console.log(`[Twilio SMS MOCK] to ${normalizedTo}: "${message}" (Mock SID: ${mockSid})`);
  return {
    success: true,
    mode: 'mock',
    sid: mockSid
  };
}

function isLiveConfigured() {
  return Boolean(twilioClient && smsFrom);
}

module.exports = {
  sendSms,
  isLiveConfigured
};

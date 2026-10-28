/**
 * whatsapp.js
 * Multi-provider WhatsApp sender:
 * Supports CallMeBot (instant free-form text with zero Meta approval restrictions)
 * and falls back to Twilio WhatsApp if configured, or transparent local mock.
 */

const twilio = require('twilio');

let twilioClient = null;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+17372508034';
const callmebotApiKey = process.env.CALLMEBOT_API_KEY;

if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
  } catch (err) {
    console.error(`[Twilio WhatsApp Init Error] ${err.message}`);
  }
}

/**
 * Formats standard Vacciora vaccination reminder text.
 */
function formatReminderText(parentName, childName, vaccineName, dueDateStr) {
  return `Hello ${parentName},\n\nReminder: ${childName}'s ${vaccineName} vaccination is due on ${dueDateStr}.\n\nPlease visit your vaccination centre on the scheduled date.\n\n- Vacciora`;
}

/**
 * Sends a WhatsApp message via CallMeBot Free API or Twilio.
 * 
 * @param {string} to - Destination phone number (e.g. +918668101427 or 8668101427)
 * @param {string|Object} messageOrParams - Free-text string OR template params object:
 *   { parentName, childName, vaccineName, dueDateStr }
 * @returns {Promise<{success: boolean, mode: 'live'|'mock'|'failed', sid: string, error?: string}>}
 */
async function sendWhatsApp(to, messageOrParams) {
  const cleanNumber = to.replace(/\D/g, '');
  // Format for international calls: e.g. 918668101427
  const intlNumber = cleanNumber.startsWith('91') && cleanNumber.length === 12 ? cleanNumber : `91${cleanNumber}`;
  const normalizedNumber = `+${intlNumber}`;
  const whatsappRecipient = `whatsapp:${normalizedNumber}`;

  let bodyText = '';
  if (typeof messageOrParams === 'string') {
    bodyText = messageOrParams;
  } else {
    const { parentName = 'Parent', childName = 'Child', vaccineName = 'Vaccine', dueDateStr = 'soon' } = messageOrParams;
    bodyText = formatReminderText(parentName, childName, vaccineName, dueDateStr);
  }

  // 1. Preferred: CallMeBot Free API (Exact custom message, no template restrictions)
  const apiKey = process.env.CALLMEBOT_API_KEY;
  if (apiKey) {
    try {
      const encodedText = encodeURIComponent(bodyText);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${intlNumber}&text=${encodedText}&apikey=${apiKey}`;
      const response = await fetch(url);
      const responseText = await response.text();

      if (response.ok && !responseText.toLowerCase().includes('error')) {
        const sid = `CMB_${Date.now()}`;
        console.log(`[CallMeBot WhatsApp LIVE] Sent to ${intlNumber}. Result: ${responseText.slice(0, 80)}`);
        return {
          success: true,
          mode: 'live',
          sid
        };
      } else {
        console.warn(`[CallMeBot WhatsApp Response] ${responseText.slice(0, 150)}`);
        // If CallMeBot returned an error, log it and try fallback
      }
    } catch (cmbErr) {
      console.error(`[CallMeBot Request Failed] ${cmbErr.message}`);
    }
  }

  // 2. Fallback: Twilio WhatsApp (if configured)
  if (twilioClient && accountSid) {
    try {
      const payload = {
        from: whatsappFrom,
        to: whatsappRecipient
      };

      if (process.env.TWILIO_WHATSAPP_CONTENT_SID) {
        const { parentName = 'Parent', childName = 'Child', vaccineName = 'Vaccine', dueDateStr = 'soon' } =
          typeof messageOrParams === 'object' ? messageOrParams : {};
        payload.contentSid = process.env.TWILIO_WHATSAPP_CONTENT_SID;
        payload.contentVariables = JSON.stringify({
          "1": parentName,
          "2": childName,
          "3": vaccineName,
          "4": dueDateStr
        });
      } else {
        payload.body = bodyText;
      }

      const res = await twilioClient.messages.create(payload);
      console.log(`[Twilio WhatsApp LIVE] Sent to ${whatsappRecipient}. SID: ${res.sid}`);
      return {
        success: true,
        mode: 'live',
        sid: res.sid
      };
    } catch (error) {
      console.error(`[Twilio WhatsApp FAILED] to ${whatsappRecipient}: ${error.message}`);
      return {
        success: false,
        mode: 'failed',
        sid: null,
        error: error.message
      };
    }
  }

  // 3. Mock fallback for offline/local development
  const mockSid = `MOCK_WA_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  console.log(`[WhatsApp MOCK] to ${whatsappRecipient}: "${bodyText}" (Mock SID: ${mockSid})`);
  return {
    success: true,
    mode: 'mock',
    sid: mockSid
  };
}

function isLiveConfigured() {
  return Boolean(process.env.CALLMEBOT_API_KEY || (twilioClient && accountSid));
}

module.exports = {
  sendWhatsApp,
  formatReminderText,
  isLiveConfigured
};

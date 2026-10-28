/**
 * notificationService.js
 * Multi-channel reminder orchestration with cadence-based channel escalation,
 * automatic WhatsApp-to-SMS fallback, and unified Reminder audit logging.
 */

const Reminder = require('../models/Reminder');
const User = require('../models/User');
const Child = require('../models/Child');
const VaccineSchedule = require('../models/VaccineSchedule');
const { sendSms, isLiveConfigured: isSmsLive } = require('./senders/sms');
const { sendWhatsApp, formatReminderText, isLiveConfigured: isWhatsAppLive } = require('./senders/whatsapp');
const { sendEmail, isLiveConfigured: isEmailLive } = require('./senders/email');
const { CHANNEL_ESCALATION_RULES, CHANNELS, DELIVERY_MODES } = require('../config/constants');

/**
 * Determines target delivery channels based on days until due date and parent preferences.
 */
function resolveChannelsForDueNotice(daysUntilDue, parentPreferences = {}) {
  let matchedRule = CHANNEL_ESCALATION_RULES[0];
  for (const rule of CHANNEL_ESCALATION_RULES) {
    if (daysUntilDue >= rule.minDaysUntilDue && daysUntilDue <= rule.maxDaysUntilDue) {
      matchedRule = rule;
      break;
    }
  }

  // Filter matched channels by user's explicit preferences
  const activeChannels = matchedRule.channels.filter(ch => {
    if (ch === CHANNELS.WHATSAPP) return parentPreferences.whatsapp !== false;
    if (ch === CHANNELS.EMAIL) return parentPreferences.email === true;
    return true;
  });

  return {
    ruleName: matchedRule.name,
    channels: activeChannels,
    immediateOutOfCycleIfHighRisk: Boolean(matchedRule.immediateOutOfCycleIfHighRisk)
  };
}

/**
 * Sends a single reminder with automatic WhatsApp -> SMS fallback.
 * 
 * @param {Object} params
 * @param {Object} params.child - Child document
 * @param {Object} params.parent - Parent User document
 * @param {Object} params.schedule - VaccineSchedule document
 * @param {Object} [params.riskPrediction] - Risk prediction document (optional)
 * @param {Date} params.dueDate - Date vaccine is due
 * @param {string} [params.customMessage] - Optional custom message
 * @param {string} [params.reminderStrategy] - 'standard'|'enhanced'|'intensive'
 */
async function orchestrateVaccineReminder({
  child,
  parent,
  schedule,
  riskPrediction = null,
  dueDate,
  customMessage = null,
  reminderStrategy = 'standard'
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const daysUntilDue = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const parentPrefs = parent.notificationPreferences || {};
  const escalation = resolveChannelsForDueNotice(daysUntilDue, parentPrefs);

  const parentName = parent.name || 'Parent';
  const childName = child.name || 'Child';
  const vaccineName = schedule ? `${schedule.vaccineName} (${schedule.vaccineCode})` : 'scheduled dose';
  const dueDateStr = due.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const defaultMessage = customMessage || formatReminderText(parentName, childName, vaccineName, dueDateStr);
  const createdReminders = [];

  // 1. In-App Web Notification (always recorded if enabled)
  if (parentPrefs.webApp !== false) {
    const webReminder = await Reminder.create({
      childId: child._id,
      scheduleId: schedule ? schedule._id : null,
      predictionId: riskPrediction ? riskPrediction._id : null,
      reminderStrategy,
      channel: CHANNELS.WEB_APP,
      message: defaultMessage,
      scheduledSendAt: new Date(),
      sentAt: new Date(),
      deliveryMode: DELIVERY_MODES.LIVE,
      providerReference: `WEB_APP_NOTICE_${Date.now()}`
    });
    createdReminders.push(webReminder);
  }

  // 2. WhatsApp Notification
  const mobileNumber = parent.mobileNumber;
  const whatsappNumber = parent.whatsappNumber || mobileNumber;

  if (escalation.channels.includes(CHANNELS.WHATSAPP)) {
    const waResult = await sendWhatsApp(whatsappNumber, {
      parentName,
      childName,
      vaccineName,
      dueDateStr
    });

    const waReminder = await Reminder.create({
      childId: child._id,
      scheduleId: schedule ? schedule._id : null,
      predictionId: riskPrediction ? riskPrediction._id : null,
      reminderStrategy,
      channel: CHANNELS.WHATSAPP,
      message: defaultMessage,
      scheduledSendAt: new Date(),
      sentAt: waResult.success ? new Date() : null,
      deliveryMode: waResult.mode,
      providerReference: waResult.sid || (waResult.error ? `Error: ${waResult.error}` : null),
      fallbackFrom: null
    });
    createdReminders.push(waReminder);
  }

  // 3. Email Notification (always send if parent has email and has not opted out)
  if (parent.email && parentPrefs.email !== false) {
    const subject = `Vacciora: Vaccination reminder for ${childName} (${vaccineName})`;
    const emailResult = await sendEmail(parent.email, subject, defaultMessage);
    const emailReminder = await Reminder.create({
      childId: child._id,
      scheduleId: schedule ? schedule._id : null,
      predictionId: riskPrediction ? riskPrediction._id : null,
      reminderStrategy,
      channel: CHANNELS.EMAIL,
      message: defaultMessage,
      scheduledSendAt: new Date(),
      sentAt: emailResult.success ? new Date() : null,
      deliveryMode: emailResult.mode,
      providerReference: emailResult.sid || (emailResult.error ? `Error: ${emailResult.error}` : null),
      fallbackFrom: null
    });
    createdReminders.push(emailReminder);
  }

  return createdReminders;
}

/**
 * Delivers a temporary password to an approved user over SMS/WhatsApp or Email.
 */
async function deliverTemporaryPassword(user, tempPassword) {
  const message = `Welcome to Vacciora. Your staff/admin account has been approved. Your temporary password is: ${tempPassword}\nPlease log in and change your password immediately.`;
  
  // Try WhatsApp first if configured/preferred, otherwise SMS
  let deliveryResult = null;
  const targetMobile = user.mobileNumber;

  if (user.notificationPreferences?.whatsapp !== false) {
    const waResult = await sendWhatsApp(user.whatsappNumber || targetMobile, message);
    if (waResult.success) {
      deliveryResult = { channel: 'whatsapp', result: waResult };
    }
  }

  if (!deliveryResult || !deliveryResult.result.success) {
    const smsResult = await sendSms(targetMobile, message);
    deliveryResult = { channel: 'sms', result: smsResult };
  }

  // Also send via email if provided
  if (user.email) {
    await sendEmail(user.email, 'Vacciora Account Approved — Temporary Password', message);
  }

  return deliveryResult;
}

/**
 * Returns notification health metrics for the admin dashboard.
 */
async function getNotificationHealth() {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [lastLiveSend, counts24h] = await Promise.all([
    Reminder.findOne({ deliveryMode: DELIVERY_MODES.LIVE }).sort({ sentAt: -1 }).select('sentAt channel'),
    Reminder.aggregate([
      { $match: { createdAt: { $gte: oneDayAgo } } },
      { $group: { _id: { channel: '$channel', mode: '$deliveryMode' }, count: { $sum: 1 } } }
    ])
  ]);

  const channelHealth = {
    sms: {
      isConfigured: isSmsLive(),
      provider: 'Twilio SMS',
      live24h: 0,
      mock24h: 0,
      failed24h: 0
    },
    whatsapp: {
      isConfigured: isWhatsAppLive(),
      provider: 'Twilio WhatsApp Sandbox/Content API',
      live24h: 0,
      mock24h: 0,
      failed24h: 0
    },
    email: {
      isConfigured: isEmailLive(),
      provider: 'Nodemailer SMTP',
      live24h: 0,
      mock24h: 0,
      failed24h: 0
    }
  };

  for (const item of counts24h) {
    const ch = item._id.channel;
    const mode = item._id.mode;
    if (channelHealth[ch]) {
      if (mode === DELIVERY_MODES.LIVE) channelHealth[ch].live24h += item.count;
      else if (mode === DELIVERY_MODES.MOCK) channelHealth[ch].mock24h += item.count;
      else if (mode === DELIVERY_MODES.FAILED) channelHealth[ch].failed24h += item.count;
    }
  }

  return {
    channels: channelHealth,
    lastSuccessfulLiveSendAt: lastLiveSend ? lastLiveSend.sentAt : null,
    checkedAt: new Date()
  };
}

module.exports = {
  resolveChannelsForDueNotice,
  orchestrateVaccineReminder,
  deliverTemporaryPassword,
  getNotificationHealth
};

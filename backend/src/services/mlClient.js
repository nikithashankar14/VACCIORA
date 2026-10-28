/**
 * mlClient.js
 * Client interface for the Python ML microservice with cold-start gating
 * and rule-based JavaScript fallback.
 */

const RiskPrediction = require('../models/RiskPrediction');
const VaccinationRecord = require('../models/VaccinationRecord');
const Reminder = require('../models/Reminder');
const { RISK_CATEGORIES, REMINDER_STRATEGIES } = require('../config/constants');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Pure JavaScript rule-based risk calculation matching the trained model latent formula.
 */
function jsRuleBasedScorer(features) {
  const pastDelay = Number(features.pastDelayCount || 0);
  const avgDelay = Number(features.avgDelayDays || 0);
  const missedAppts = Number(features.missedAppointmentCount || 0);
  const ackRate = Number(features.reminderAckRate || 0.5);
  const distKm = Number(features.distanceToCenterKm || 5.0);
  const gapDays = Number(features.previousDoseGapDays || 0);

  const z = -1.8 
    + 0.45 * pastDelay 
    + 0.045 * avgDelay 
    + 0.65 * missedAppts 
    - 1.60 * ackRate 
    + 0.08 * distKm 
    + 0.025 * gapDays;

  const score = 1.0 / (1.0 + Math.exp(-z));
  const roundedScore = Math.round(score * 10000) / 10000;

  let category = RISK_CATEGORIES.LOW;
  if (roundedScore >= 0.70) category = RISK_CATEGORIES.HIGH;
  else if (roundedScore >= 0.35) category = RISK_CATEGORIES.MEDIUM;

  const factors = [];
  if (pastDelay >= 2) factors.push(`History of ${pastDelay} delayed vaccination doses`);
  if (avgDelay >= 14) factors.push(`Average past dose delay exceeds 14 days (${avgDelay.toFixed(0)}d)`);
  if (missedAppts >= 1) factors.push(`${missedAppts} past missed appointments`);
  if (ackRate < 0.4) factors.push('Low engagement and response to reminder notifications');
  if (distKm >= 12.0) factors.push(`Distance to vaccination center is ${distKm.toFixed(1)} km`);
  if (gapDays >= 15) factors.push(`Overdue gap of ${gapDays.toFixed(0)} days on prior schedule`);
  if (factors.length === 0) factors.push('Standard compliance profile with regular clinic visits');

  return {
    riskScore: roundedScore,
    riskCategory: category,
    contributingFactors: factors,
    modelVersion: 'js-rule-fallback-v1'
  };
}

/**
 * Predicts missed dose risk for a child.
 * 
 * Enforces:
 * 1. Cold-start gating: If child has < 2 recorded doses or reminder interactions,
 *    returns cold_start_baseline immediately without calling ML service.
 * 2. Real ML microservice call (Flask at port 5001).
 * 3. Graceful fallback to js_fallback_rules if ML service is offline.
 * 
 * @param {string|ObjectId} childId
 * @param {Object} [options]
 */
async function predictMissedDoseRisk(childId, options = {}) {
  // 1. Gather historical interaction telemetry for this child
  const [records, reminders] = await Promise.all([
    VaccinationRecord.find({ childId }).lean(),
    Reminder.find({ childId }).lean()
  ]);

  const totalInteractions = records.length + reminders.length;

  // Cold-start gating (spec requirement: fewer than 2 events)
  if (totalInteractions < 2) {
    const coldStartResult = {
      predictionType: 'cold_start_baseline',
      riskScore: 0.15,
      riskCategory: RISK_CATEGORIES.LOW,
      reminderStrategy: REMINDER_STRATEGIES.STANDARD,
      contributingFactors: ['New patient profile - insufficient history for statistical inference'],
      modelVersion: 'cold-start-v1',
      message: 'Risk prediction unavailable - insufficient history'
    };

    if (options.saveToDb) {
      await RiskPrediction.create({
        childId,
        scheduleId: options.scheduleId || null,
        predictionType: coldStartResult.predictionType,
        riskScore: coldStartResult.riskScore,
        riskCategory: coldStartResult.riskCategory,
        contributingFactors: coldStartResult.contributingFactors,
        modelVersion: coldStartResult.modelVersion
      });
    }

    return coldStartResult;
  }

  // Calculate engineered feature values from real history
  let pastDelayCount = 0;
  let totalDelayDays = 0;
  for (const rec of records) {
    if (rec.scheduledDueDate && rec.dateAdministered) {
      const diffDays = Math.round((new Date(rec.dateAdministered) - new Date(rec.scheduledDueDate)) / (1000 * 60 * 60 * 24));
      if (diffDays > 14) {
        pastDelayCount++;
        totalDelayDays += diffDays;
      }
    }
  }
  const avgDelayDays = pastDelayCount > 0 ? Math.round(totalDelayDays / pastDelayCount) : 0;

  const ackCount = reminders.filter(r => r.acknowledged).length;
  const reminderAckRate = reminders.length > 0 ? Math.round((ackCount / reminders.length) * 100) / 100 : 0.5;

  const featurePayload = {
    pastDelayCount,
    avgDelayDays,
    missedAppointmentCount: 0,
    reminderAckRate,
    distanceToCenterKm: 4.5,
    previousDoseGapDays: avgDelayDays > 0 ? avgDelayDays : 0
  };

  // 2. Call ML microservice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(featurePayload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const strategy = data.riskCategory === RISK_CATEGORIES.HIGH 
        ? REMINDER_STRATEGIES.INTENSIVE 
        : (data.riskCategory === RISK_CATEGORIES.MEDIUM ? REMINDER_STRATEGIES.ENHANCED : REMINDER_STRATEGIES.STANDARD);

      const prediction = {
        predictionType: 'ml_model',
        riskScore: data.riskScore,
        riskCategory: data.riskCategory,
        reminderStrategy: strategy,
        contributingFactors: data.contributingFactors || [],
        modelVersion: data.modelVersion || 'v1.0.0-gbc-uip'
      };

      if (options.saveToDb) {
        await RiskPrediction.create({
          childId,
          scheduleId: options.scheduleId || null,
          predictionType: prediction.predictionType,
          riskScore: prediction.riskScore,
          riskCategory: prediction.riskCategory,
          contributingFactors: prediction.contributingFactors,
          modelVersion: prediction.modelVersion
        });
      }

      return prediction;
    }
  } catch (err) {
    console.warn(`[ML Service Warning] ${err.message}. Falling back to js_fallback_rules.`);
  }

  // 3. Fallback to JavaScript rule-based scorer if ML service is unreachable
  const fallback = jsRuleBasedScorer(featurePayload);
  const strategy = fallback.riskCategory === RISK_CATEGORIES.HIGH 
    ? REMINDER_STRATEGIES.INTENSIVE 
    : (fallback.riskCategory === RISK_CATEGORIES.MEDIUM ? REMINDER_STRATEGIES.ENHANCED : REMINDER_STRATEGIES.STANDARD);

  const fallbackResult = {
    predictionType: 'js_fallback_rules',
    riskScore: fallback.riskScore,
    riskCategory: fallback.riskCategory,
    reminderStrategy: strategy,
    contributingFactors: fallback.contributingFactors,
    modelVersion: fallback.modelVersion
  };

  if (options.saveToDb) {
    await RiskPrediction.create({
      childId,
      scheduleId: options.scheduleId || null,
      predictionType: fallbackResult.predictionType,
      riskScore: fallbackResult.riskScore,
      riskCategory: fallbackResult.riskCategory,
      contributingFactors: fallbackResult.contributingFactors,
      modelVersion: fallbackResult.modelVersion
    });
  }

  return fallbackResult;
}

module.exports = {
  predictMissedDoseRisk,
  jsRuleBasedScorer
};

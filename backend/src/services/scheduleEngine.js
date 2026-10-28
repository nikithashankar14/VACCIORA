/**
 * scheduleEngine.js
 * Evaluates India Universal Immunization Programme (UIP) rules against a child's birth date
 * and verified vaccination history.
 */

const { GRACE_PERIOD_DAYS } = require('../config/constants');

/**
 * Computes child's age in days and calendar breakdown.
 * @param {Date|string} dateOfBirth 
 * @param {Date} [referenceDate] 
 */
function computeChildAge(dateOfBirth, referenceDate = new Date()) {
  const dob = new Date(dateOfBirth);
  const now = new Date(referenceDate);
  const diffMs = now.getTime() - dob.getTime();
  const ageInDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const years = Math.floor(ageInDays / 365.25);
  const months = Math.floor((ageInDays % 365.25) / 30.4375);
  const days = Math.floor((ageInDays % 365.25) % 30.4375);

  let formattedAge = '';
  if (years > 0) {
    formattedAge = `${years} yr${years > 1 ? 's' : ''} ${months} mo${months !== 1 ? 's' : ''}`;
  } else if (months > 0) {
    formattedAge = `${months} mo${months > 1 ? 's' : ''} ${days} day${days !== 1 ? 's' : ''}`;
  } else {
    formattedAge = `${ageInDays} day${ageInDays !== 1 ? 's' : ''}`;
  }

  return { ageInDays, years, months, days, formattedAge };
}

/**
 * Calculates due status for all UIP vaccine doses for a given child.
 * 
 * @param {Object} child - Mongoose Child document or plain object with dateOfBirth
 * @param {Array} verifiedRecords - Array of verified VaccinationRecord documents
 * @param {Array} allSchedules - Array of VaccineSchedule documents from DB
 * @param {Date} [asOfDate] - Optional evaluation date, defaults to now
 */
function evaluateChildSchedule(child, verifiedRecords = [], allSchedules = [], asOfDate = new Date()) {
  const dob = new Date(child.dateOfBirth);
  const today = new Date(asOfDate);
  // Normalize time components for accurate calendar day arithmetic
  today.setHours(0, 0, 0, 0);

  const age = computeChildAge(dob, today);

  // Map of verified records by scheduleId and vaccineCode
  const verifiedMap = new Map();
  for (const rec of verifiedRecords) {
    const sId = rec.scheduleId ? (rec.scheduleId._id || rec.scheduleId).toString() : null;
    if (sId) {
      verifiedMap.set(sId, rec);
    }
  }

  const timeline = [];
  let completedCount = 0;
  let overdueCount = 0;
  let dueCount = 0;
  let upcomingCount = 0;
  let nextDueEntry = null;

  // Sort schedules chronologically by dueAgeDays, then doseNumber
  const sortedSchedules = [...allSchedules].sort((a, b) => {
    if (a.dueAgeDays !== b.dueAgeDays) return a.dueAgeDays - b.dueAgeDays;
    return a.doseNumber - b.doseNumber;
  });

  for (const schedule of sortedSchedules) {
    const schedId = schedule._id.toString();
    const isCompleted = verifiedMap.has(schedId);
    const verifiedRecord = isCompleted ? verifiedMap.get(schedId) : null;

    // Calculate due date: dateOfBirth + dueAgeDays
    const dueDate = new Date(dob);
    dueDate.setDate(dueDate.getDate() + schedule.dueAgeDays);
    dueDate.setHours(0, 0, 0, 0);

    // Calculate grace period expiration date: dueDate + GRACE_PERIOD_DAYS
    const gracePeriodEndDate = new Date(dueDate);
    gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + GRACE_PERIOD_DAYS);
    gracePeriodEndDate.setHours(23, 59, 59, 999);

    // Calculate difference in days between today and dueDate
    const diffDaysFromDue = Math.round((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    let status = 'upcoming';
    if (isCompleted) {
      status = 'completed';
      completedCount++;
    } else {
      if (today < dueDate) {
        status = 'upcoming';
        upcomingCount++;
      } else if (today <= gracePeriodEndDate) {
        status = 'due';
        dueCount++;
      } else {
        status = 'overdue';
        overdueCount++;
      }

      // First not-yet-completed entry is our next due
      if (!nextDueEntry) {
        nextDueEntry = {
          scheduleId: schedule._id,
          vaccineCode: schedule.vaccineCode,
          vaccineName: schedule.vaccineName,
          dueAgeLabel: schedule.dueAgeLabel,
          dueAgeDays: schedule.dueAgeDays,
          dueDate,
          diffDaysFromDue,
          status
        };
      }
    }

    timeline.push({
      scheduleId: schedule._id,
      vaccineCode: schedule.vaccineCode,
      vaccineName: schedule.vaccineName,
      doseNumber: schedule.doseNumber,
      antigenGroup: schedule.antigenGroup,
      dueAgeDays: schedule.dueAgeDays,
      dueAgeLabel: schedule.dueAgeLabel,
      upperLimitAgeDays: schedule.upperLimitAgeDays,
      route: schedule.route,
      site: schedule.site,
      endemicDistrictsOnly: schedule.endemicDistrictsOnly,
      dueDate,
      gracePeriodEndDate,
      diffDaysFromDue,
      status,
      record: verifiedRecord ? {
        recordUid: verifiedRecord.recordUid,
        dateAdministered: verifiedRecord.dateAdministered,
        batchLotNumber: verifiedRecord.batchLotNumber,
        administeredFacilityId: verifiedRecord.administeredFacilityId,
        recordHash: verifiedRecord.recordHash
      } : null
    });
  }

  const totalDoses = sortedSchedules.length;
  const coverageRate = totalDoses > 0 ? Math.round((completedCount / totalDoses) * 100) : 0;

  return {
    childAge: age,
    summary: {
      totalDoses,
      completedCount,
      overdueCount,
      dueCount,
      upcomingCount,
      coverageRate
    },
    nextDue: nextDueEntry,
    timeline
  };
}

module.exports = {
  computeChildAge,
  evaluateChildSchedule
};

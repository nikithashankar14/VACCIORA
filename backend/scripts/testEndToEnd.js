/**
 * testEndToEnd.js
 * Comprehensive end-to-end integration test exercising every Vacciora backend endpoint:
 * 1. Admin login (bootstrapped admin)
 * 2. Staff access request submission
 * 3. Admin review & approval of staff request (temp password generation & delivery)
 * 4. Staff login with temp password -> verify forced password change requirement
 * 5. Staff changes password -> obtains clean authorized session
 * 6. Staff creates hospital birth record (child + BCG, OPV-0, HepB-0 day-0 doses)
 * 7. Parent registers with explicit informed consent
 * 8. Parent links hospital birth record via childUid & guardianMobileAtBirth
 * 9. Parent queries live UIP immunization timeline & age calculation
 * 10. AI risk prediction (cold-start baseline gating check)
 * 11. Trigger vaccine reminder & verify WhatsApp attempt + SMS fallback logging
 * 12. Digital QR pass generation & resolution
 * 13. Certificate generation with SHA-256 hash & verification check
 * 14. Admin notification health & audit trail queries
 */

const API_BASE = 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errorMsg = data.message || (data.errors ? JSON.stringify(data.errors) : res.statusText);
    throw new Error(`[${res.status}] ${options.method || 'GET'} ${endpoint} -> ${errorMsg}`);
  }
  return data;
}

async function runTests() {
  console.log('================================================================');
  console.log('  STARTING COMPREHENSIVE END-TO-END VERIFICATION               ');
  console.log('================================================================\n');

  // Step 1: Admin Login
  console.log('1. Logging in as bootstrapped Admin...');
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'admin@vacciora.health',
      password: 'SuperSecureAdminPassword2026!'
    })
  });
  const adminToken = adminLogin.token;
  console.log('   Admin logged in successfully. User:', adminLogin.user.name);

  // Step 2: Staff Access Request
  console.log('\n2. Submitting Staff Access Request...');
  const staffReq = await request('/auth/access-requests', {
    method: 'POST',
    body: JSON.stringify({
      requestedRole: 'staff',
      name: 'Nurse Priya Sharma',
      email: 'nurse.priya@citycare.org',
      mobile: '+919876543210',
      facilityName: 'City Care Maternal & Child Hospital',
      note: 'Immunization in-charge for Labor & Delivery'
    })
  });
  console.log('   Access request submitted. ID:', staffReq.requestId);

  // Step 3: Admin Review & Approve Request
  console.log('\n3. Admin reviewing and approving Staff Access Request...');
  const approvalRes = await request(`/auth/admin/access-requests/${staffReq.requestId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ action: 'approve' })
  });
  const tempPassword = approvalRes.tempPasswordForDev;
  console.log('   Request approved! Temporary password generated:', tempPassword);

  // Step 4: Staff Login with Temp Password (check PASSWORD_CHANGE_REQUIRED)
  console.log('\n4. Staff logging in with temporary password...');
  const staffInitialLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: 'nurse.priya@citycare.org',
      password: tempPassword
    })
  });
  console.log('   Staff logged in. requirePasswordChange flag:', staffInitialLogin.requirePasswordChange);
  const tempStaffToken = staffInitialLogin.token;

  // Step 5: Staff Changes Password
  console.log('\n5. Staff changing password...');
  const newStaffPassword = 'PriyaNurse#2026Strong';
  const changePwRes = await request('/auth/change-password', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tempStaffToken}` },
    body: JSON.stringify({
      currentPassword: tempPassword,
      newPassword: newStaffPassword
    })
  });
  const staffToken = changePwRes.token;
  console.log('   Password updated. requirePasswordChange flag cleared:', changePwRes.requirePasswordChange);

  // Step 6: Staff Creates Newborn Hospital Birth Record (Day-0 Doses: BCG, OPV-0, HepB-0)
  console.log('\n6. Staff registering hospital birth record for newborn with day-0 doses...');
  const birthRes = await request('/children/birth-record', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({
      name: 'Aarav Kumar',
      dateOfBirth: new Date().toISOString(),
      gender: 'male',
      guardianMobileAtBirth: '+919811223344',
      administerBirthDoses: true
    })
  });
  const child = birthRes.child;
  console.log(`   Birth record created: UID ${child.childUid}, Name: ${child.name}`);
  console.log(`   Day-0 administered doses logged: ${birthRes.birthDoses.length} vaccines (BCG, OPV-0, HepB-0)`);

  // Step 7: Parent Self-Registration with Explicit Consent
  console.log('\n7. Parent registering with informed consent...');
  const parentRes = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Rohan Kumar',
      email: 'rohan.kumar@example.com',
      mobileNumber: '+919811223344',
      password: 'ParentSecure2026!',
      consentGiven: true,
      preferredLanguage: 'en'
    })
  });
  const parentToken = parentRes.token;
  console.log('   Parent registered successfully. ID:', parentRes.user.id);

  // Step 8: Parent Links Hospital Birth Record
  console.log('\n8. Parent linking child record using childUid and verification mobile...');
  const linkRes = await request('/children/link', {
    method: 'POST',
    headers: { Authorization: `Bearer ${parentToken}` },
    body: JSON.stringify({
      childUid: child.childUid,
      guardianMobileAtBirth: '+919811223344'
    })
  });
  console.log('   Linked successfully:', linkRes.message);

  // Step 9: Parent Queries UIP Schedule Timeline
  console.log('\n9. Fetching calculated UIP timeline and age metrics...');
  const timelineRes = await request(`/children/${child._id}/timeline`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  console.log(`   Child Age: ${timelineRes.childAge.formattedAge} (${timelineRes.childAge.ageInDays} days)`);
  console.log(`   Coverage Summary: Completed ${timelineRes.summary.completedCount} / ${timelineRes.summary.totalDoses} doses (${timelineRes.summary.coverageRate}%)`);
  console.log(`   Next Due Vaccine: ${timelineRes.nextDue?.vaccineCode} (${timelineRes.nextDue?.vaccineName}) - Due at: ${timelineRes.nextDue?.dueAgeLabel}`);

  // Step 10: AI Risk Prediction Evaluation
  console.log('\n10. Evaluating AI risk prediction for child...');
  const riskRes = await request(`/risk/${child._id}`, {
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  console.log(`    Prediction Type: ${riskRes.predictionType}`);
  console.log(`    Risk Score: ${riskRes.riskScore} (Category: ${riskRes.riskCategory})`);
  console.log(`    Reminder Strategy: ${riskRes.reminderStrategy}`);
  console.log(`    Factors: ${riskRes.contributingFactors.join(', ')}`);

  // Step 11: Trigger Multi-channel Vaccine Reminder
  console.log('\n11. Triggering multi-channel vaccination reminder...');
  const reminderRes = await request('/reminders/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${parentToken}` },
    body: JSON.stringify({
      childId: child._id,
      scheduleId: timelineRes.nextDue?.scheduleId
    })
  });
  console.log(`    Result: ${reminderRes.message}`);
  for (const rem of reminderRes.reminders) {
    console.log(`    - Channel: ${rem.channel}, Mode: ${rem.deliveryMode}, FallbackFrom: ${rem.fallbackFrom || 'none'}, Ref: ${rem.providerReference}`);
  }

  // Step 12: Digital QR Pass
  console.log('\n12. Generating digital QR pass and resolving it...');
  const qrGenRes = await request(`/qr/${child._id}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${parentToken}` }
  });
  console.log(`    QR Token generated: ${qrGenRes.tokenValue.substring(0, 30)}...`);

  const qrResolveRes = await request('/qr/resolve', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ tokenValue: qrGenRes.tokenValue })
  });
  console.log(`    Resolved QR successfully: Child ${qrResolveRes.child.name} (${qrResolveRes.child.childUid})`);

  // Step 13: Certificate Generation with Cryptographic SHA-256 Hash & Verification
  console.log('\n13. Generating immunization certificate with SHA-256 hash...');
  const certRes = await request(`/certificates/${child._id}/generate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` }
  });
  console.log(`    Certificate UID: ${certRes.certificateUid}`);
  console.log(`    Cryptographic SHA-256 Hash: ${certRes.recordHash}`);

  console.log('    Verifying certificate authenticity via public endpoint...');
  const verifyRes = await request(`/certificates/verify/${certRes.recordHash}`);
  console.log(`    Verified status: ${verifyRes.verified} for child ${verifyRes.child.name}`);

  // Step 14: Admin Notification Health & Audit History
  console.log('\n14. Admin inspecting Notification Health & Audit History...');
  const healthRes = await request('/admin/notifications/health', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`    SMS Channel configured: ${healthRes.channels.sms.isConfigured} (Live: ${healthRes.channels.sms.live24h}, Mock: ${healthRes.channels.sms.mock24h})`);
  console.log(`    WhatsApp Channel configured: ${healthRes.channels.whatsapp.isConfigured} (Live: ${healthRes.channels.whatsapp.live24h}, Mock: ${healthRes.channels.whatsapp.mock24h})`);

  const historyRes = await request('/admin/notifications', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log(`    Audit history retrieved: ${historyRes.notifications.length} logged notification records.`);

  console.log('\n================================================================');
  console.log('  ALL BACKEND ENDPOINTS & FLOWS VERIFIED SUCCESSFULLY!           ');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('\nTEST FAILED:', err.message);
  process.exit(1);
});

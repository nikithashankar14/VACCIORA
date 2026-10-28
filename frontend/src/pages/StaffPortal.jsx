import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  QrCode,
  Calendar,
  ShieldCheck,
  FileCheck,
  AlertTriangle,
  UserCheck,
  Bell,
  Send,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { childrenApi, recordsApi, scheduleApi, qrApi, remindersApi } from '../api';

export default function StaffPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'birth-record'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedChild, setSelectedChild] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [schedulesList, setSchedulesList] = useState([]);

  // QR Pass input state
  const [qrInputToken, setQrInputToken] = useState('');
  const [qrResolving, setQrResolving] = useState(false);

  // Birth Record Form state
  const [birthForm, setBirthForm] = useState({
    name: '',
    dateOfBirth: new Date().toISOString().split('T')[0],
    gender: 'male',
    guardianMobileAtBirth: '',
    administerBirthDoses: true
  });
  const [birthLoading, setBirthLoading] = useState(false);

  // Administer Vaccine Modal state
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [administerScheduleId, setAdministerScheduleId] = useState('');
  const [administerBatch, setAdministerBatch] = useState('');
  const [administerRemarks, setAdministerRemarks] = useState('');
  const [administerLoading, setAdministerLoading] = useState(false);

  // AEFI Modal state
  const [showAefiModal, setShowAefiModal] = useState(false);
  const [aefiRecordId, setAefiRecordId] = useState('');
  const [aefiDesc, setAefiDesc] = useState('');
  const [aefiSeverity, setAefiSeverity] = useState('minor');
  const [aefiAction, setAefiAction] = useState('');
  const [aefiLoading, setAefiLoading] = useState(false);

  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Initial load: recent children & reference schedules
  useEffect(() => {
    handleSearch('');
    scheduleApi.getUipSchedule().then((res) => {
      setSchedulesList(res.schedules || []);
    }).catch(console.error);
  }, []);

  const handleSearch = async (q) => {
    setSearchLoading(true);
    try {
      const res = await childrenApi.search(q);
      setSearchResults(res.children || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectChild = async (child) => {
    setSelectedChild(child);
    try {
      const res = await childrenApi.getTimeline(child._id);
      setTimelineData(res);
    } catch (err) {
      console.error('Failed to load child timeline:', err);
    }
  };

  const handleQrResolve = async (e) => {
    e.preventDefault();
    if (!qrInputToken) return;
    setQrResolving(true);
    setFeedback({ text: '', type: '' });
    try {
      const res = await qrApi.resolvePass(qrInputToken);
      setFeedback({ text: `Resolved QR pass for ${res.child.name} (${res.child.childUid})`, type: 'success' });
      await selectChild(res.child);
      setQrInputToken('');
    } catch (err) {
      setFeedback({ text: err.message || 'Invalid or expired QR token.', type: 'error' });
    } finally {
      setQrResolving(false);
    }
  };

  const handleBirthSubmit = async (e) => {
    e.preventDefault();
    setBirthLoading(true);
    setFeedback({ text: '', type: '' });
    try {
      const res = await childrenApi.createBirthRecord({
        ...birthForm,
        birthFacilityId: user.facility?._id
      });
      setFeedback({
        text: `Success! Newborn ${res.child.name} registered with UID: ${res.child.childUid}. Day-0 doses recorded and cryptographically signed.`,
        type: 'success'
      });
      setBirthForm({
        name: '',
        dateOfBirth: new Date().toISOString().split('T')[0],
        gender: 'male',
        guardianMobileAtBirth: '',
        administerBirthDoses: true
      });
      setActiveTab('search');
      await selectChild(res.child);
      handleSearch('');
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to register birth record.', type: 'error' });
    } finally {
      setBirthLoading(false);
    }
  };

  const handleAdministerSubmit = async (e) => {
    e.preventDefault();
    if (!selectedChild || !administerScheduleId) return;
    setAdministerLoading(true);
    try {
      await recordsApi.logRecord({
        childId: selectedChild._id,
        scheduleId: administerScheduleId,
        dateAdministered: new Date().toISOString(),
        batchLotNumber: administerBatch,
        remarks: administerRemarks,
        administeredFacilityId: user.facility?._id
      });
      setFeedback({ text: 'Vaccination administered and cryptographically verified.', type: 'success' });
      setShowAdministerModal(false);
      setAdministerBatch('');
      setAdministerRemarks('');
      await selectChild(selectedChild);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to record vaccination.', type: 'error' });
    } finally {
      setAdministerLoading(false);
    }
  };

  const handleAefiSubmit = async (e) => {
    e.preventDefault();
    if (!aefiRecordId) return;
    setAefiLoading(true);
    try {
      await recordsApi.submitAefi(aefiRecordId, {
        eventDescription: aefiDesc,
        severityCategory: aefiSeverity,
        actionTaken: aefiAction
      });
      setFeedback({ text: 'AEFI report registered and submitted to surveillance.', type: 'success' });
      setShowAefiModal(false);
      setAefiDesc('');
      setAefiAction('');
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to submit AEFI.', type: 'error' });
    } finally {
      setAefiLoading(false);
    }
  };

  const [reminderSending, setReminderSending] = useState(false);

  const handleSendDueReminder = async () => {
    if (!selectedChild) return;
    setReminderSending(true);
    try {
      const res = await remindersApi.sendReminder(selectedChild._id, timelineData?.nextDue?.scheduleId);
      setFeedback({ text: res.message || 'Due reminder alert dispatched to parent successfully.', type: 'success' });
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to dispatch reminder to parent.', type: 'error' });
    } finally {
      setReminderSending(false);
    }
  };

  const handleOpenWhatsAppDirect = () => {
    if (!selectedChild) return;
    const rawMobile = selectedChild.guardianMobileAtBirth || '';
    const cleanMobile = rawMobile.replace(/\D/g, '');
    const intlNumber = cleanMobile.startsWith('91') && cleanMobile.length === 12 ? cleanMobile : `91${cleanMobile}`;
    
    const parentName = selectedChild.guardianUserId?.name || 'Parent';
    const childName = selectedChild.name || 'Child';
    const vaccineName = timelineData?.nextDue
      ? `${timelineData.nextDue.vaccineName} (${timelineData.nextDue.vaccineCode})`
      : 'scheduled UIP dose';
    const dueDateStr = timelineData?.nextDue
      ? new Date(timelineData.nextDue.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : 'soon';

    const message = `Hello ${parentName},\n\nReminder: ${childName}'s ${vaccineName} vaccination is due on ${dueDateStr}.\n\nPlease visit your vaccination centre on the scheduled date.\n\n- Vacciora Immunization Platform`;
    // https://web.whatsapp.com/send?phone=... opens directly into WhatsApp Web chat without the intermediate landing screen
    const waUrl = `https://web.whatsapp.com/send?phone=${intlNumber}&text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: 'var(--bg-app)', padding: '2rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--role-staff)',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <Building2 size={16} /> Healthcare Staff Portal &bull; {user?.facility?.name || 'Assigned Center'}
            </div>
            <h1 style={{ fontSize: '1.85rem', margin: '0.2rem 0 0 0' }}>
              Clinical Immunization Desk
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setActiveTab('search')}
              className={`btn ${activeTab === 'search' ? 'btn-staff' : 'btn-secondary'}`}
            >
              <Search size={16} /> Search & Intake
            </button>
            <button
              onClick={() => setActiveTab('birth-record')}
              className={`btn ${activeTab === 'birth-record' ? 'btn-staff' : 'btn-secondary'}`}
            >
              <Plus size={16} /> Register Birth Record (Day-0)
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback.text && (
          <div style={{
            background: feedback.type === 'success' ? 'var(--status-completed-bg)' : 'var(--status-overdue-bg)',
            color: feedback.type === 'success' ? 'var(--status-completed)' : 'var(--status-overdue)',
            border: `1px solid ${feedback.type === 'success' ? 'var(--status-completed-border)' : 'var(--status-overdue-border)'}`,
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {feedback.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{feedback.text}</span>
            </div>
            <button
              onClick={() => setFeedback({ text: '', type: '' })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Tab 1: Search & Intake */}
        {activeTab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Search & QR Scanner Bar */}
            <div className="card">
              <div className="grid-responsive" style={{ gridTemplateColumns: '1.5fr 1fr', gap: '1.5rem', alignItems: 'flex-end' }}>
                {/* Search by Query */}
                <div>
                  <label className="form-label">Search Child Record (UID, Name, or Mobile)</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                      placeholder="e.g. CHD-2026-1D8F5A or Aarav or 9876543210"
                    />
                    <button
                      onClick={() => handleSearch(searchQuery)}
                      disabled={searchLoading}
                      className="btn btn-staff"
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      <Search size={16} /> Search
                    </button>
                  </div>
                </div>

                {/* Scan / Resolve QR Token */}
                <form onSubmit={handleQrResolve}>
                  <label className="form-label">Digital QR Pass Token Intake</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={qrInputToken}
                      onChange={(e) => setQrInputToken(e.target.value)}
                      placeholder="Paste scanned token string"
                    />
                    <button
                      type="submit"
                      disabled={qrResolving}
                      className="btn btn-secondary"
                      style={{ whiteSpace: 'nowrap', borderColor: 'var(--role-staff-border)', color: 'var(--role-staff)' }}
                    >
                      <QrCode size={16} /> Resolve QR
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Results & Detail Split View */}
            <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 2fr', gap: '1.5rem', alignItems: 'flex-start' }}>
              {/* Search Results List */}
              <div className="card" style={{ padding: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.75rem' }}>
                  {searchLoading ? 'Searching...' : `Found Records (${searchResults.length})`}
                </h3>

                {searchResults.length === 0 ? (
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>
                    No matching child records. Try another query or register a new birth.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '520px', overflowY: 'auto' }}>
                    {searchResults.map((c) => {
                      const isSelected = selectedChild?._id === c._id;
                      return (
                        <div
                          key={c._id}
                          onClick={() => selectChild(c)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${isSelected ? 'var(--role-staff)' : 'var(--border-light)'}`,
                            background: isSelected ? 'var(--role-staff-subtle)' : '#FFFFFF',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem' }}>
                            {c.name}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--role-staff)', fontFamily: 'var(--font-mono)' }}>
                            {c.childUid}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                            DOB: {new Date(c.dateOfBirth).toLocaleDateString('en-IN')} &bull; Mobile: {c.guardianMobileAtBirth}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Selected Child Clinical Workspace */}
              {selectedChild ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Child Top Strip */}
                  <div className="card" style={{ borderTop: '4px solid var(--role-staff)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--role-staff)', fontWeight: 600 }}>
                          Patient Profile
                        </div>
                        <h2 style={{ fontSize: '1.5rem', margin: '0.1rem 0' }}>{selectedChild.name}</h2>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          UID: <strong style={{ color: 'var(--text-primary)' }}>{selectedChild.childUid}</strong> &bull; Born at {selectedChild.birthFacilityId?.name || 'Hospital'} &bull; Age: {timelineData?.childAge?.formattedAge}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <button
                          onClick={handleOpenWhatsAppDirect}
                          className="btn"
                          style={{
                            background: '#25D366',
                            color: '#FFFFFF',
                            borderColor: '#25D366',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            fontWeight: 600
                          }}
                          title="Open WhatsApp with pre-filled immunization reminder message for this parent"
                        >
                          <MessageCircle size={16} /> WhatsApp Parent Direct
                        </button>
                        <button
                          onClick={handleSendDueReminder}
                          disabled={reminderSending || !timelineData?.nextDue}
                          className="btn btn-secondary"
                          style={{ borderColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                          title="Dispatch automated reminder notice to parent's email and backend record"
                        >
                          <Send size={16} /> {reminderSending ? 'Dispatching...' : 'Email Due Notice'}
                        </button>
                        <button
                          onClick={() => setShowAdministerModal(true)}
                          className="btn btn-staff"
                        >
                          <ShieldCheck size={16} /> Administer Vaccine
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Vaccine Schedule Table */}
                  <div className="card">
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Universal Immunization Record</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      Administered vaccines are cryptographically sealed with SHA-256 signatures.
                    </p>

                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                          <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Status</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Vaccine</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Milestone</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Date Given</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Batch</th>
                            <th style={{ padding: '0.6rem 0.4rem' }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timelineData?.timeline?.map((item) => (
                            <tr key={item.scheduleId} style={{ borderBottom: '1px solid var(--border-light)' }}>
                              <td style={{ padding: '0.6rem 0.4rem' }}>
                                <span className={`badge badge-${item.status}`}>{item.status}</span>
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', fontWeight: 600 }}>
                                {item.vaccineCode}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', color: 'var(--text-secondary)' }}>
                                {item.dueAgeLabel}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', color: 'var(--text-secondary)' }}>
                                {item.record ? new Date(item.record.dateAdministered).toLocaleDateString('en-IN') : '—'}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                                {item.record?.batchLotNumber || '—'}
                              </td>
                              <td style={{ padding: '0.6rem 0.4rem' }}>
                                {item.status !== 'completed' ? (
                                  <button
                                    onClick={() => {
                                      setAdministerScheduleId(item.scheduleId);
                                      setShowAdministerModal(true);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', borderColor: 'var(--role-staff-border)', color: 'var(--role-staff)' }}
                                  >
                                    Administer
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setAefiRecordId(item.record.recordUid);
                                      setShowAefiModal(true);
                                    }}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', color: 'var(--status-overdue)' }}
                                    title="Report Adverse Reaction"
                                  >
                                    Report AEFI
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-muted)' }}>
                  Select a child from the search results to inspect their immunization timeline and record administered doses.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Register Hospital Birth Record */}
        {activeTab === 'birth-record' && (
          <div className="card" style={{ maxWidth: '640px', margin: '0 auto', borderTop: '4px solid var(--role-staff)' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>Hospital Newborn Birth Record</h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Register newborn delivered at <strong>{user?.facility?.name || 'this facility'}</strong>. A unique Child UID will be assigned and birth doses recorded on day one.
            </p>

            <form onSubmit={handleBirthSubmit}>
              <div className="form-group">
                <label className="form-label">Newborn Full Name / Temporary Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={birthForm.name}
                  onChange={(e) => setBirthForm({ ...birthForm, name: e.target.value })}
                  placeholder="e.g. Baby of Sunita / Aarav Sharma"
                  required
                />
              </div>

              <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0' }}>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    className="form-input"
                    value={birthForm.dateOfBirth}
                    onChange={(e) => setBirthForm({ ...birthForm, dateOfBirth: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <select
                    className="form-select"
                    value={birthForm.gender}
                    onChange={(e) => setBirthForm({ ...birthForm, gender: e.target.value })}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Mother / Guardian Mobile Number at Delivery</label>
                <input
                  type="tel"
                  className="form-input"
                  value={birthForm.guardianMobileAtBirth}
                  onChange={(e) => setBirthForm({ ...birthForm, guardianMobileAtBirth: e.target.value })}
                  placeholder="+919876543210"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Essential: The parent will use this exact mobile number to link and verify their child's account.
                </span>
              </div>

              {/* Day-0 Dose Auto-Administration Option */}
              <div style={{
                background: 'var(--role-staff-subtle)',
                border: '1px solid var(--role-staff-border)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                margin: '1.25rem 0'
              }}>
                <label style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    checked={birthForm.administerBirthDoses}
                    onChange={(e) => setBirthForm({ ...birthForm, administerBirthDoses: e.target.checked })}
                    style={{ width: '18px', height: '18px', marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      Log & Verify Day-0 Birth Doses Immediately
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Automatically logs <strong>BCG</strong>, <strong>OPV-0</strong>, and <strong>Hepatitis B-0</strong> birth doses administered in labor ward with SHA-256 cryptographic signatures.
                    </div>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={birthLoading}
                className="btn btn-staff"
                style={{ width: '100%', padding: '0.75rem' }}
              >
                {birthLoading ? 'Registering Newborn...' : 'Generate Child UID & Log Birth Record'}
              </button>
            </form>
          </div>
        )}

        {/* Modal: Administer Vaccine */}
        {showAdministerModal && selectedChild && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Administer Vaccination</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Recording dose for <strong>{selectedChild.name}</strong> ({selectedChild.childUid}).
              </p>

              <form onSubmit={handleAdministerSubmit}>
                <div className="form-group">
                  <label className="form-label">Select UIP Vaccine Dose</label>
                  <select
                    className="form-select"
                    value={administerScheduleId}
                    onChange={(e) => setAdministerScheduleId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose scheduled vaccine --</option>
                    {schedulesList.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.vaccineCode} - {s.vaccineName} ({s.dueAgeLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Batch / Lot Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={administerBatch}
                    onChange={(e) => setAdministerBatch(e.target.value)}
                    placeholder="e.g. VAC-2026-LOT-89B"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Observations / Remarks</label>
                  <input
                    type="text"
                    className="form-input"
                    value={administerRemarks}
                    onChange={(e) => setAdministerRemarks(e.target.value)}
                    placeholder="e.g. Administered in left anterolateral thigh, tolerated well"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdministerModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={administerLoading}
                    className="btn btn-staff"
                  >
                    {administerLoading ? 'Signing...' : 'Sign & Verify Administered Dose'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: AEFI Report */}
        {showAefiModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--status-overdue)', marginBottom: '0.5rem' }}>
                <AlertTriangle size={22} />
                <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Report AEFI (Adverse Event)</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Adverse Events Following Immunization surveillance protocol.
              </p>

              <form onSubmit={handleAefiSubmit}>
                <div className="form-group">
                  <label className="form-label">Severity Category</label>
                  <select
                    className="form-select"
                    value={aefiSeverity}
                    onChange={(e) => setAefiSeverity(e.target.value)}
                  >
                    <option value="minor">Minor (Fever, localized swelling)</option>
                    <option value="severe">Severe (High fever, extensive rash)</option>
                    <option value="serious">Serious (Anaphylaxis, hospitalization)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Event Description & Symptoms</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={aefiDesc}
                    onChange={(e) => setAefiDesc(e.target.value)}
                    placeholder="Describe onset time, clinical presentation, and vitals"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Clinical Action Taken / Medication</label>
                  <input
                    type="text"
                    className="form-input"
                    value={aefiAction}
                    onChange={(e) => setAefiAction(e.target.value)}
                    placeholder="e.g. Paracetamol administered, observed for 2 hours"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAefiModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={aefiLoading}
                    className="btn"
                    style={{ background: 'var(--status-overdue)', color: '#FFFFFF' }}
                  >
                    {aefiLoading ? 'Filing Report...' : 'Submit AEFI Case'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

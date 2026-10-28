import React, { useState, useEffect } from 'react';
import {
  Baby,
  Plus,
  Link as LinkIcon,
  Calendar,
  ShieldCheck,
  Sparkles,
  QrCode,
  Download,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  AlertCircle,
  FileText,
  Send,
  Sliders,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { childrenApi, riskApi, remindersApi, certificatesApi, authApi } from '../api';
import DigitalQrPassModal from '../components/DigitalQrPassModal';

export default function ParentPortal() {
  const { user } = useAuth();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState({ text: '', type: '' });

  // Modals state
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showPrefsModal, setShowPrefsModal] = useState(false);

  // Link child form
  const [linkUid, setLinkUid] = useState('');
  const [linkMobile, setLinkMobile] = useState(user?.mobileNumber || '');
  const [linkLoading, setLinkLoading] = useState(false);

  // Manual child form
  const [manualName, setManualName] = useState('');
  const [manualDob, setManualDob] = useState('');
  const [manualGender, setManualGender] = useState('male');
  const [manualFacility, setManualFacility] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  // Notification preferences
  const [prefs, setPrefs] = useState(user?.notificationPreferences || { webApp: true, whatsapp: true, email: true });
  const [prefsSaving, setPrefsSaving] = useState(false);

  // Load parent's children
  const loadChildren = async () => {
    try {
      setLoading(true);
      const res = await childrenApi.getMine();
      setChildren(res.children || []);
      if (res.children && res.children.length > 0) {
        setSelectedChild(res.children[0]);
      }
    } catch (err) {
      console.error('Error loading children:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  // Load child timeline, risk prediction, and reminders when selectedChild changes
  useEffect(() => {
    if (!selectedChild?._id) {
      setTimelineData(null);
      setRiskData(null);
      setReminders([]);
      return;
    }

    const fetchChildData = async () => {
      try {
        const [timelineRes, riskRes, remindersRes] = await Promise.all([
          childrenApi.getTimeline(selectedChild._id),
          riskApi.getPrediction(selectedChild._id),
          remindersApi.getChildReminders(selectedChild._id)
        ]);
        setTimelineData(timelineRes);
        setRiskData(riskRes);
        setReminders(remindersRes.reminders || []);
      } catch (err) {
        console.error('Error loading child data:', err);
      }
    };

    fetchChildData();
  }, [selectedChild]);

  // Handle Link Child Submission
  const handleLinkSubmit = async (e) => {
    e.preventDefault();
    setLinkLoading(true);
    setActionMessage({ text: '', type: '' });
    try {
      const res = await childrenApi.linkChild(linkUid, linkMobile);
      setActionMessage({ text: res.message, type: 'success' });
      setShowLinkModal(false);
      setLinkUid('');
      await loadChildren();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to link record.', type: 'error' });
    } finally {
      setLinkLoading(false);
    }
  };

  // Handle Manual Child Registration Submission
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setManualLoading(true);
    try {
      const res = await childrenApi.createManual({
        name: manualName,
        dateOfBirth: manualDob,
        gender: manualGender,
        birthFacilityName: manualFacility
      });
      setActionMessage({ text: 'Child added successfully.', type: 'success' });
      setShowManualModal(false);
      setManualName('');
      setManualDob('');
      await loadChildren();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to add child.', type: 'error' });
    } finally {
      setManualLoading(false);
    }
  };

  // Handle Certificate Download
  const handleDownloadCertificate = async () => {
    if (!selectedChild) return;
    try {
      let certInfo;
      try {
        certInfo = await certificatesApi.getForChild(selectedChild._id);
      } catch {
        // If certificate doesn't exist yet, generate it
        const genRes = await certificatesApi.generate(selectedChild._id);
        certInfo = { certificate: { _id: genRes.certificateId, certificateUid: genRes.certificateUid } };
      }

      const blob = await certificatesApi.downloadPdf(certInfo.certificate._id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Vacciora_Certificate_${selectedChild.childUid}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setActionMessage({ text: err.message || 'Certificate download failed.', type: 'error' });
    }
  };

  // Handle Save Preferences
  const handleSavePreferences = async () => {
    setPrefsSaving(true);
    try {
      await authApi.updateNotificationPreferences(prefs);
      setActionMessage({ text: 'Notification preferences updated successfully.', type: 'success' });
      setShowPrefsModal(false);
    } catch (err) {
      setActionMessage({ text: 'Failed to update preferences.', type: 'error' });
    } finally {
      setPrefsSaving(false);
    }
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: 'var(--bg-app)', padding: '2rem 0' }}>
      <div className="container">
        {/* Portal Header */}
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
              color: 'var(--role-parent)',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <Baby size={16} /> Parent Immunization Portal
            </div>
            <h1 style={{ fontSize: '1.85rem', margin: '0.2rem 0 0 0' }}>
              Welcome, {user?.name}
            </h1>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowPrefsModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <Sliders size={16} /> Notification Channels
            </button>
            <button
              onClick={() => setShowLinkModal(true)}
              className="btn btn-parent"
              style={{ fontSize: '0.85rem' }}
            >
              <LinkIcon size={16} /> Link Hospital Record
            </button>
            <button
              onClick={() => setShowManualModal(true)}
              className="btn btn-secondary"
              style={{ fontSize: '0.85rem' }}
            >
              <Plus size={16} /> Add Child Record
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {actionMessage.text && (
          <div style={{
            background: actionMessage.type === 'success' ? 'var(--status-completed-bg)' : 'var(--status-overdue-bg)',
            color: actionMessage.type === 'success' ? 'var(--status-completed)' : 'var(--status-overdue)',
            border: `1px solid ${actionMessage.type === 'success' ? 'var(--status-completed-border)' : 'var(--status-overdue-border)'}`,
            padding: '0.85rem 1.25rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {actionMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage({ text: '', type: '' })}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
            >
              &times;
            </button>
          </div>
        )}

        {/* Children Selector Tabs */}
        {children.length > 0 ? (
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            overflowX: 'auto',
            paddingBottom: '0.5rem',
            marginBottom: '1.5rem'
          }}>
            {children.map((c) => {
              const isSelected = selectedChild?._id === c._id;
              return (
                <button
                  key={c._id}
                  onClick={() => setSelectedChild(c)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    borderRadius: 'var(--radius-md)',
                    background: isSelected ? 'var(--role-parent)' : '#FFFFFF',
                    color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                    border: `1px solid ${isSelected ? 'var(--role-parent)' : 'var(--border-medium)'}`,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    fontWeight: 600,
                    fontSize: '0.925rem',
                    boxShadow: isSelected ? '0 2px 8px rgba(45, 106, 79, 0.2)' : 'var(--shadow-sm)',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Baby size={18} />
                  <span>{c.name}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.15rem 0.45rem',
                    borderRadius: 'var(--radius-full)',
                    background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--bg-app)',
                    color: isSelected ? '#FFFFFF' : 'var(--text-muted)'
                  }}>
                    {c.childUid}
                  </span>
                </button>
              );
            })}
          </div>
        ) : !loading && (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', marginBottom: '2rem' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'var(--role-parent-subtle)',
              color: 'var(--role-parent)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Baby size={32} />
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>No Children Linked Yet</h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
              If your baby was born in a participating hospital, link their record using the Child UID from the hospital discharge card. Or add a child record manually.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <button onClick={() => setShowLinkModal(true)} className="btn btn-parent">
                <LinkIcon size={16} /> Link Hospital Record
              </button>
              <button onClick={() => setShowManualModal(true)} className="btn btn-secondary">
                <Plus size={16} /> Add Child Record
              </button>
            </div>
          </div>
        )}

        {/* Selected Child Dashboard View */}
        {selectedChild && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Top Row: Child Overview & Quick Actions + AI Risk Card */}
            <div className="grid-responsive" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
              {/* Child Info Card */}
              <div className="card" style={{ borderLeft: '4px solid var(--role-parent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>{selectedChild.name}</h2>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      UID: <strong style={{ color: 'var(--text-primary)' }}>{selectedChild.childUid}</strong> &bull; Born at {selectedChild.birthFacilityId?.name || 'Hospital'}
                    </div>
                  </div>
                  <span className="badge badge-completed">Active Record</span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '1rem',
                  background: 'var(--bg-app)',
                  padding: '1rem',
                  borderRadius: 'var(--radius-md)',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Current Age</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {timelineData?.childAge?.formattedAge || 'Calculating...'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Doses Administered</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--status-completed)' }}>
                      {timelineData?.summary?.completedCount || 0} / {timelineData?.summary?.totalDoses || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>UIP Coverage</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {timelineData?.summary?.coverageRate || 0}%
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setShowQrModal(true)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <QrCode size={16} /> Digital Clinic QR Pass
                  </button>
                  <button
                    onClick={handleDownloadCertificate}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <Download size={16} /> Download Signed Certificate
                  </button>
                </div>
              </div>

              {/* AI Predictive Risk Card */}
              <div className="card" style={{
                background: riskData?.riskCategory === 'high'
                  ? 'var(--status-overdue-bg)'
                  : (riskData?.riskCategory === 'medium' ? 'var(--status-due-bg)' : 'var(--color-primary-subtle)'),
                border: `1px solid ${
                  riskData?.riskCategory === 'high'
                    ? 'var(--status-overdue-border)'
                    : (riskData?.riskCategory === 'medium' ? 'var(--status-due-border)' : 'var(--color-primary-light)')
                }`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Sparkles size={20} color="var(--color-primary)" />
                    <h3 style={{ fontSize: '1.15rem', margin: 0 }}>AI Missed-Dose Risk Prediction</h3>
                  </div>
                  <span className={`badge ${
                    riskData?.riskCategory === 'high'
                      ? 'badge-overdue'
                      : (riskData?.riskCategory === 'medium' ? 'badge-due' : 'badge-completed')
                  }`}>
                    {riskData?.riskCategory || 'Assessing'} Risk
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                  Engine: <strong>{riskData?.predictionType === 'ml_model' ? 'GradientBoosting ML Model' : (riskData?.predictionType === 'cold_start_baseline' ? 'Cold-Start Baseline Protocol' : 'Rule-Based Evaluator')}</strong> (v{riskData?.modelVersion || '1.0'})
                </p>

                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.75rem 1rem',
                  fontSize: '0.825rem',
                  marginBottom: '0.75rem',
                  border: '1px solid var(--border-light)'
                }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-primary)' }}>
                    Contributing Telemetry Factors:
                  </div>
                  <ul style={{ paddingLeft: '1.2rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {riskData?.contributingFactors?.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Active Cadence Strategy: <strong style={{ color: 'var(--text-primary)', textTransform: 'capitalize' }}>{riskData?.reminderStrategy || 'Standard'}</strong> (WhatsApp + Email)
                </div>
              </div>
            </div>

            {/* Next Due Vaccination Alert */}
            {timelineData?.nextDue && (
              <div className="card" style={{
                background: timelineData.nextDue.status === 'overdue' ? 'var(--status-overdue-bg)' : '#FFFFFF',
                border: `1px solid ${timelineData.nextDue.status === 'overdue' ? 'var(--status-overdue-border)' : 'var(--border-medium)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: timelineData.nextDue.status === 'overdue' ? 'var(--status-overdue)' : 'var(--color-primary)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <Calendar size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>
                      Next Scheduled UIP Dose
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {timelineData.nextDue.vaccineName} ({timelineData.nextDue.vaccineCode})
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Target Milestone: <strong>{timelineData.nextDue.dueAgeLabel}</strong> &bull; Due Date: <strong>{new Date(timelineData.nextDue.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge badge-${timelineData.nextDue.status}`}>
                    {timelineData.nextDue.status}
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: 'var(--color-primary-subtle)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-primary-light)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.35rem 0.75rem'
                    }}
                  >
                    <Bell size={13} /> Notifications Enabled
                  </span>
                </div>
              </div>
            )}

            {/* Complete Immunization Schedule Timeline */}
            <div className="card">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Full Immunization Timeline</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Computed automatically from date of birth according to national Universal Immunization Programme rules.
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-completed">Completed ({timelineData?.summary?.completedCount || 0})</span>
                  <span className="badge badge-due">Due ({timelineData?.summary?.dueCount || 0})</span>
                  <span className="badge badge-overdue">Overdue ({timelineData?.summary?.overdueCount || 0})</span>
                  <span className="badge badge-upcoming">Upcoming ({timelineData?.summary?.upcomingCount || 0})</span>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Vaccine</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Dose Label</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Scheduled Due Date</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Administered Date</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Batch / Lot</th>
                      <th style={{ padding: '0.75rem 0.5rem' }}>Verification Hash</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timelineData?.timeline?.map((item) => (
                      <tr
                        key={item.scheduleId}
                        style={{
                          borderBottom: '1px solid var(--border-light)',
                          background: item.status === 'overdue' ? 'rgba(239, 68, 68, 0.03)' : 'transparent'
                        }}
                      >
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <span className={`badge badge-${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.vaccineCode}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.vaccineName}</div>
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                          {item.dueAgeLabel}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                          {new Date(item.dueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-secondary)' }}>
                          {item.record ? new Date(item.record.dateAdministered).toLocaleDateString('en-IN') : '—'}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {item.record?.batchLotNumber || '—'}
                        </td>
                        <td style={{ padding: '0.85rem 0.5rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-primary)' }}>
                          {item.record?.recordHash ? `${item.record.recordHash.substring(0, 14)}...` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Notification History for this Child */}
            <div className="card">
              <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Reminder & Notification Audit Trail</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Complete delivery log across WhatsApp and Email.
              </p>

              {reminders.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
                  No notifications recorded yet for this child.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reminders.map((r) => (
                    <div
                      key={r._id}
                      style={{
                        background: 'var(--bg-app)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '0.75rem 1rem',
                        border: '1px solid var(--border-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, textTransform: 'uppercase', marginRight: '0.5rem' }}>
                          [{r.channel}]
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>{r.message}</span>
                        {r.fallbackFrom && (
                          <span style={{ marginLeft: '0.5rem', color: 'var(--status-due)', fontSize: '0.75rem', fontWeight: 600 }}>
                            (Automatic backup from {r.fallbackFrom})
                          </span>
                        )}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                        <span className={`badge ${r.deliveryMode === 'live' ? 'badge-completed' : 'badge-upcoming'}`}>
                          {r.deliveryMode}
                        </span>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {new Date(r.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Link Hospital Record */}
        {showLinkModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Link Hospital Birth Record</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Enter the Child UID issued by the delivery hospital along with the verification mobile number registered at birth.
              </p>

              <form onSubmit={handleLinkSubmit}>
                <div className="form-group">
                  <label className="form-label">Child UID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={linkUid}
                    onChange={(e) => setLinkUid(e.target.value)}
                    placeholder="e.g. CHD-2026-1D8F5A"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Guardian Mobile Number Registered at Delivery</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={linkMobile}
                    onChange={(e) => setLinkMobile(e.target.value)}
                    placeholder="+919876543210"
                    required
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={linkLoading}
                    className="btn btn-parent"
                  >
                    {linkLoading ? 'Linking...' : 'Verify & Link Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Add Child Manually */}
        {showManualModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h3 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>Add Child Record</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                For children born at home or outside enrolled network facilities.
              </p>

              <form onSubmit={handleManualSubmit}>
                <div className="form-group">
                  <label className="form-label">Child Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="e.g. Diya Sharma"
                    required
                  />
                </div>

                <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0' }}>
                  <div className="form-group">
                    <label className="form-label">Date of Birth</label>
                    <input
                      type="date"
                      className="form-input"
                      value={manualDob}
                      onChange={(e) => setManualDob(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Gender</label>
                    <select
                      className="form-select"
                      value={manualGender}
                      onChange={(e) => setManualGender(e.target.value)}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Birth Facility Name (Optional)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={manualFacility}
                    onChange={(e) => setManualFacility(e.target.value)}
                    placeholder="e.g. City Maternity Center"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowManualModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={manualLoading}
                    className="btn btn-parent"
                  >
                    {manualLoading ? 'Saving...' : 'Create Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Digital QR Pass */}
        {showQrModal && selectedChild && (
          <DigitalQrPassModal child={selectedChild} onClose={() => setShowQrModal(false)} />
        )}

        {/* Modal: Notification Preferences */}
        {showPrefsModal && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '460px' }}>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Notification Preferences</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Control which channels receive predictive vaccination reminders.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>WhatsApp Reminders</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Twilio WhatsApp direct message alerts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.whatsapp}
                    onChange={(e) => setPrefs({ ...prefs, whatsapp: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>In-App Web Alerts</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded on portal dashboard</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.webApp}
                    onChange={(e) => setPrefs({ ...prefs, webApp: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Email Notifications</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Detailed immunization summaries</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.email}
                    onChange={(e) => setPrefs({ ...prefs, email: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPrefsModal(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePreferences}
                  disabled={prefsSaving}
                  className="btn btn-primary"
                >
                  {prefsSaving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

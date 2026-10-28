import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Activity,
  Bell,
  Users,
  Building2,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Send,
  Phone,
  MessageSquare,
  Mail
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { adminApi } from '../api';

export default function AdminPortal() {
  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics' | 'notifications' | 'requests' | 'facilities' | 'duplicates' | 'audit'
  const [analytics, setAnalytics] = useState(null);
  const [health, setHealth] = useState(null);
  const [notificationsData, setNotificationsData] = useState({ notifications: [], total: 0, page: 1, pages: 1 });
  const [accessRequests, setAccessRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters for notifications table
  const [filterChannel, setFilterChannel] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [notifPage, setNotifPage] = useState(1);

  const [feedback, setFeedback] = useState({ text: '', type: '' });

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [anRes, hRes, reqRes, facRes, dupRes, audRes] = await Promise.all([
        adminApi.getAnalytics(),
        adminApi.getNotificationHealth(),
        adminApi.getAccessRequests(),
        adminApi.getFacilities(),
        adminApi.getDuplicates(),
        adminApi.getAuditLogs()
      ]);
      setAnalytics(anRes);
      setHealth(hRes);
      setAccessRequests(reqRes.requests || []);
      setFacilities(facRes.facilities || []);
      setDuplicates(dupRes.duplicates || []);
      setAuditLogs(audRes.logs || []);
    } catch (err) {
      console.error('Admin data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationHistory = async (page = 1, channel = filterChannel, mode = filterMode) => {
    try {
      const res = await adminApi.getNotificationHistory(page, channel, mode);
      setNotificationsData(res);
      setNotifPage(page);
    } catch (err) {
      console.error('Failed to load notifications history:', err);
    }
  };

  useEffect(() => {
    loadAllData();
    loadNotificationHistory(1);
  }, []);

  const handleReviewRequest = async (id, action) => {
    try {
      const res = await adminApi.reviewAccessRequest(id, action);
      setFeedback({ text: res.message, type: 'success' });
      // Refresh requests & users
      const [reqRes, facRes] = await Promise.all([adminApi.getAccessRequests(), adminApi.getFacilities()]);
      setAccessRequests(reqRes.requests || []);
      setFacilities(facRes.facilities || []);
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to review request.', type: 'error' });
    }
  };

  const handleResolveDuplicate = async (id, resolution) => {
    try {
      await adminApi.resolveDuplicate(id, resolution);
      setFeedback({ text: 'Duplicate flag updated.', type: 'success' });
      const dupRes = await adminApi.getDuplicates();
      setDuplicates(dupRes.duplicates || []);
    } catch (err) {
      setFeedback({ text: 'Failed to resolve duplicate.', type: 'error' });
    }
  };

  const handleApproveFacility = async (id) => {
    try {
      await adminApi.updateFacility(id, { approvalStatus: 'approved' });
      setFeedback({ text: 'Facility approved.', type: 'success' });
      const facRes = await adminApi.getFacilities();
      setFacilities(facRes.facilities || []);
    } catch (err) {
      setFeedback({ text: 'Failed to approve facility.', type: 'error' });
    }
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
              color: 'var(--role-admin)',
              fontWeight: 600,
              fontSize: '0.85rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}>
              <ShieldCheck size={16} /> Registry Governance &bull; Super Admin
            </div>
            <h1 style={{ fontSize: '1.85rem', margin: '0.2rem 0 0 0' }}>
              National Immunization Oversight Dashboard
            </h1>
          </div>

          <button onClick={loadAllData} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
            <RefreshCw size={16} /> Refresh Metrics
          </button>
        </div>

        {/* Global Feedback Banner */}
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
              <CheckCircle size={18} />
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

        {/* Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '0.5rem',
          marginBottom: '2rem'
        }}>
          {[
            { id: 'analytics', label: 'Analytics & Models', icon: Activity },
            { id: 'notifications', label: 'Notification Health & History', icon: Bell },
            { id: 'requests', label: `Staff Access Requests (${accessRequests.filter(r => r.status === 'pending').length})`, icon: Users },
            { id: 'facilities', label: `Facilities (${facilities.length})`, icon: Building2 },
            { id: 'duplicates', label: `Duplicate Flags (${duplicates.length})`, icon: AlertTriangle },
            { id: 'audit', label: 'Audit Trail', icon: FileCheck }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.65rem 1.1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected ? 'var(--role-admin)' : 'transparent',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Analytics & Models */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Stat Counters Row */}
            <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Registered Children</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--role-parent)', marginTop: '0.2rem' }}>
                  {analytics?.summary?.totalChildren || 0}
                </div>
              </div>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Verified UIP Vaccinations</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-primary)', marginTop: '0.2rem' }}>
                  {analytics?.summary?.totalVaccinationsAdministered || 0}
                </div>
              </div>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Enrolled Parents</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  {analytics?.summary?.totalParents || 0}
                </div>
              </div>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Authorized Healthcare Staff</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--role-staff)', marginTop: '0.2rem' }}>
                  {analytics?.summary?.totalStaff || 0}
                </div>
              </div>
              <div className="card" style={{ padding: '1.25rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Approved Hospitals/Clinics</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--role-admin)', marginTop: '0.2rem' }}>
                  {analytics?.summary?.totalFacilities || 0}
                </div>
              </div>
            </div>

            {/* Recharts Analytics Row */}
            <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Risk Distribution Chart */}
              <div className="card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Child Missed-Dose Risk Stratification</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Evaluated via Python Scikit-Learn GradientBoostingClassifier microservice.
                </p>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={analytics?.riskDistribution || []}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={90}
                        innerRadius={50}
                        paddingAngle={5}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {(analytics?.riskDistribution || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Notification Channel Dispatch Volume */}
              <div className="card">
                <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Reminder Channel Dispatch Breakdown</h3>
                <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  Twilio WhatsApp &bull; Nodemailer SMTP &bull; In-App Web.
                </p>
                <div style={{ width: '100%', height: '260px' }}>
                  <ResponsiveContainer>
                    <BarChart data={analytics?.channelBreakdown || []}>
                      <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Notification Health & History */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Notification Health Cards */}
            <div className="grid-responsive" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              {/* WhatsApp Health */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <MessageSquare size={20} color="#25D366" />
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Twilio WhatsApp</h3>
                  </div>
                  <span className={`badge ${health?.channels?.whatsapp?.isConfigured ? 'badge-completed' : 'badge-upcoming'}`}>
                    {health?.channels?.whatsapp?.isConfigured ? 'LIVE SENDER' : 'MOCK LOCAL'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Provider: {health?.channels?.whatsapp?.provider}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'var(--bg-app)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                  <span>24h Live: <strong>{health?.channels?.whatsapp?.live24h}</strong></span>
                  <span>24h Mock: <strong>{health?.channels?.whatsapp?.mock24h}</strong></span>
                  <span>Failed: <strong>{health?.channels?.whatsapp?.failed24h}</strong></span>
                </div>
              </div>

              {/* Email Health */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Mail size={20} color="#8B5CF6" />
                    <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Email (SMTP)</h3>
                  </div>
                  <span className={`badge ${health?.channels?.email?.isConfigured ? 'badge-completed' : 'badge-upcoming'}`}>
                    {health?.channels?.email?.isConfigured ? 'LIVE SMTP' : 'MOCK LOCAL'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Provider: {health?.channels?.email?.provider}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', background: 'var(--bg-app)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                  <span>24h Live: <strong>{health?.channels?.email?.live24h}</strong></span>
                  <span>24h Mock: <strong>{health?.channels?.email?.mock24h}</strong></span>
                  <span>Failed: <strong>{health?.channels?.email?.failed24h}</strong></span>
                </div>
              </div>
            </div>

            {/* Notification History Table */}
            <div className="card">
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                marginBottom: '1.25rem',
                borderBottom: '1px solid var(--border-light)',
                paddingBottom: '1rem'
              }}>
                <div>
                  <h3 style={{ fontSize: '1.3rem', margin: 0 }}>Notification History Audit Log</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                    Auditable proof across all children answering "did reminders actually go out".
                  </p>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={filterChannel}
                    onChange={(e) => {
                      setFilterChannel(e.target.value);
                      loadNotificationHistory(1, e.target.value, filterMode);
                    }}
                  >
                    <option value="all">All Channels</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="web_app">In-App Web</option>
                  </select>

                  <select
                    className="form-select"
                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                    value={filterMode}
                    onChange={(e) => {
                      setFilterMode(e.target.value);
                      loadNotificationHistory(1, filterChannel, e.target.value);
                    }}
                  >
                    <option value="all">All Modes</option>
                    <option value="live">Live Sent</option>
                    <option value="mock">Mock / Dev</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Parent / Guardian</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Child (UID)</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Channel</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Sent At</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Provider Reference / Fallback</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notificationsData.notifications.map((n) => (
                      <tr key={n.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.65rem 0.4rem', fontWeight: 600 }}>{n.parentName}</td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <div>{n.childName}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{n.childUid}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem', textTransform: 'uppercase', fontWeight: 600 }}>
                          {n.channel}
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <span className={`badge ${n.status === 'live' ? 'badge-completed' : (n.status === 'failed' ? 'badge-overdue' : 'badge-upcoming')}`}>
                            {n.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem', color: 'var(--text-secondary)' }}>
                          {new Date(n.sentAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          <div>{n.providerReference || '—'}</div>
                          {n.fallbackFrom && (
                            <span style={{ color: 'var(--status-due)', fontSize: '0.75rem', fontWeight: 600 }}>
                              Automatic fallback from {n.fallbackFrom}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {notificationsData.pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button
                    disabled={notifPage <= 1}
                    onClick={() => loadNotificationHistory(notifPage - 1)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Previous
                  </button>
                  <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Page {notifPage} of {notificationsData.pages}
                  </span>
                  <button
                    disabled={notifPage >= notificationsData.pages}
                    onClick={() => loadNotificationHistory(notifPage + 1)}
                    className="btn btn-secondary"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Staff Access Requests */}
        {activeTab === 'requests' && (
          <div className="card">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Staff & Administrator Access Requests</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Upon one-click approval, a cryptographically random temporary password is generated, saved with bcrypt, and dispatched to the requester via Twilio.
            </p>

            {accessRequests.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No pending or past access requests.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Status</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Role</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Requester</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Contact</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Facility</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Submitted</th>
                      <th style={{ padding: '0.6rem 0.4rem' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessRequests.map((req) => (
                      <tr key={req._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <span className={`badge ${req.status === 'approved' ? 'badge-completed' : (req.status === 'rejected' ? 'badge-overdue' : 'badge-due')}`}>
                            {req.status}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem', textTransform: 'capitalize', fontWeight: 600 }}>
                          {req.requestedRole}
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <div style={{ fontWeight: 600 }}>{req.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.note}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          <div>{req.email}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{req.mobile}</div>
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>{req.facilityName || 'N/A'}</td>
                        <td style={{ padding: '0.65rem 0.4rem', color: 'var(--text-secondary)' }}>
                          {new Date(req.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td style={{ padding: '0.65rem 0.4rem' }}>
                          {req.status === 'pending' && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleReviewRequest(req._id, 'approve')}
                                className="btn btn-primary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                              >
                                Approve & Dispatch Password
                              </button>
                              <button
                                onClick={() => handleReviewRequest(req._id, 'reject')}
                                className="btn btn-secondary"
                                style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', color: 'var(--status-overdue)' }}
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Facilities Management */}
        {activeTab === 'facilities' && (
          <div className="card">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Enrolled Health Facilities</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Hospitals, Primary Health Centres (PHC), and Urban Vaccination Clinics.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Status</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Facility Name</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Type</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>District</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>State</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f) => (
                    <tr key={f._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.65rem 0.4rem' }}>
                        <span className={`badge ${f.approvalStatus === 'approved' ? 'badge-completed' : 'badge-due'}`}>
                          {f.approvalStatus}
                        </span>
                      </td>
                      <td style={{ padding: '0.65rem 0.4rem', fontWeight: 600 }}>{f.name}</td>
                      <td style={{ padding: '0.65rem 0.4rem', textTransform: 'capitalize' }}>{f.type}</td>
                      <td style={{ padding: '0.65rem 0.4rem' }}>{f.district}</td>
                      <td style={{ padding: '0.65rem 0.4rem' }}>{f.state}</td>
                      <td style={{ padding: '0.65rem 0.4rem' }}>
                        {f.approvalStatus === 'pending' && (
                          <button
                            onClick={() => handleApproveFacility(f._id)}
                            className="btn btn-primary"
                            style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                          >
                            Approve Facility
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Duplicate Detection */}
        {activeTab === 'duplicates' && (
          <div className="card">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>Potential Duplicate Flags</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Algorithmic matching across newborn name, date of birth, and maternal mobile number.
            </p>

            {duplicates.length === 0 ? (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                No active duplicate flags requiring manual clinical resolution.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {duplicates.map((d) => (
                  <div key={d._id} style={{ background: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--status-overdue)', marginBottom: '0.4rem' }}>
                      Match Basis: {d.matchBasis}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Child: <strong>{d.childId?.name} ({d.childId?.childUid})</strong> matched with <strong>{d.possibleMatchChildId?.name} ({d.possibleMatchChildId?.childUid})</strong>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleResolveDuplicate(d._id, 'confirmed_duplicate')}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--status-overdue)' }}
                      >
                        Confirm Duplicate
                      </button>
                      <button
                        onClick={() => handleResolveDuplicate(d._id, 'not_duplicate')}
                        className="btn btn-secondary"
                        style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: 'var(--status-completed)' }}
                      >
                        Mark As Distinct Child
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Audit Trail */}
        {activeTab === 'audit' && (
          <div className="card">
            <h3 style={{ fontSize: '1.3rem', marginBottom: '0.5rem' }}>System Audit Trail</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Immutable operational logs for clinical compliance and registry accountability.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Timestamp</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>User</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Action</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>Target Entity</th>
                    <th style={{ padding: '0.6rem 0.4rem' }}>IP Address</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.65rem 0.4rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '0.65rem 0.4rem', fontWeight: 600 }}>
                        {log.userId?.name || 'System'} ({log.userId?.role || 'Daemon'})
                      </td>
                      <td style={{ padding: '0.65rem 0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                        {log.action}
                      </td>
                      <td style={{ padding: '0.65rem 0.4rem', color: 'var(--text-secondary)' }}>
                        {log.targetCollection} ({log.targetId ? `${log.targetId.substring(0, 10)}...` : 'N/A'})
                      </td>
                      <td style={{ padding: '0.65rem 0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

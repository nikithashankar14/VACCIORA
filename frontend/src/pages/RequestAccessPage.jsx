import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { authApi } from '../api';

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    requestedRole: 'staff',
    name: '',
    email: '',
    mobile: '',
    facilityName: '',
    note: ''
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.requestAccess(formData);
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.25rem',
        background: 'var(--bg-app)'
      }}>
        <div className="card" style={{ maxWidth: '480px', width: '100%', textAlign: 'center', padding: '2.5rem' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--status-completed-bg)',
            color: 'var(--status-completed)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1rem'
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Request Submitted</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Your application for <strong>{formData.requestedRole === 'staff' ? 'Hospital / Clinic Staff' : 'Health Administrator'}</strong> has been routed to the registry administrators for review.
          </p>
          <div style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '1rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            textAlign: 'left'
          }}>
            <strong>Next Steps:</strong>
            <ul style={{ paddingLeft: '1.2rem', marginTop: '0.4rem', lineHeight: 1.5 }}>
              <li>An administrator will verify your facility credentials.</li>
              <li>Upon approval, a one-time temporary password will be dispatched to <strong>{formData.mobile}</strong>.</li>
              <li>You will be required to change your password upon your first sign-in.</li>
            </ul>
          </div>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%' }}>
            Return to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1.25rem',
      background: 'var(--bg-app)'
    }}>
      <div className="card" style={{ maxWidth: '540px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--role-staff)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 12px rgba(3, 105, 161, 0.25)'
          }}>
            <Building2 size={26} />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>Staff & Administrator Onboarding</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Submit an authorized request to access clinical intake or administrative governance.
          </p>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-overdue-bg)',
            color: 'var(--status-overdue)',
            border: '1px solid var(--status-overdue-border)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Requested Account Role</label>
            <select
              className="form-select"
              value={formData.requestedRole}
              onChange={(e) => setFormData({ ...formData, requestedRole: e.target.value })}
            >
              <option value="staff">Hospital / PHC / Clinic Staff (Vaccination In-charge)</option>
              <option value="admin">Public Health Administrator (Supervisor / Auditor)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name & Clinical Designation</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Dr. Rajesh Verma / Nurse Priya"
              required
            />
          </div>

          <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0' }}>
            <div className="form-group">
              <label className="form-label">Official Email</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rajesh@hospital.gov.in"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Mobile Number</label>
              <input
                type="tel"
                className="form-input"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+919876543210"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Hospital / Vaccination Facility Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.facilityName}
              onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
              placeholder="e.g. District Civil Hospital / Urban Health Center #4"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Official Notes / Registration Number</label>
            <textarea
              className="form-textarea"
              rows={2}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="State medical council registration number or department name"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-staff"
            style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Submitting Application...' : 'Submit Access Request'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          Already approved?{' '}
          <Link to="/login" style={{ color: 'var(--role-staff)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In with Temporary or New Password
          </Link>
        </div>
      </div>
    </div>
  );
}

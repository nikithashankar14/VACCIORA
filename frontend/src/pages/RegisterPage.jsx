import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Users, ShieldCheck, ArrowRight, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    whatsappNumber: '',
    password: '',
    consentGiven: false
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.consentGiven) {
      setError('You must provide explicit informed consent to create an immunization tracking account.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        mobileNumber: formData.mobileNumber,
        whatsappNumber: formData.whatsappNumber || formData.mobileNumber,
        password: formData.password,
        consentGiven: true
      });
      navigate('/parent');
    } catch (err) {
      setError(err.message || 'Registration failed. Please review inputs.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 72px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1.25rem',
      background: 'var(--bg-app)'
    }}>
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--role-parent)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 12px rgba(45, 106, 79, 0.25)'
          }}>
            <Users size={26} />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>Parent Self-Registration</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Create your account to link your child's birth record and receive smart reminders.
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
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ananya Sharma"
              required
            />
          </div>

          <div className="grid-responsive" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0' }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="ananya@example.com"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <input
                type="tel"
                className="form-input"
                value={formData.mobileNumber}
                onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                placeholder="+919876543210"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">WhatsApp Number (Optional)</label>
            <input
              type="tel"
              className="form-input"
              value={formData.whatsappNumber}
              onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
              placeholder="Leave blank to use primary mobile"
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Reminders will be delivered to this number via Twilio WhatsApp.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="At least 6 characters"
              required
            />
          </div>

          {/* Explicit Informed Consent Step */}
          <div style={{
            background: 'var(--role-parent-subtle)',
            border: '1px solid var(--role-parent-border)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            margin: '1.25rem 0'
          }}>
            <div
              onClick={() => setFormData({ ...formData, consentGiven: !formData.consentGiven })}
              style={{ display: 'flex', gap: '0.75rem', cursor: 'pointer', alignItems: 'flex-start' }}
            >
              <div style={{ marginTop: '2px', color: 'var(--role-parent)' }}>
                {formData.consentGiven ? <CheckSquare size={20} /> : <Square size={20} />}
              </div>
              <div style={{ fontSize: '0.825rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                <strong>Explicit Informed Consent (UIP Protocol v1.0):</strong> I consent to Vacciora recording my child's immunization schedule and sending me health alerts and reminders via WhatsApp, SMS, and email according to national guidelines.
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-parent"
            style={{ width: '100%', padding: '0.75rem' }}
          >
            {loading ? 'Creating Account...' : 'Complete Registration'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{
          marginTop: '1.75rem',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--role-parent)', fontWeight: 600, textDecoration: 'none' }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

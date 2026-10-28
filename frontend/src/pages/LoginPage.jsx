import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Lock, Phone, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(identifier, password);
      const role = res.user.role;
      if (role === 'admin') navigate('/admin');
      else if (role === 'staff') navigate('/staff');
      else navigate('/parent');
    } catch (err) {
      setError(err.message || 'Login failed. Please verify credentials.');
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
      padding: '2rem 1.25rem',
      background: 'var(--bg-app)'
    }}>
      <div className="card" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem',
            boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)'
          }}>
            <Shield size={26} />
          </div>
          <h2 style={{ fontSize: '1.6rem', marginBottom: '0.35rem' }}>Sign In to Vacciora</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Unified portal access for parents, hospital staff, and health administrators
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
            <label className="form-label">Mobile Number or Email</label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. +919876543210 or email@domain.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1.25rem', padding: '0.75rem' }}
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight size={16} />
          </button>
        </form>

        <div style={{
          marginTop: '2rem',
          paddingTop: '1.5rem',
          borderTop: '1px solid var(--border-light)',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--text-secondary)'
        }}>
          <div>
            New parent?{' '}
            <Link to="/register" style={{ color: 'var(--role-parent)', fontWeight: 600, textDecoration: 'none' }}>
              Register Account
            </Link>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            Hospital or clinic staff?{' '}
            <Link to="/request-access" style={{ color: 'var(--role-staff)', fontWeight: 600, textDecoration: 'none' }}>
              Request Access
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

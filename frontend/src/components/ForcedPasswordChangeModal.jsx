import React, { useState } from 'react';
import { ShieldAlert, KeyRound, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ForcedPasswordChangeModal() {
  const { requirePasswordChange, changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!requirePasswordChange) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
    } catch (err) {
      setError(err.message || 'Failed to update password. Verify current password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1rem',
          color: 'var(--color-primary)'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--color-primary-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <KeyRound size={22} color="var(--color-primary)" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Password Change Mandatory</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Security protocol requires setting a new password before accessing your account.
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            background: 'var(--status-overdue-bg)',
            color: 'var(--status-overdue)',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.85rem',
            marginBottom: '1rem',
            border: '1px solid var(--status-overdue-border)'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Current / Temporary Password</label>
            <input
              type="password"
              className="form-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter temporary password received"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">New Password</label>
            <input
              type="password"
              className="form-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
            />
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%' }}
            >
              {loading ? 'Securing Account...' : 'Set New Password & Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

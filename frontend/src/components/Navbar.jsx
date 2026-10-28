import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Shield, User, LogOut, CheckCircle, Bell, QrCode, FileCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, isParent, isStaff, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (isAdmin) return '/admin';
    if (isStaff) return '/staff';
    return '/parent';
  };

  const getRoleBadgeStyle = () => {
    if (isAdmin) return { bg: 'var(--role-admin-subtle)', text: 'var(--role-admin)', border: 'var(--role-admin-border)', label: 'Admin Portal' };
    if (isStaff) return { bg: 'var(--role-staff-subtle)', text: 'var(--role-staff)', border: 'var(--role-staff-border)', label: 'Healthcare Staff' };
    return { bg: 'var(--role-parent-subtle)', text: 'var(--role-parent)', border: 'var(--role-parent-border)', label: 'Parent Portal' };
  };

  const roleStyle = user ? getRoleBadgeStyle() : null;

  return (
    <header style={{
      background: '#FFFFFF',
      borderBottom: '1px solid var(--border-light)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div className="container" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '72px'
      }}>
        {/* Brand Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #0F766E 0%, #115E59 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
            boxShadow: '0 2px 8px rgba(15, 118, 110, 0.25)'
          }}>
            <Shield size={24} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--color-primary)',
              lineHeight: 1.1
            }}>
              Vacciora
            </div>
            <div style={{
              fontSize: '0.725rem',
              fontWeight: 500,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              National Immunization Platform
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            to="/schedule"
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: location.pathname === '/schedule' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'color var(--transition-fast)'
            }}
          >
            UIP Schedule
          </Link>
          <Link
            to="/verify"
            style={{
              fontSize: '0.9rem',
              fontWeight: 500,
              color: location.pathname === '/verify' ? 'var(--color-primary)' : 'var(--text-secondary)',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <FileCheck size={16} />
            Verify Certificate
          </Link>

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '0.5rem' }}>
              <Link
                to={getDashboardPath()}
                className="btn btn-secondary"
                style={{
                  padding: '0.45rem 0.9rem',
                  fontSize: '0.85rem',
                  borderColor: roleStyle.border,
                  backgroundColor: roleStyle.bg,
                  color: roleStyle.text
                }}
              >
                {roleStyle.label}
              </Link>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  lineHeight: 1.2
                }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {user.name}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {user.email}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  title="Log out"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '0.4rem',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link to="/login" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
                Sign In
              </Link>
              <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.1rem' }}>
                Parent Registration
              </Link>
              <Link
                to="/request-access"
                style={{
                  fontSize: '0.825rem',
                  color: 'var(--role-staff)',
                  textDecoration: 'none',
                  fontWeight: 500,
                  marginLeft: '0.25rem'
                }}
              >
                Staff Access
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

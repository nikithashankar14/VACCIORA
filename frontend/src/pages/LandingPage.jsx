import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Sparkles,
  Building2,
  Users,
  QrCode,
  FileCheck,
  ArrowRight,
  Clock,
  Send,
  Lock,
  Database
} from 'lucide-react';
import UipTimelineVisual from '../components/UipTimelineVisual';

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F7F5 100%)',
        borderBottom: '1px solid var(--border-light)',
        padding: '4.5rem 0 3.5rem 0'
      }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '860px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary-dark)',
            fontSize: '0.85rem',
            fontWeight: 600,
            marginBottom: '1.5rem',
            boxShadow: '0 1px 3px rgba(15, 118, 110, 0.1)'
          }}>
            <ShieldCheck size={16} />
            India Universal Immunization Programme (UIP) &bull; Production Standards
          </div>

          <h1 style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.4rem)',
            fontWeight: 700,
            lineHeight: 1.15,
            color: 'var(--text-primary)',
            marginBottom: '1.25rem'
          }}>
            Protecting Every Child with <span style={{ color: 'var(--color-primary)' }}>AI-Predictive</span> Reminders & Verified Records.
          </h1>

          <p style={{
            fontSize: '1.15rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.65,
            marginBottom: '2.25rem',
            fontWeight: 400
          }}>
            Vacciora bridges maternity hospitals and families. Hospital staff record birth doses at delivery, parents link records seamlessly, and our predictive risk engine orchestrates multi-channel SMS and WhatsApp alerts to prevent missed doses.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary" style={{ padding: '0.85rem 1.75rem', fontSize: '1rem' }}>
              Register as Parent <ArrowRight size={18} />
            </Link>
            <Link to="/verify" className="btn btn-secondary" style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}>
              <FileCheck size={18} /> Verify Certificate Authenticity
            </Link>
            <Link to="/request-access" className="btn btn-staff" style={{ padding: '0.85rem 1.5rem', fontSize: '1rem' }}>
              <Building2 size={18} /> Healthcare Staff Portal
            </Link>
          </div>
        </div>
      </section>

      {/* Honest Trust & Security Strip */}
      <section style={{
        background: '#FFFFFF',
        borderBottom: '1px solid var(--border-light)',
        padding: '1.5rem 0'
      }}>
        <div className="container">
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Lock size={22} color="var(--color-primary)" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Zero Fake Data Policy</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Strict persistence & zero placeholder records</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={22} color="var(--role-staff)" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>SHA-256 Digital Signatures</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cryptographically tamper-proof certificates</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Send size={22} color="var(--role-parent)" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>WhatsApp + Email Alerts</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Automated predictive delivery</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Database size={22} color="var(--role-admin)" />
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>UIP National Guideline</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Complete schedule from birth to 16 years</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* "How It Works" 3-Step Lifecycle */}
      <section style={{ padding: '4rem 0', background: 'var(--bg-app)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 3rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>How Vacciora Works</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              A child’s lifelong immunization record originates at the birth facility and follows them securely through every milestone.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '2rem'
          }}>
            {/* Step 1 */}
            <div className="card" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '24px',
                background: 'var(--role-staff)',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                1
              </div>
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem', color: 'var(--role-staff)' }}>
                <Building2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Birth Facility Origin</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Staff at the labor ward register the newborn and log mandatory Day-0 doses (BCG, OPV-0, Hepatitis B). A permanent unique Child UID (e.g. <code>CHD-2026-XXXXXX</code>) is issued.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '24px',
                background: 'var(--role-parent)',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                2
              </div>
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem', color: 'var(--role-parent)' }}>
                <Users size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Parent Account Linking</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Parents self-register and link the hospital record using their Child UID and verified birth mobile number. Parents never manually enter doses or schedules — the timeline is calculated automatically.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card" style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute',
                top: '-15px',
                left: '24px',
                background: 'var(--color-primary)',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}>
                3
              </div>
              <div style={{ marginTop: '0.5rem', marginBottom: '1rem', color: 'var(--color-primary)' }}>
                <Sparkles size={32} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>AI Predictive Alerts</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                A trained machine learning model evaluates compliance patterns and schedules timely reminders. Alerts escalate via WhatsApp and SMS as due dates approach, preventing dropouts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive National UIP Schedule Timeline */}
      <section style={{ padding: '4.5rem 0', background: '#FFFFFF', borderTop: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '720px', margin: '0 auto 2.5rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>India's Universal Immunization Programme (UIP)</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Explore the official schedule of life-saving vaccines from birth to 16 years, built right into the Vacciora rule engine.
            </p>
          </div>

          <UipTimelineVisual />
        </div>
      </section>

      {/* Role Cards Section */}
      <section style={{ padding: '4rem 0', background: 'var(--bg-app)', borderTop: '1px solid var(--border-light)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', maxWidth: '640px', margin: '0 auto 2.5rem auto' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Built for Every Healthcare Stakeholder</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Tailored workspaces designed to enforce clinical accuracy and ease family anxiety.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.75rem'
          }}>
            {/* Parents Card */}
            <div className="card" style={{ borderTop: '4px solid var(--role-parent)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--role-parent)', marginBottom: '0.75rem' }}>
                <Users size={24} />
                <h3 style={{ fontSize: '1.3rem' }}>Parents & Families</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Keep track of upcoming vaccines with zero guesswork. Receive respectful notifications on WhatsApp and SMS, carry a digital QR pass, and download verifiable PDF certificates.
              </p>
              <Link to="/register" className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--role-parent-border)', color: 'var(--role-parent)' }}>
                Parent Portal Sign Up
              </Link>
            </div>

            {/* Healthcare Staff Card */}
            <div className="card" style={{ borderTop: '4px solid var(--role-staff)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--role-staff)', marginBottom: '0.75rem' }}>
                <Building2 size={24} />
                <h3 style={{ fontSize: '1.3rem' }}>Hospital & Clinic Staff</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Fast intake via digital QR scanner or UID search. Log administered vaccines with batch/lot numbers, generate cryptographic verification hashes, and record AEFI adverse events.
              </p>
              <Link to="/request-access" className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--role-staff-border)', color: 'var(--role-staff)' }}>
                Request Staff Access
              </Link>
            </div>

            {/* Health Administrators Card */}
            <div className="card" style={{ borderTop: '4px solid var(--role-admin)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--role-admin)', marginBottom: '0.75rem' }}>
                <ShieldCheck size={24} />
                <h3 style={{ fontSize: '1.3rem' }}>Health Administrators</h3>
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
                Supervise immunization coverage, inspect real-time ML risk distributions, monitor Twilio SMS and WhatsApp notification delivery health, and review staff onboarding requests.
              </p>
              <Link to="/login" className="btn btn-secondary" style={{ width: '100%', borderColor: 'var(--role-admin-border)', color: 'var(--role-admin)' }}>
                Administrator Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: 'auto',
        background: '#FFFFFF',
        borderTop: '1px solid var(--border-light)',
        padding: '2.5rem 0'
      }}>
        <div className="container" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              Vacciora
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              National Immunization Management & Predictive Reminder Platform
            </div>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Aligned with India Ministry of Health & Family Welfare Universal Immunization Programme
          </div>
        </div>
      </footer>
    </div>
  );
}

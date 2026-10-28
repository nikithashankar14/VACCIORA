import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Search, CheckCircle2, XCircle, FileCheck, Hash } from 'lucide-react';
import { certificatesApi } from '../api';

export default function CertificateVerificationPage() {
  const [searchParams] = useSearchParams();
  const [identifier, setIdentifier] = useState(searchParams.get('certId') || searchParams.get('hash') || '');
  const [verificationResult, setVerificationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const initialId = searchParams.get('certId') || searchParams.get('hash');
    if (initialId) {
      verifyCertificate(initialId);
    }
  }, [searchParams]);

  const verifyCertificate = async (idToVerify) => {
    const id = (idToVerify || identifier).trim();
    if (!id) return;
    setLoading(true);
    setSearched(true);
    setVerificationResult(null);

    try {
      const res = await certificatesApi.verify(id);
      setVerificationResult(res);
    } catch (err) {
      setVerificationResult({ verified: false, message: err.message || 'Verification failed.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    verifyCertificate(identifier);
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: 'var(--bg-app)', padding: '3rem 1.25rem' }}>
      <div className="container" style={{ maxWidth: '680px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '16px',
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '0.75rem'
          }}>
            <FileCheck size={28} />
          </div>
          <h1 style={{ fontSize: '2rem', marginBottom: '0.35rem' }}>Immunization Certificate Verifier</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Verify the cryptographic authenticity of an official Vacciora Universal Immunization Certificate using its Certificate ID or SHA-256 digital hash.
          </p>
        </div>

        <div className="card" style={{ marginBottom: '2rem' }}>
          <form onSubmit={handleSubmit}>
            <label className="form-label">Certificate ID or SHA-256 Cryptographic Hash</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. CERT-CHD-2026-... or 64-character SHA-256 hash"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Search size={16} /> Verify Authenticity
              </button>
            </div>
          </form>
        </div>

        {loading && (
          <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
            <div className="skeleton" style={{ width: '60px', height: '60px', borderRadius: '50%', margin: '0 auto 1rem auto' }} />
            <div className="skeleton" style={{ width: '200px', height: '20px', margin: '0 auto 0.5rem auto' }} />
            <div className="skeleton" style={{ width: '320px', height: '14px', margin: '0 auto' }} />
          </div>
        )}

        {!loading && searched && verificationResult && (
          <div className="card" style={{
            borderTop: `6px solid ${verificationResult.verified ? 'var(--status-completed)' : 'var(--status-overdue)'}`,
            padding: '2.5rem'
          }}>
            {verificationResult.verified ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--status-completed-bg)',
                    color: 'var(--status-completed)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--status-completed)' }}>
                      Cryptographically Verified Authentic
                    </h3>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Official record confirmed in the Vacciora Universal Immunization Registry.
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'var(--bg-app)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  fontSize: '0.9rem',
                  border: '1px solid var(--border-light)',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Child Full Name:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{verificationResult.child?.name}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Permanent Child UID:</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{verificationResult.child?.childUid}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Registration Facility:</span>
                    <span>{verificationResult.child?.birthFacility || 'Authorized UIP Center'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Certificate Identifier:</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{verificationResult.certificateUid}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Issue Date:</span>
                    <span>{new Date(verificationResult.generatedAt).toLocaleDateString('en-IN')}</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                    Digital SHA-256 Signature:
                  </div>
                  <div style={{
                    background: '#FFFFFF',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.6rem 0.8rem',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    wordBreak: 'break-all',
                    color: 'var(--color-primary)'
                  }}>
                    {verificationResult.recordHash}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'var(--status-overdue-bg)',
                  color: 'var(--status-overdue)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1rem'
                }}>
                  <XCircle size={28} />
                </div>
                <h3 style={{ fontSize: '1.4rem', color: 'var(--status-overdue)', marginBottom: '0.5rem' }}>
                  Verification Failed
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto' }}>
                  {verificationResult.message || 'No official immunization certificate matches the provided identifier or cryptographic signature.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

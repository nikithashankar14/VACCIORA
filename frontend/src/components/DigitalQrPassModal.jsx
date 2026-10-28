import React, { useState, useEffect } from 'react';
import { QrCode, X, Copy, Check, Download, ShieldCheck } from 'lucide-react';
import { qrApi } from '../api';

export default function DigitalQrPassModal({ child, onClose }) {
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!child?._id) return;
    const fetchQr = async () => {
      try {
        const res = await qrApi.generatePass(child._id);
        setQrData(res);
      } catch (err) {
        console.error('QR Pass Generation Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchQr();
  }, [child]);

  const handleCopy = () => {
    if (!qrData?.tokenValue) return;
    navigator.clipboard.writeText(qrData.tokenValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '420px', textAlign: 'center' }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer'
          }}
        >
          <X size={20} />
        </button>

        <div style={{
          display: 'inline-flex',
          padding: '0.6rem',
          borderRadius: '12px',
          background: 'var(--color-primary-light)',
          color: 'var(--color-primary)',
          marginBottom: '0.75rem'
        }}>
          <QrCode size={28} />
        </div>

        <h3 style={{ fontSize: '1.3rem', marginBottom: '0.2rem' }}>Digital Clinic Pass</h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
          Show this QR code at any UIP vaccination center for instant child intake.
        </p>

        {loading ? (
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="skeleton" style={{ width: '220px', height: '220px' }} />
          </div>
        ) : qrData?.qrDataUrl ? (
          <div style={{
            background: '#FFFFFF',
            border: '2px dashed var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '1.25rem',
            marginBottom: '1rem',
            display: 'inline-block'
          }}>
            <img
              src={qrData.qrDataUrl}
              alt="Child Digital Immunization QR Pass"
              style={{ width: '200px', height: '200px', display: 'block' }}
            />
            <div style={{ marginTop: '0.5rem', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
              {child.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-primary)', fontWeight: 600 }}>
              {child.childUid}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--status-overdue)', padding: '1rem' }}>
            Failed to generate QR pass.
          </div>
        )}

        {qrData && (
          <div style={{
            background: 'var(--bg-app)',
            padding: '0.6rem 0.8rem',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.25rem'
          }}>
            <span style={{ fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
              {qrData.tokenValue}
            </span>
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontWeight: 600
              }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem',
          fontSize: '0.775rem',
          color: 'var(--text-muted)'
        }}>
          <ShieldCheck size={14} color="var(--color-primary)" />
          Valid for 30 days &bull; Revocable anytime
        </div>
      </div>
    </div>
  );
}

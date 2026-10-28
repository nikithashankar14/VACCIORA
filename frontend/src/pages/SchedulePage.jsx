import React, { useState, useEffect } from 'react';
import { Calendar, ShieldCheck, Search, Filter } from 'lucide-react';
import { scheduleApi } from '../api';
import UipTimelineVisual from '../components/UipTimelineVisual';

export default function SchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    scheduleApi.getUipSchedule().then((res) => {
      setSchedules(res.schedules || []);
      setLoading(false);
    }).catch((err) => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const antigenGroups = ['all', ...new Set(schedules.map(s => s.antigenGroup).filter(Boolean))];

  const filtered = schedules.filter((s) => {
    const matchesSearch = s.vaccineName.toLowerCase().includes(search.toLowerCase()) ||
                          s.vaccineCode.toLowerCase().includes(search.toLowerCase()) ||
                          s.dueAgeLabel.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === 'all' || s.antigenGroup === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', background: 'var(--bg-app)', padding: '2.5rem 0' }}>
      <div className="container">
        {/* Header */}
        <div style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 2.5rem auto' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.9rem',
            borderRadius: 'var(--radius-full)',
            background: 'var(--color-primary-light)',
            color: 'var(--color-primary-dark)',
            fontSize: '0.825rem',
            fontWeight: 600,
            marginBottom: '0.75rem'
          }}>
            <Calendar size={15} /> National Reference Standard
          </div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Universal Immunization Programme (UIP)</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', lineHeight: 1.6 }}>
            Official immunization guidelines formulated by the Ministry of Health & Family Welfare, Government of India.
          </p>
        </div>

        {/* Interactive Visual Timeline */}
        <div style={{ marginBottom: '3rem' }}>
          <UipTimelineVisual />
        </div>

        {/* Detailed Reference Catalog */}
        <div className="card">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '1rem'
          }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', margin: 0 }}>All Scheduled UIP Vaccine Doses</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
                Filter by antigen group, dose name, or administrative milestone.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.2rem', minWidth: '220px' }}
                  placeholder="Search vaccines..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Search size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>

              <select
                className="form-select"
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
              >
                {antigenGroups.map(g => (
                  <option key={g} value={g}>
                    {g === 'all' ? 'All Antigen Groups' : g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading schedule reference data...
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-light)', textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Code</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Vaccine Name</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Dose</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Target Milestone</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Due (Age in Days)</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Route & Site</th>
                    <th style={{ padding: '0.75rem 0.5rem' }}>Antigen Category</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s._id || s.vaccineCode} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{s.vaccineCode}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 600 }}>
                        {s.vaccineName}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        Dose {s.doseNumber}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {s.dueAgeLabel}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontFamily: 'var(--font-mono)' }}>
                        {s.dueAgeDays}d
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', color: 'var(--text-secondary)' }}>
                        {s.route} &bull; {s.site}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          background: 'var(--bg-app)',
                          border: '1px solid var(--border-light)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)'
                        }}>
                          {s.antigenGroup}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

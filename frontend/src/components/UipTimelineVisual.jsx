import React, { useState } from 'react';
import { Calendar, ShieldCheck, Clock, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const UIP_MILESTONES = [
  {
    age: 'At Birth',
    days: 0,
    vaccines: [
      { code: 'BCG', name: 'Bacillus Calmette-Guérin', route: 'Intradermal', target: 'Severe Childhood Tuberculosis' },
      { code: 'OPV-0', name: 'Oral Polio Vaccine (Birth)', route: 'Oral', target: 'Poliomyelitis' },
      { code: 'HepB-0', name: 'Hepatitis B (Birth dose)', route: 'Intramuscular', target: 'Perinatal Hepatitis B' }
    ]
  },
  {
    age: '6 Weeks',
    days: 42,
    vaccines: [
      { code: 'OPV-1', name: 'Oral Polio Vaccine 1', route: 'Oral', target: 'Poliomyelitis' },
      { code: 'Penta-1', name: 'Pentavalent 1 (DPT+HepB+Hib)', route: 'Intramuscular', target: '5 Life-threatening Diseases' },
      { code: 'Rota-1', name: 'Rotavirus Vaccine 1', route: 'Oral', target: 'Rotaviral Diarrhea' },
      { code: 'fIPV-1', name: 'Fractional IPV 1', route: 'Intradermal', target: 'Polio protection' },
      { code: 'PCV-1', name: 'Pneumococcal Conjugate 1', route: 'Intramuscular', target: 'Pneumococcal Pneumonia & Meningitis' }
    ]
  },
  {
    age: '10 Weeks',
    days: 70,
    vaccines: [
      { code: 'OPV-2', name: 'Oral Polio Vaccine 2', route: 'Oral', target: 'Poliomyelitis' },
      { code: 'Penta-2', name: 'Pentavalent 2', route: 'Intramuscular', target: 'Diphtheria, Pertussis, Tetanus, HepB, Hib' },
      { code: 'Rota-2', name: 'Rotavirus Vaccine 2', route: 'Oral', target: 'Rotaviral Diarrhea' }
    ]
  },
  {
    age: '14 Weeks',
    days: 98,
    vaccines: [
      { code: 'OPV-3', name: 'Oral Polio Vaccine 3', route: 'Oral', target: 'Poliomyelitis' },
      { code: 'Penta-3', name: 'Pentavalent 3', route: 'Intramuscular', target: 'Diphtheria, Pertussis, Tetanus, HepB, Hib' },
      { code: 'Rota-3', name: 'Rotavirus Vaccine 3', route: 'Oral', target: 'Rotaviral Diarrhea' },
      { code: 'fIPV-2', name: 'Fractional IPV 2', route: 'Intradermal', target: 'Polio booster immunity' },
      { code: 'PCV-2', name: 'Pneumococcal Conjugate 2', route: 'Intramuscular', target: 'Pneumococcal Disease' }
    ]
  },
  {
    age: '9-12 Months',
    days: 270,
    vaccines: [
      { code: 'MR-1', name: 'Measles & Rubella 1', route: 'Subcutaneous', target: 'Measles and Congenital Rubella' },
      { code: 'JE-1', name: 'Japanese Encephalitis 1', route: 'Subcutaneous', target: 'Brain fever (Endemic areas)' },
      { code: 'PCV-B', name: 'PCV Booster', route: 'Intramuscular', target: 'Pneumococcal immunity reinforcement' },
      { code: 'VitA-1', name: 'Vitamin A Dose 1', route: 'Oral (100k IU)', target: 'Blindness prevention & immunity' }
    ]
  },
  {
    age: '16-24 Months',
    days: 480,
    vaccines: [
      { code: 'MR-2', name: 'Measles & Rubella 2', route: 'Subcutaneous', target: 'Sustained Measles Elimination' },
      { code: 'JE-2', name: 'Japanese Encephalitis 2', route: 'Subcutaneous', target: 'Brain fever protection' },
      { code: 'DPT-B1', name: 'DPT Booster 1', route: 'Intramuscular', target: 'Whooping cough & Tetanus immunity' },
      { code: 'OPV-B', name: 'OPV Booster', route: 'Oral', target: 'Polio booster' },
      { code: 'VitA-2', name: 'Vitamin A Dose 2', route: 'Oral (200k IU)', target: 'Childhood ocular health' }
    ]
  },
  {
    age: '5-6 Years',
    days: 1825,
    vaccines: [
      { code: 'DPT-B2', name: 'DPT Booster 2', route: 'Intramuscular', target: 'School-age Diphtheria & Pertussis defense' }
    ]
  },
  {
    age: '10 & 16 Years',
    days: 3650,
    vaccines: [
      { code: 'Td', name: 'Tetanus & Adult Diphtheria', route: 'Intramuscular', target: 'Adolescent Tetanus protection' }
    ]
  }
];

export default function UipTimelineVisual({ activeMilestoneIndex = 0 }) {
  const [selectedMilestone, setSelectedMilestone] = useState(activeMilestoneIndex);

  const current = UIP_MILESTONES[selectedMilestone];

  return (
    <div style={{ width: '100%' }}>
      {/* Horizontal Milestone Tracker */}
      <div style={{
        display: 'flex',
        overflowX: 'auto',
        gap: '0.75rem',
        paddingBottom: '1rem',
        marginBottom: '1.5rem',
        scrollbarWidth: 'thin'
      }}>
        {UIP_MILESTONES.map((m, idx) => {
          const isSelected = selectedMilestone === idx;
          return (
            <button
              key={m.age}
              onClick={() => setSelectedMilestone(idx)}
              style={{
                flex: '0 0 auto',
                padding: '0.75rem 1.1rem',
                borderRadius: 'var(--radius-card)',
                background: isSelected ? 'var(--color-primary)' : '#FFFFFF',
                color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--border-medium)'}`,
                boxShadow: isSelected ? '0 4px 12px rgba(15, 118, 110, 0.2)' : 'none',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '0.2rem',
                transition: 'all var(--transition-fast)'
              }}
            >
              <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{m.age}</span>
              <span style={{
                fontSize: '0.75rem',
                opacity: isSelected ? 0.9 : 0.7,
                color: isSelected ? '#FFFFFF' : 'var(--text-muted)'
              }}>
                {m.vaccines.length} doses
              </span>
            </button>
          );
        })}
      </div>

      {/* Selected Milestone Detail Card */}
      <div className="card" style={{
        background: '#FFFFFF',
        border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-card)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', fontWeight: 600 }}>
              Universal Immunization Programme Standard
            </div>
            <h3 style={{ fontSize: '1.4rem', margin: '0.2rem 0 0 0' }}>
              Milestone: {current.age}
            </h3>
          </div>
          <span className="badge badge-upcoming" style={{ fontSize: '0.85rem' }}>
            Day {current.days} of life
          </span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1rem'
        }}>
          {current.vaccines.map((v) => (
            <div
              key={v.code}
              style={{
                background: 'var(--bg-app)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                border: '1px solid var(--border-light)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: 'var(--color-primary)',
                    fontFamily: 'var(--font-heading)'
                  }}>
                    {v.code}
                  </span>
                  <span style={{
                    fontSize: '0.75rem',
                    background: '#FFFFFF',
                    border: '1px solid var(--border-light)',
                    padding: '0.15rem 0.5rem',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-secondary)'
                  }}>
                    {v.route}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  {v.name}
                </div>
              </div>

              <div style={{
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '0.5rem',
                borderTop: '1px dashed var(--border-medium)',
                paddingTop: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                <ShieldCheck size={14} color="var(--color-primary)" />
                <span>Protects: {v.target}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

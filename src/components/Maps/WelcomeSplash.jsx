import React, { useState, useEffect } from 'react';
import { Sun, Building2, Zap, Globe } from 'lucide-react';

/**
 * Welcome Splash Overlay for the Map Page
 * Institutional design matching the platform theme (#0f1923 dark navy)
 */
const WelcomeSplash = ({ onDismiss }) => {
  const [phase, setPhase] = useState('entering'); // entering → visible → exiting → gone
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 100);
    const t2 = setTimeout(() => setStatsVisible(true), 500);
    const t3 = setTimeout(() => handleDismiss(), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleDismiss = () => {
    if (phase === 'exiting' || phase === 'gone') return;
    setPhase('exiting');
    setTimeout(() => {
      setPhase('gone');
      if (onDismiss) onDismiss();
    }, 400);
  };

  if (phase === 'gone') return null;

  const stats = [
    { icon: <Building2 size={18} />, value: '12,500+', label: 'Buildings mapped' },
    { icon: <Zap size={18} />, value: '3.2 GWh', label: 'Solar potential' },
    { icon: <Globe size={18} />, value: '2,600 t', label: 'CO₂ saveable/yr' },
    { icon: <Sun size={18} />, value: 'Real-time', label: '3D shadow analysis' },
  ];

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        background: '#0f1923',
        cursor: 'pointer',
        opacity: phase === 'entering' ? 0 : phase === 'exiting' ? 0 : 1,
        transition: 'opacity 0.4s ease-in-out',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '3rem 4rem',
      }}
    >
      {/* Logo row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: '2.5rem',
        opacity: phase === 'visible' ? 1 : 0,
        transform: phase === 'visible' ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.6s ease',
      }}>
        <div style={{
          width: 40, height: 40,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Sun size={20} color="#60a5fa" />
        </div>
        <span style={{ fontSize: '0.85rem', color: '#64748b', letterSpacing: '0.03em' }}>
          TrueGeoMap · MCGM 3D GIS Platform
        </span>
      </div>

      {/* Title block */}
      <div style={{
        opacity: phase === 'visible' ? 1 : 0,
        transform: phase === 'visible' ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s',
        marginBottom: '2.5rem',
      }}>
        <h1 style={{
          fontSize: '2.5rem',
          fontWeight: 600,
          color: '#ffffff',
          margin: '0 0 0.5rem 0',
          letterSpacing: '-0.01em',
          lineHeight: 1.15,
        }}>
          Solar Rooftop Analysis
        </h1>
        <p style={{ fontSize: '1rem', color: '#94a3b8', margin: 0 }}>
          Mumbai Metropolitan Region
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2.5rem',
        opacity: statsVisible ? 1 : 0,
        transform: statsVisible ? 'translateY(0)' : 'translateY(16px)',
        transition: 'all 0.6s ease 0.15s',
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            padding: '1rem 1.5rem',
            background: 'rgba(255,255,255,0.04)',
            minWidth: 120,
          }}>
            <div style={{ color: '#475569', marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#60a5fa', lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <button
        style={{
          background: '#1d4ed8',
          color: '#ffffff',
          border: 'none',
          borderRadius: 6,
          padding: '0.75rem 1.75rem',
          fontSize: '0.95rem',
          fontWeight: 500,
          cursor: 'pointer',
          opacity: statsVisible ? 1 : 0,
          transition: 'opacity 0.4s ease 0.3s, background 150ms ease',
          marginBottom: '0.5rem',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
        onMouseLeave={e => e.currentTarget.style.background = '#1d4ed8'}
        onClick={handleDismiss}
      >
        Start Analysis →
      </button>

      {/* Footer */}
      <div style={{
        position: 'absolute',
        bottom: '1.5rem',
        left: '4rem',
        fontSize: '0.7rem',
        color: '#334155',
        letterSpacing: '0.04em',
      }}>
        Powered by TrueGeoMap · ArcGIS 3D Platform
      </div>
    </div>
  );
};

export default WelcomeSplash;

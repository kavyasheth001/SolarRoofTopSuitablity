import React, { useState, useEffect } from 'react';

/**
 * Welcome Splash Overlay for the Map Page
 * Shows an animated intro when someone first arrives at /map
 * Auto-dismisses after 5 seconds or on click
 */
const WelcomeSplash = ({ onDismiss }) => {
  const [phase, setPhase] = useState('entering'); // entering → visible → exiting → gone
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    // Phase timing
    const t1 = setTimeout(() => setPhase('visible'), 100);
    const t2 = setTimeout(() => setStatsVisible(true), 800);
    const t3 = setTimeout(() => handleDismiss(), 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  const handleDismiss = () => {
    if (phase === 'exiting' || phase === 'gone') return;
    setPhase('exiting');
    setTimeout(() => {
      setPhase('gone');
      if (onDismiss) onDismiss();
    }, 600);
  };

  if (phase === 'gone') return null;

  const stats = [
    { icon: '🏢', value: '12,500+', label: 'Buildings Mapped' },
    { icon: '⚡', value: '3.2 GWh', label: 'Solar Potential' },
    { icon: '🌍', value: '2,600 t', label: 'CO₂ Saveable/yr' },
    { icon: '📊', value: 'Real-time', label: '3D Analysis' },
  ];

  return (
    <div
      onClick={handleDismiss}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at center, rgba(10,22,40,0.95) 0%, rgba(5,13,26,0.98) 100%)',
        backdropFilter: 'blur(20px)',
        cursor: 'pointer',
        opacity: phase === 'entering' ? 0 : phase === 'exiting' ? 0 : 1,
        transition: 'opacity 0.6s ease-in-out',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}
    >
      {/* Animated sun rays */}
      <div style={{
        position: 'absolute',
        width: 400, height: 400,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, transparent 70%)',
        animation: 'sunPulse 3s ease-in-out infinite',
      }} />

      {/* Logo / Title */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        transform: phase === 'visible' || phase === 'exiting' ? 'translateY(0)' : 'translateY(30px)',
        opacity: phase === 'visible' ? 1 : phase === 'exiting' ? 0 : 0,
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        <div style={{ fontSize: 64, marginBottom: 16, filter: 'drop-shadow(0 0 20px rgba(251,191,36,0.5))' }}>
          ☀️
        </div>
        <h1 style={{
          fontSize: 42,
          fontWeight: 900,
          background: 'linear-gradient(135deg, #fbbf24, #f59e0b, #f97316)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          margin: 0,
          letterSpacing: '-1px',
          lineHeight: 1.1,
        }}>
          SolarSight
        </h1>
        <p style={{
          fontSize: 16,
          color: '#94a3b8',
          marginTop: 8,
          fontWeight: 400,
          letterSpacing: '0.05em',
        }}>
          AI-Powered Rooftop Solar Suitability Analysis
        </p>
        <p style={{
          fontSize: 13,
          color: '#64748b',
          marginTop: 4,
        }}>
          Mumbai Metropolitan Region · 3D Shadow Simulation
        </p>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex',
        gap: 24,
        marginTop: 48,
        opacity: statsVisible ? 1 : 0,
        transform: statsVisible ? 'translateY(0)' : 'translateY(20px)',
        transition: 'all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.2s',
      }}>
        {stats.map((stat, i) => (
          <div key={i} style={{
            textAlign: 'center',
            padding: '16px 20px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(10px)',
            minWidth: 110,
            animation: `fadeUp 0.6s ease-out ${0.3 + i * 0.12}s both`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{stat.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fbbf24', letterSpacing: '-0.5px' }}>
              {stat.value}
            </div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 40,
        opacity: statsVisible ? 1 : 0,
        transform: statsVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: 'all 0.6s ease 0.8s',
      }}>
        <div style={{
          padding: '12px 36px',
          borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.1))',
          border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24',
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: '0.05em',
          animation: 'gentlePulse 2s ease-in-out infinite',
        }}>
          Click anywhere to start exploring →
        </div>
      </div>

      {/* Bottom branding */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        fontSize: 11,
        color: '#334155',
        letterSpacing: '0.08em',
      }}>
        POWERED BY TRUEGEOMAP · ArcGIS 3D PLATFORM
      </div>

      <style>{`
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes gentlePulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeSplash;

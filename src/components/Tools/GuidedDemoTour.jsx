import React, { useEffect, useState, useRef } from 'react';

const TOUR_STOPS = [
  {
    title: "Welcome to SolarSight Mumbai",
    text: "We are analyzing the entire Mumbai Metropolitan Region using highly detailed 3D building models.",
    camera: { center: [72.847187, 18.999758], zoom: 12.5, tilt: 65, heading: 0 },
    duration: 5000
  },
  {
    title: "High-Density Residential Areas",
    text: "Notice how closely packed buildings create complex shadow patterns. Our AI handles this automatically.",
    camera: { center: [72.833, 19.015], zoom: 16, tilt: 70, heading: 45 },
    duration: 6000
  },
  {
    title: "Commercial Hubs",
    text: "Flat, large rooftops on commercial buildings offer massive solar potential for businesses.",
    camera: { center: [72.827, 18.932], zoom: 16.5, tilt: 60, heading: 120 },
    duration: 6000
  },
  {
    title: "Real-Time Analysis",
    text: "Click any building or run the Area Heatmap to instantly discover its solar generation capacity.",
    camera: { center: [72.877, 19.076], zoom: 14, tilt: 55, heading: 10 },
    duration: 5000
  }
];

const GuidedDemoTour = ({ view, onClose }) => {
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const isPlayingRef = useRef(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    if (!view) return;
    
    let isCancelled = false;
    
    const playTour = async () => {
      for (let i = currentStopIndex; i < TOUR_STOPS.length; i++) {
        if (isCancelled || !isPlayingRef.current) break;
        
        setCurrentStopIndex(i);
        const stop = TOUR_STOPS[i];
        
        try {
          await view.goTo(stop.camera, { duration: 3000, easing: "in-out-cubic" });
          
          // Wait for the duration of the stop
          await new Promise(resolve => {
            let elapsed = 0;
            const interval = setInterval(() => {
              if (isCancelled || !isPlayingRef.current) {
                clearInterval(interval);
                resolve();
              }
              elapsed += 100;
              if (elapsed >= stop.duration) {
                clearInterval(interval);
                resolve();
              }
            }, 100);
          });
        } catch (e) {
          console.warn("Tour goTo interrupted");
        }
      }
      
      if (!isCancelled && isPlayingRef.current) {
        // Loop back to start
        setCurrentStopIndex(0);
      }
    };
    
    if (isPlaying) {
      playTour();
    }
    
    return () => {
      isCancelled = true;
    };
  }, [view, currentStopIndex, isPlaying]);

  const stop = TOUR_STOPS[currentStopIndex];

  return (
    <div style={{
      position: 'absolute',
      bottom: 40,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 400,
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(12px)',
      borderRadius: 16,
      border: '1px solid rgba(255,255,255,0.1)',
      color: 'white',
      padding: '20px 24px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      zIndex: 1000,
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      animation: 'slideUpFade 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
    }}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {TOUR_STOPS.map((_, i) => (
          <div key={i} style={{
            width: i === currentStopIndex ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i === currentStopIndex ? '#fbbf24' : 'rgba(255,255,255,0.2)',
            transition: 'all 0.3s ease'
          }} />
        ))}
      </div>

      <h2 style={{ margin: '0 0 8px 0', fontSize: 20, fontWeight: 800, color: '#fbbf24' }}>
        {stop.title}
      </h2>
      <p style={{ margin: 0, fontSize: 14, color: '#e2e8f0', lineHeight: 1.5, marginBottom: 20 }}>
        {stop.text}
      </p>

      <div style={{ display: 'flex', gap: 12, width: '100%' }}>
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: isPlaying ? 'rgba(255,255,255,0.1)' : '#2563eb',
            color: 'white', fontWeight: 600, transition: 'background 0.2s'
          }}
        >
          {isPlaying ? '⏸️ Pause Tour' : '▶️ Resume Tour'}
        </button>
        <button 
          onClick={onClose}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer', background: 'transparent', color: 'white', fontWeight: 600,
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
          onMouseOut={(e) => e.target.style.background = 'transparent'}
        >
          ⏹️ End Tour
        </button>
      </div>

      <style>{`
        @keyframes slideUpFade {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default GuidedDemoTour;

const fs = require('fs');
let content = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

// 1. Add isPlayingShadow state
content = content.replace(
  'const [timeSliderHour, setTimeSliderHour] = useState(12);',
  'const [timeSliderHour, setTimeSliderHour] = useState(12);\n  const [isPlayingShadow, setIsPlayingShadow] = useState(false);'
);

// 2. Add useEffect for animation
const updateTimeSliderMethod = `  const updateTimeSlider = (hour) => {
    setTimeSliderHour(hour);
    const now = new Date();
    now.setHours(Math.floor(hour), (hour % 1) * 60, 0, 0);
    view.environment.lighting.date = now;
  };`;

const useEffectCode = `

  // Auto-play shadow analysis slider
  useEffect(() => {
    let interval;
    if (isPlayingShadow) {
      interval = setInterval(() => {
        setTimeSliderHour(prev => {
          let next = prev + 0.25;
          if (next > 18) next = 6;
          
          const now = new Date();
          now.setHours(Math.floor(next), (next % 1) * 60, 0, 0);
          view.environment.lighting.date = now;
          
          return next;
        });
      }, 500); // 500ms per 15 minutes of shadow
    }
    return () => clearInterval(interval);
  }, [isPlayingShadow, view]);
`;

content = content.replace(updateTimeSliderMethod, updateTimeSliderMethod + useEffectCode);

// 3. Add play button in UI and fix the title encoding
const oldUI = `                    <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>6 AM</span>`;
const newUI = `                    <button
                      onClick={() => setIsPlayingShadow(p => !p)}
                      style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center' }}
                      title={isPlayingShadow ? 'Pause' : 'Play'}
                    >
                      {isPlayingShadow ? '\\u23F8' : '\\u25B6'}
                    </button>
                    <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>6 AM</span>`;
content = content.replace(oldUI, newUI);

content = content.replace('SHADOW VISUALISATION — TIME OF DAY', 'SHADOW VISUALISATION &#8212; TIME OF DAY');

// Also fix the SmartRecommendations mojibake characters if any are left
content = content.replace(/✅/g, '&#9989;');
content = content.replace(/⚡/g, '&#9889;');
content = content.replace(/⚠� /g, '&#9888;&#65039;');
content = content.replace(/🔴/g, '&#128308;');
content = content.replace(/🌳/g, '&#127795;');
content = content.replace(/�&deg;/g, '&#128176;'); // Note: 💰 became �&deg; due to ° replace
content = content.replace(/📊/g, '&#128202;');
content = content.replace(/🌤� /g, '&#127780;&#65039;');
content = content.replace(/🤖/g, '&#129302;');
content = content.replace(/CO₂/g, 'CO&#8322;');
content = content.replace(/—/g, '&#8212;');

fs.writeFileSync('src/components/Tools/SolarSuitabilityTool.jsx', content, 'utf8');
console.log('Fixed file');

const fs = require('fs');
let code = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

// Ensure FaPlay and FaPause are imported
if (!code.includes('FaPlay')) {
    code = code.replace(/import \{ FaCheckCircle/g, 'import { FaPlay, FaPause, FaCheckCircle');
}

// 1. Grid layout wrapper
const oldGridStart = `                {/* -- Shadow & Sunlight ----------------------------- */}`;
const newGridStart = `                {/* Results grid — responsive to panel width */}
                <div style={{
                  display: isWide ? 'grid' : 'block',
                  gridTemplateColumns: isExtraWide ? '1fr 1fr' : (isWide ? '1fr 1fr' : '1fr'),
                  gap: 16,
                }}>
                  <div>
                {/* -- Shadow & Sunlight ----------------------------- */}`;
code = code.replace(oldGridStart, newGridStart);

// 2. Slider redesign
const oldSlider = `                {/* -- Time Slider (Visual Analysis) ---------------- */}
                <div style={{ padding: '12px', background: '#1e293b', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: 8 }}>
                    SHADOW VISUALISATION — TIME OF DAY
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setIsPlayingShadow(p => !p)}
                      style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center' }}
                      title={isPlayingShadow ? 'Pause' : 'Play'}
                    >
                      {isPlayingShadow ? '\\u23F8' : '\\u25B6'}
                    </button>
                    <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>6 AM</span>
                    <input
                      type="range" min={6} max={18} step={0.25} value={timeSliderHour}
                      onChange={e => updateTimeSlider(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#f59e0b' }}
                    />
                    <span style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>6 PM</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#f1f5f9', marginTop: 4 }}>
                    {(() => {
                      const h = Math.floor(timeSliderHour);
                      const m = Math.round((timeSliderHour % 1) * 60);
                      const ampm = h < 12 ? 'AM' : 'PM';
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return \`\${h12}:\${m.toString().padStart(2, '0')} \${ampm}\`;
                    })()}
                    <span style={{ fontSize: 10, color: '#64748b', marginLeft: 8 }}>Drag to change time &amp; see live shadows on map</span>
                  </div>`;

const newSlider = `                {/* -- Time Slider (Visual Analysis) ---------------- */}
                <div style={{ padding: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.08em', marginBottom: 8 }}>
                    SHADOW VISUALISATION — TIME OF DAY
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      onClick={() => setIsPlayingShadow(p => !p)}
                      style={{
                        background: '#1e3a5f', border: 'none', color: '#ffffff',
                        cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', width: 28, height: 28, borderRadius: 6,
                      }}
                      title={isPlayingShadow ? 'Pause' : 'Play shadow animation'}
                    >
                      {isPlayingShadow ? <FaPause /> : <FaPlay />}
                    </button>
                    <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 600, whiteSpace: 'nowrap' }}>6 AM</span>
                    <input
                      type="range" min={6} max={18} step={0.25} value={timeSliderHour}
                      onChange={e => updateTimeSlider(Number(e.target.value))}
                      style={{ flex: 1, accentColor: '#1e3a5f' }}
                    />
                    <span style={{ fontSize: 11, color: '#1e3a5f', fontWeight: 600, whiteSpace: 'nowrap' }}>6 PM</span>
                  </div>
                  <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#1e3a5f', marginTop: 4 }}>
                    {(() => {
                      const h = Math.floor(timeSliderHour);
                      const m = Math.round((timeSliderHour % 1) * 60);
                      const ampm = h < 12 ? 'AM' : 'PM';
                      const h12 = h % 12 === 0 ? 12 : h % 12;
                      return \`\${h12}:\${m.toString().padStart(2, '0')} \${ampm}\`;
                    })()}
                    <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 8 }}>Drag to change time &amp; see live shadows on map</span>
                  </div>`;
                  
code = code.replace(oldSlider, newSlider);

// 3. Grid structure continuing
const oldRooftopStart = `                {/* -- Rooftop & Panels ---------------------------- */}
                <div>`;
const newRooftopStart = `                </div>
                <div>
                {/* -- Rooftop & Panels ---------------------------- */}
                <div>`;
code = code.replace(oldRooftopStart, newRooftopStart);

const oldFinancialStart = `                {/* -- Financial & Environmental ------------------- */}
                <div>`;
const newFinancialStart = `                </div>
                <div style={{ gridColumn: isExtraWide ? 'span 2' : 'span 1' }}>
                {/* -- Financial & Environmental ------------------- */}
                <div>`;
code = code.replace(oldFinancialStart, newFinancialStart);

const oldFinancialEnd = `                  </InfoAccordion>
                </div>
              </div>

              {/* Action Buttons */}`;
const newFinancialEnd = `                  </InfoAccordion>
                </div>
                </div>
              </div>

              {/* Action Buttons */}`;
code = code.replace(oldFinancialEnd, newFinancialEnd);

fs.writeFileSync('src/components/Tools/SolarSuitabilityTool.jsx', code);

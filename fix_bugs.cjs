const fs = require('fs');
let content = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

// 1. Fix getBarColor missing brace
content = content.replace(
  /const getBarColor = \(pct\) => \{\s*if \(pct >= 70\) return '#22c55e';\s*if \(pct >= 40\) return '#f59e0b';\s*if \(pct > 0\) return '#f97316';\s*return '#374151';\s*return \(/g,
  `const getBarColor = (pct) => {
    if (pct >= 70) return '#22c55e';
    if (pct >= 40) return '#f59e0b';
    if (pct > 0) return '#f97316';
    return '#374151';
  };

  return (`
);

// 2. Fix Mojibake
content = content.replace(/→/g, '&#8594;');
content = content.replace(/📊/g, '&#128202;');
content = content.replace(/°/g, '&deg;');
content = content.replace(/₹/g, '&#8377;');
content = content.replace(/CO₂/g, 'CO&#8322;');
content = content.replace(/—/g, '&#8212;');
content = content.replace(/✅/g, '&#9989;');
content = content.replace(/⚡/g, '&#9889;');
content = content.replace(/⚠� /g, '&#9888;&#65039;');
content = content.replace(/🔴/g, '&#128308;');
content = content.replace(/🌳/g, '&#127795;');
content = content.replace(/💰/g, '&#128176;');
content = content.replace(/≥/g, '&ge;');
content = content.replace(/�7\/unit/g, '&#8377;7/unit');
content = content.replace(/�60,000\/kWp/g, '&#8377;60,000/kWp');
content = content.replace(/×/g, '&times;');
content = content.replace(/÷/g, '&divide;');

// Also fix standard unicode symbols like arrows and triangles
content = content.replace(/'&#9650;'/g, "'\\u25B2'");
content = content.replace(/'&#9660;'/g, "'\\u25BC'");

// 3. Fix onClick={startDrawingPolygon} to onClick={() => startDrawingPolygon('sim')}
content = content.replace(/onClick=\{startDrawingPolygon\}/g, "onClick={() => startDrawingPolygon('sim')}");

// 4. Update Methodology Text to match code
content = content.replace(/A building with &ge;100 m(²|&sup2;) scores 100/, 'A building with &ge;500 m&sup2; scores 100');
content = content.replace(/height \/ 30 &times; 100/, 'height / 50 &times; 100');
content = content.replace(/A building &ge;30 m scores 100/, 'A building &ge;50 m scores 100');

fs.writeFileSync('src/components/Tools/SolarSuitabilityTool.jsx', content, 'utf8');
console.log('Fixed file');

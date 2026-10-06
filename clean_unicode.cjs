const fs = require('fs');
let code = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

const replacements = [
  ['\u00E2\u2020\u2019', '\u2192'], // â†’ -> ?
  ['\u00F0\u0178\u201C\u0160', '\uD83D\uDCCA'], // ðŸ“Š -> ??
  ['\u00E2\u2030\u00A5', '\u2265'], // â‰¥ -> =
  ['\u00E2\u20AC\u201D', '\u2014'], // â€” -> —
  ['\u00E2\u201A\u201A', '\u2082'], // â‚‚ -> 2
  ['\u00E2\u201A\u00B9', '\u20B9'], // â‚¹ -> ?
  ['\u00C2\u00B2', '\u00B2'], // Â² -> ²
  ['\u00C2\u00B7', '\u00B7'], // Â· -> ·
  ['\u00E2\u0161\u00A1', '\u26A1'], // âš¡ -> ?
  ['\u00E2\u20AC\u201C', '\u2013'], // â€“ -> –
  ['\u00C3\u00B7', '\u00F7'], // Ã· -> ÷
  ['\u00E2\u2020\u0090', '\u2190'], // â†  -> ?
  ['\u00C2&deg;', '\u00B0'], // Â&deg; -> °
  ['\u00C3\u2014', '\u00D7'], // Ã— -> × (maybe \u00C3\u2014 is Ã—)
  ['\u00C3\u0097', '\u00D7'], // Ã— if it's C3 97
  ['\u00C3\u0083', ''], // stray Ã ?
  ['\u00C3&#8212;', '\u00D7'] // Ã&#8212; -> ×
];

replacements.forEach(([bad, good]) => {
  code = code.split(bad).join(good);
});

// Also replace any standalone \u00C3 if it still looks like Ã— (since sometimes it might be just \u00C3 followed by empty or something)
// We know in context it's "height / 30 Ã— 100" or "Capacity Ã— 1,500"
code = code.replace(/\u00C3\s*/g, '\u00D7 ');

fs.writeFileSync('src/components/Tools/SolarSuitabilityTool.jsx', code, 'utf8');
console.log('Mojibake replaced.');

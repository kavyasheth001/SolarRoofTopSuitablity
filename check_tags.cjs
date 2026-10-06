const fs = require('fs');
const content = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

const openTags = [...content.matchAll(/<([a-zA-Z0-9]+)(?![a-zA-Z0-9])[^>]*?(?<!\/)>/g)].map(m => m[1]);
const closeTags = [...content.matchAll(/<\/([a-zA-Z0-9]+)>/g)].map(m => m[1]);

const counts = {};
openTags.forEach(t => counts[t] = (counts[t] || 0) + 1);
closeTags.forEach(t => counts[t] = (counts[t] || 0) - 1);

console.log("Unbalanced tags:");
for (let tag in counts) {
  if (counts[tag] !== 0) console.log(`${tag}: ${counts[tag] > 0 ? '+' : ''}${counts[tag]}`);
}

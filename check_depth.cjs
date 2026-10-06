const fs = require('fs');
const code = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

let depth = 0;
let lines = code.split(/\r?\n/);

for(let i=0; i<lines.length; i++) {
    for(let j=0; j<lines[i].length; j++) {
        if(lines[i][j] === '{') depth++;
        if(lines[i][j] === '}') depth--;
    }
    // console.log(`Line ${i+1}: depth ${depth}`);
}
console.log(`Final depth: ${depth}`);

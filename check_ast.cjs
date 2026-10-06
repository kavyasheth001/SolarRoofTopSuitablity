const fs = require('fs');
const content = fs.readFileSync('src/components/Tools/SolarSuitabilityTool.jsx', 'utf8');

// A much better way is to use babel to parse the file and see where the AST fails
const { parse } = require('@babel/parser');
try {
  parse(content, { sourceType: 'module', plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator'] });
  console.log('Parse successful');
} catch (e) {
  console.log('Parse Error at line ' + e.loc.line + ' col ' + e.loc.column);
  console.log(e.message);
}

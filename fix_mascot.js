const fs = require('fs');
let css = fs.readFileSync('assets/jovi.css', 'utf8');
css += `\n/* Fix 28: Reserve safe zone for Mascot button */
.page, .app-body, .mtk-main, .eg-side, .mtk-palette, .dash-ncert-block, .marks-section {
  padding-bottom: 90px !important;
}\n`;
fs.writeFileSync('assets/jovi.css', css);
console.log('Fixed mascot overlap in jovi.css');

const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// Remove the 960px grid to keep it vertical (circle on top, login on bottom)
html = html.replace(/display: grid;\s*grid-template-columns: minmax\(0, 1\.15fr\) minmax\(340px, 440px\);/g, 'display: flex; flex-direction: column; align-items: center;');
html = html.replace(/border-left: 1px solid color-mix\(in srgb, var\(--line\) 75%, transparent\);/g, 'border-top: 1px solid var(--line); padding-top: 24px; margin-top: 16px;');

fs.writeFileSync('login.html', html);
console.log("Login layout changed to column");

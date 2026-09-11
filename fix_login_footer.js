const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// Hide qx-help-bar
html = html.replace('.qx-help-bar {', '.qx-help-bar { display: none !important;\n');

fs.writeFileSync('login.html', html);
console.log('Removed help bar links');

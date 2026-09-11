const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');
html = html.replace(/@media \(max-width: 860px\) \{/g, '@media (max-width: 900px) {');
fs.writeFileSync('app.html', html);
console.log('Fixed media query in app.html');

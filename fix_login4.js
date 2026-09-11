const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// Remove top links
html = html.replace(/<a href="\/jee"[^>]*>JEE PYQs<\/a>/gi, '');
html = html.replace(/<a href="\/neet"[^>]*>NEET PYQs<\/a>/gi, '');

// Remove footer links
html = html.replace(/<a href="\/search"[^>]*>Search questions<\/a>/gi, '');
html = html.replace(/<a href="\/app"[^>]*>Google Play App<\/a>/gi, '');

fs.writeFileSync('login.html', html);
fs.writeFileSync('index.html', html);
console.log('Removed links correctly');

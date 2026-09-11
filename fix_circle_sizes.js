const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// Update mobile media query sizes
html = html.replace('.stage { width: min(100%, 340px); }', '.stage { width: min(100%, 400px); }');
html = html.replace('.cat { width: 82px; height: 82px; margin: -41px 0 0 -41px; }', '.cat { width: 92px; height: 92px; margin: -46px 0 0 -46px; }');
html = html.replace('.cat-academic    { --tx: 0px;    --ty: -124px; }', '.cat-academic    { --tx: 0px;    --ty: -144px; }');
html = html.replace('.cat-engineering { --tx: 124px;  --ty: 0px; }', '.cat-engineering { --tx: 144px;  --ty: 0px; }');
html = html.replace('.cat-medical     { --tx: 0px;    --ty: 124px; }', '.cat-medical     { --tx: 0px;    --ty: 144px; }');
html = html.replace('.cat-defence     { --tx: -124px; --ty: 0px; }', '.cat-defence     { --tx: -144px; --ty: 0px; }');

// Make sure the central logo in stage-hub is 110px
html = html.replace(/<img src="assets\/quantrex-logo-192\.png" alt="Quantrex Academy" width="[0-9]+" height="[0-9]+"/g, '<img src="assets/quantrex-logo-192.png" alt="Quantrex Academy" width="110" height="110"');

fs.writeFileSync('login.html', html);
fs.writeFileSync('index.html', html);
console.log('Fixed circle sizes on mobile');

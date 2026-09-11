const fs = require('fs');

// 1. Update sw.js version
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const CACHE = "qx-pwa-v[0-9]+";/, 'const CACHE = "qx-pwa-v121";');
fs.writeFileSync('sw.js', sw);

// 2. Update version.json to trigger app update prompt
let ver = JSON.parse(fs.readFileSync('version.json', 'utf8'));
ver.build = "qxfix125";
ver.ts = Date.now();
fs.writeFileSync('version.json', JSON.stringify(ver, null, 2));

console.log('Updated sw.js and version.json');

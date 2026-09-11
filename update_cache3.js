const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace(/const CACHE = "qx-pwa-v[0-9]+";/, 'const CACHE = "qx-pwa-v127";');
fs.writeFileSync('sw.js', sw);

let ver = JSON.parse(fs.readFileSync('version.json', 'utf8'));
ver.build = "qxfix131";
ver.ts = Date.now();
fs.writeFileSync('version.json', JSON.stringify(ver, null, 2));

console.log('Bumped cache to v127');

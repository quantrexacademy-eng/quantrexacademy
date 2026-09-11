const fs = require('fs');
let htmlFiles = fs.readdirSync('.').filter(f => f.endsWith('.html'));
for (let f of htmlFiles) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('serviceWorker')) {
    console.log(f, "has serviceWorker code");
    let match = content.match(/navigator\.serviceWorker\.register[^\n]+/);
    if (match) console.log(match[0]);
  }
}
let jsFiles = fs.readdirSync('.').filter(f => f.endsWith('.js'));
for (let f of jsFiles) {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('serviceWorker.register')) {
    console.log(f, "has serviceWorker code");
  }
}

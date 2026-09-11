const fs = require('fs');

// 1. Fix login.html
let loginHtml = fs.readFileSync('login.html', 'utf8');
// Fix logo paths
loginHtml = loginHtml.replace(/assets\/images\/logo\.png/g, 'assets/quantrex-logo-192.png');
// Make sure help link is visible (unhide help bar if it's hidden)
loginHtml = loginHtml.replace('.qx-help-bar { display: none !important;\n', '');
fs.writeFileSync('login.html', loginHtml);
console.log('Fixed login.html logo and help link');

// 2. Hide Question History in app.html
let appHtml = fs.readFileSync('app.html', 'utf8');
// Inject CSS to hide history completely
if (!appHtml.includes('.qx-history { display: none !important; }')) {
  appHtml = appHtml.replace('</style>', '  .qx-history, .qx-an-history, #tabHistory { display: none !important; }\n</style>');
}
fs.writeFileSync('app.html', appHtml);

// 3. Since index.html is a copy of app.html, update it too
fs.writeFileSync('index.html', appHtml);

console.log('Fixed history in app/index');

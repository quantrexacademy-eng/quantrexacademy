const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// 1. Make mobile full window
html = html.replace('.qx-login-shell {', '.qx-login-shell {\n  border: none !important;\n  background: transparent !important;\n  border-radius: 0 !important;\n  box-shadow: none !important;\n  min-height: 100vh;\n  justify-content: center;\n');

// 2. Hide the "Academic A Engineering A Medical A Defence" dummy text
html = html.replace('<div class="hint">Academic &middot; Engineering &middot; Medical &middot; Defence</div>', '');

// 3. Remove the update banner from login page if it exists (it's injected via JS, but we can hide it via CSS)
if (!html.includes('.qx-build-pill')) {
  html = html.replace('</style>', '  .qx-build-pill, #updateBanner, .pwa-update-toast { display: none !important; }\n</style>');
}

fs.writeFileSync('login.html', html);
console.log('Login page modified to full window & dummy text removed.');

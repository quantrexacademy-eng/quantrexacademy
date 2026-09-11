const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// 1. Fix .hero so it's not flex: 1, and add a gap to qx-login-shell
html = html.replace('.hero { width: 100%; text-align: center; flex: 1; min-height: 0; display: flex; flex-direction: column; align-items: center; }', '.hero { width: 100%; text-align: center; flex: none; display: flex; flex-direction: column; align-items: center; }');

// We already have .qx-login-shell { display: flex; flex-direction: column; justify-content: center; ... }
// Let's add gap: 40px to .qx-login-shell
if (!html.includes('gap: 40px; /* added gap */')) {
  html = html.replace('.qx-login-shell {', '.qx-login-shell {\n    gap: 40px; /* added gap */\n');
}

// 2. Increase circle size
// Original: .stage { position: relative; width: 320px; max-width: 100%; aspect-ratio: 1; margin: 32px auto 0; }
html = html.replace('width: 320px;', 'width: min(380px, 100vw - 32px);');
// Make the central logo slightly bigger (88px -> 110px)
html = html.replace(/<img src="assets\/quantrex-logo-192\.png"([^>]+)width="88" height="88"/g, '<img src="assets/quantrex-logo-192.png"$1width="110" height="110"');

// 3. Remove "Google Play App" from footer
html = html.replace(/<a[^>]*>Google Play App<\/a>/g, '');

// Also remove "Academic . Engineering . Medical . Defence" if it's still there
html = html.replace(/<p class="hint" id="stageHint"[^>]*>.*?<\/p>/, '');

fs.writeFileSync('login.html', html);
fs.writeFileSync('index.html', html);
console.log('Fixed layout and spacing');

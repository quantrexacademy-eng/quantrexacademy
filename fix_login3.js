const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

// Force column layout
html = html.replace(/display: grid;\s*grid-template-columns: minmax\(0, 1\.15fr\) minmax\(340px, 440px\);/g, 'display: flex; flex-direction: column; align-items: center; justify-content: center;');
html = html.replace(/border-left: 1px solid color-mix\(in srgb, var\(--line\) 75%, transparent\);/g, 'border-top: none; padding-top: 16px; margin-top: 16px;');

// Full window: remove border, shadow, background from qx-login-shell
html = html.replace('.qx-login-shell {', '.qx-login-shell {\n  border: none !important;\n  background: transparent !important;\n  border-radius: 0 !important;\n  box-shadow: none !important;\n  min-height: calc(100vh - 60px);\n  justify-content: center;\n');

// Remove top header links (JEE PYQs, NEET PYQs)
html = html.replace('<a class="header-link" href="jee-main-pyq.html">JEE PYQs</a>', '');
html = html.replace('<a class="header-link" href="iit-jee-mathematics.html">NEET PYQs</a>', '');

// Remove bottom footer dummy text and reorganize help
html = html.replace('<div class="qx-help-bar">', '<div class="qx-help-bar" style="display: flex; justify-content: center; gap: 16px; margin-top: 24px; font-size: 13px;">');
html = html.replace('<a href="jee-main-pyq.html">JEE PYQs</a>', '');
html = html.replace('<a href="jee-main-pyq-chapter.html">NEET PYQs</a>', '');
html = html.replace('<a href="search.html">Search questions</a>', '');
html = html.replace('<a href="app.html">Google Play App</a>', '');
html = html.replace('<div class="hint">Academic &middot; Engineering &middot; Medical &middot; Defence</div>', '');

fs.writeFileSync('login.html', html);
fs.writeFileSync('index.html', html);
console.log('Fixed login layout and removed links');

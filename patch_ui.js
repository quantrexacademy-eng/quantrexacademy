const fs = require('fs');
let code = fs.readFileSync('index.html', 'utf8');

// Reduce gap in qx-login-shell
code = code.replace(/gap: 40px;\s*\/\* added gap \*\//, 'gap: 15px;');

// Increase circle (stage) size
code = code.replace(/\.stage\s*\{\s*position:\s*relative;\s*width:\s*min\(100%,\s*400px\);/g, '.stage {\n  position: relative;\n  width: min(100%, 480px);');

// At media 960px, it has width: min(100%, 400px) as well
code = code.replace(/\.stage\s*\{\s*width:\s*min\(100%,\s*400px\);\s*\}/g, '.stage { width: min(100%, 480px); }');

fs.writeFileSync('index.html', code);

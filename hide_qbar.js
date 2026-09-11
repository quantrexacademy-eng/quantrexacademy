const fs = require('fs');
let css = fs.readFileSync('assets/examgoal-test-ui.css', 'utf8');

// Replace the previous rule with hiding eg-qbar completely on mobile
css = css.replace('.eg-test-root:not(.eg-side-collapsed) .eg-qbar { display: none !important; }', '.eg-test-root .eg-qbar { display: none !important; }');
fs.writeFileSync('assets/examgoal-test-ui.css', css);
console.log('Hidden eg-qbar completely on mobile');

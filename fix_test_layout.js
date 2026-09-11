const fs = require('fs');
let css = fs.readFileSync('assets/examgoal-test-ui.css', 'utf8');

// Ensure eg-test-root is a flex column so children don't overlap
if (!css.includes('flex-direction: column !important;')) {
  css = css.replace(/body\.marks-test-active \.eg-test-root\s*\{/, 'body.marks-test-active .eg-test-root {\n    display: flex !important;\n    flex-direction: column !important;\n');
}

fs.writeFileSync('assets/examgoal-test-ui.css', css);
console.log('Fixed test root layout');

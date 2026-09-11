const fs = require('fs');
let css = fs.readFileSync('assets/examgoal-test-ui.css', 'utf8');

css = css.replace('.eg-test-root.eg-side-collapsed .eg-qbar,\n.eg-test-root .eg-qbar {\n  display: flex !important;\n  visibility: visible !important;\n  opacity: 1 !important;\n}', '');

fs.writeFileSync('assets/examgoal-test-ui.css', css);
console.log('Cleaned up eg-qbar override');

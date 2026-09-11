const fs = require('fs');
let css = fs.readFileSync('assets/examgoal-test-ui.css', 'utf8');

if (!css.includes('.eg-test-root:not(.eg-side-collapsed) .eg-qbar { display: none !important; }')) {
  css += '\n@media (max-width: 900px) {\n  .eg-test-root:not(.eg-side-collapsed) .eg-qbar { display: none !important; }\n}\n';
  fs.writeFileSync('assets/examgoal-test-ui.css', css);
  console.log('Fixed double render in examgoal-test-ui.css');
}

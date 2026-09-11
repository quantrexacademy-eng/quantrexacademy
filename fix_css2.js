const fs = require('fs');
let css = fs.readFileSync('assets/examgoal-test-ui.css', 'utf8');
css = css.replace('.eg-test-root .eg-qbar { display: none !important; }', '/* removed */');
fs.writeFileSync('assets/examgoal-test-ui.css', css);
console.log('Fixed examgoal-test-ui.css');

const fs = require('fs');
let css = fs.readFileSync('assets/examgoal-test-ui.css', 'utf8');

css = css.replace(/flex-wrap: wrap !important;/g, 'flex-wrap: nowrap !important;');
fs.writeFileSync('assets/examgoal-test-ui.css', css);
console.log('Fixed eg-qbar wrapping');

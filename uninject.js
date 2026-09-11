const fs = require('fs');
function uninject(file) {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('<link rel="stylesheet" href="assets/qx-examgoal-clone.css">')) {
      html = html.replace('  <link rel="stylesheet" href="assets/qx-examgoal-clone.css">\n', '');
      fs.writeFileSync(file, html);
      console.log('Uninjected clone from ' + file);
    }
  }
}
uninject('app.html');
uninject('test.html');
uninject('examgoal-test-series.html');

const fs = require('fs');
const files = ['app.html', 'test.html', 'examgoal-test-series.html', 'index.html', 'login.html'];
files.forEach(f => {
  if(fs.existsSync(f)) {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    content = content.replace(/assets\/images\/logo\.png/g, 'assets/quantrex-logo-192.png');
    // Also fix the spinner if there's any broken one
    if(original !== content) {
      fs.writeFileSync(f, content);
      console.log('Fixed logo in ' + f);
    }
  }
});

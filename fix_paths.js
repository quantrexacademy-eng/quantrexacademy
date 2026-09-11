const fs = require('fs');
['app.js', 'test-engine.js', 'solution-format.js', 'marks-features.js'].forEach(f => {
  if (fs.existsSync(f)) {
    let html = fs.readFileSync(f, 'utf8');
    let original = html;
    html = html.replace(/src="assets\/quantrex-logo/g, 'src="/assets/quantrex-logo');
    html = html.replace(/src='assets\/quantrex-logo/g, 'src=\'/assets/quantrex-logo');
    if (html !== original) {
      fs.writeFileSync(f, html);
      console.log('Fixed relative logo path in ' + f);
    }
  }
});

const fs = require('fs');
function inject(file) {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('qx-ultra-unique.css')) {
      html = html.replace('</head>', '  <link rel="stylesheet" href="assets/qx-ultra-unique.css">\n</head>');
      fs.writeFileSync(file, html);
      console.log('Injected into ' + file);
    }
  }
}
inject('app.html');
inject('test.html');
inject('examgoal-test-series.html');

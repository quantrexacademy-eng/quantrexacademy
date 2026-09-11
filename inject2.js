const fs = require('fs');
function inject(file) {
  if (fs.existsSync(file)) {
    let html = fs.readFileSync(file, 'utf8');
    if (!html.includes('qx-examgoal-clone.css')) {
      html = html.replace('</head>', '  <link rel="stylesheet" href="assets/qx-examgoal-clone.css">\n</head>');
      fs.writeFileSync(file, html);
      console.log('Injected clone into ' + file);
    }
  }
}
inject('app.html');
inject('test.html');
inject('examgoal-test-series.html');

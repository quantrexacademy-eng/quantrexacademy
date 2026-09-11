const fs = require('fs');
['test.html', 'examgoal-test-series.html'].forEach(f => {
  if (fs.existsSync(f)) {
    let html = fs.readFileSync(f, 'utf8');
    if (!html.includes('qx-proofread.js')) {
      // Find where we inject scripts
      html = html.replace('<script src="question-format.js', '<script src="qx-proofread.js?v=qxfix67"></script>\n    <script src="question-format.js');
      fs.writeFileSync(f, html);
      console.log('Added qx-proofread.js to ' + f);
    }
  }
});

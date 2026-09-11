const fs = require('fs');
let code = fs.readFileSync('question-format.js', 'utf8');

code = code.replace(
  /expanded = QxProof\.proofreadHtml\(expanded\);/,
  'try { expanded = QxProof.proofreadHtml(expanded); } catch(e) { console.error("Proofread failed", e); }'
);

fs.writeFileSync('question-format.js', code);
console.log('Added try-catch to question-format.js');

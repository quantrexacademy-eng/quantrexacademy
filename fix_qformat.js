const fs = require('fs');
let js = fs.readFileSync('question-format.js', 'utf8');

// Remove text from numerical entry
js = js.replace(/<div class="qx-num-badge">.*?<\/div>/g, '');
js = js.replace(/<label class="qx-num-label".*?<\/label>/g, '');
js = js.replace(/<p class="qx-num-hint">.*?<\/p>/g, '');

// Fix getType to respect singleCorrect
js = js.replace('const fromField = normalizeType(q.questionType || q.type);\n      if (fromField === "multipleCorrect") return "multipleCorrect";\n      if (fromField === "columnMatch") {', 'const fromField = normalizeType(q.questionType || q.type);\n      if (fromField === "singleCorrect") return "singleCorrect";\n      if (fromField === "multipleCorrect") return "multipleCorrect";\n      if (fromField === "columnMatch") {');

fs.writeFileSync('question-format.js', js);
console.log('Fixed question-format.js');

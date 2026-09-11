const fs = require('fs');
let text = fs.readFileSync('test-engine.js', 'utf8');

// The elements we want to remove:
// <div class="qx-num-badge" ...>INTEGER / NUMERICAL</div>
// <label class="qx-num-label" ...>Enter integer answer</label>
// <p class="qx-num-hint" ...>Type the number or use the keypad below</p>

text = text.replace(/<div class="qx-num-badge"[^>]*>.*?<\/div>\s*/g, '');
text = text.replace(/<label class="qx-num-label"[^>]*>.*?<\/label>\s*/g, '');
text = text.replace(/<p class="qx-num-hint"[^>]*>.*?<\/p>\s*/g, '');

fs.writeFileSync('test-engine.js', text);
console.log('Fixed test-engine.js');

const fs = require('fs');
let code = fs.readFileSync('test.html', 'utf8');
let swMatch = code.match(/navigator\.serviceWorker[\s\S]{0,300}/);
console.log(swMatch ? swMatch[0] : "No SW found");

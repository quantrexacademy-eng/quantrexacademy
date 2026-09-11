const fs = require('fs');
let code = fs.readFileSync('qx-owned-figures.js', 'utf8');

// Replace the previous injection
code = code.replace(
  /\/\/ FORCE LOCAL FOR KNOWN DIAGRAMS[\s\S]*?const irodovDisp = irodovStorageUrl\(raw\);/,
  `// FORCE LOCAL FOR ALL KNOWN DIAGRAMS (with or without extension)
    const baseMatch = raw.match(/(qx-(?:book|org|self|irodov)-[a-f0-9]+)(?:\\.(png|webp|jpe?g|gif))?/i);
    if (baseMatch) {
      const ext = baseMatch[2] ? baseMatch[2].toLowerCase() : "png";
      return "/assets/diagrams/" + baseMatch[1] + "." + ext;
    }
    const irodovDisp = irodovStorageUrl(raw);`
);

fs.writeFileSync('qx-owned-figures.js', code);
console.log('Improved fast-path regex');

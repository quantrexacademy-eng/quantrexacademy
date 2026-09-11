const fs = require('fs');
let code = fs.readFileSync('qx-owned-figures.js', 'utf8');

// Insert the Firebase fast-path
const injection = `
    const baseMatch = raw.match(/(qx-(?:book|org|self|irodov)-[a-f0-9]+)(?:\\.(png|webp|jpe?g|gif))?/i);
    if (baseMatch) {
      const ext = baseMatch[2] ? baseMatch[2].toLowerCase() : "png";
      const name = baseMatch[1] + "." + ext;
      return storageUrlForPath("questions/figs/diagrams/" + name) + "&v=stem2";
    }
`;

code = code.replace(
  /const irodovDisp = irodovStorageUrl\(raw\);/,
  injection.trim() + '\n    const irodovDisp = irodovStorageUrl(raw);'
);

fs.writeFileSync('qx-owned-figures.js', code);
console.log('Injected Firebase fast-path');

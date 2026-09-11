const fs = require('fs');
let code = fs.readFileSync('qx-owned-figures.js', 'utf8');

const injection = `
    // FORCE LOCAL FOR KNOWN DIAGRAMS
    const baseMatch = raw.match(/(qx-(?:book|org|self|irodov)-[a-f0-9]+)\.(png|webp|jpe?g|gif)/i);
    if (baseMatch) {
      return "/assets/diagrams/" + baseMatch[1] + "." + baseMatch[2].toLowerCase();
    }
`;

code = code.replace(
  /const irodovDisp = irodovStorageUrl\(raw\);/,
  injection.trim() + '\n    const irodovDisp = irodovStorageUrl(raw);'
);

fs.writeFileSync('qx-owned-figures.js', code);
console.log('Injected local diagram fast-path');

const fs = require('fs');
let code = fs.readFileSync('qx-owned-figures.js', 'utf8');

// Update irodovStorageUrl to point to local assets instead of remote storage
code = code.replace(
  /function iroUrl\(name\)\s*\{\s*return storageUrlForPath\("questions\/figs\/irodov\/" \+ name\) \+ "&v=stem2";\s*\}/,
  'function iroUrl(name) {\n      return "/assets/diagrams/" + name;\n    }'
);

// Disable localDiagramRemote from rewriting local files to remote
code = code.replace(
  /function localDiagramRemote\(raw\)\s*\{[\s\S]*?\n  \}/,
  'function localDiagramRemote(raw) {\n    return "";\n  }'
);

fs.writeFileSync('qx-owned-figures.js', code);
console.log('Fixed qx-owned-figures.js to use local diagrams');

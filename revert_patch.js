const fs = require('fs');
let code = fs.readFileSync('qx-owned-figures.js', 'utf8');

code = code.replace(
  /\/\/ FORCE LOCAL FOR ALL KNOWN DIAGRAMS \(with or without extension\)[\s\S]*?return "\/assets\/diagrams\/" \+ baseMatch\[1\] \+ "\." \+ ext;\n    }\n/,
  ''
);

code = code.replace(
  /function iroUrl\(name\)\s*\{\s*return "\/assets\/diagrams\/" \+ name;\s*\}/,
  'function iroUrl(name) {\n      return storageUrlForPath("questions/figs/irodov/" + name) + "&v=stem2";\n    }'
);

code = code.replace(
  /function localDiagramRemote\(raw\)\s*\{\s*return "";\s*\}/,
  'function localDiagramRemote(raw) {\n      const base = String(raw || "").split("?")[0].split("/").pop();\n      if (!/^qx-(?:self|book|org)-[a-f0-9]+\\.(?:png|webp|jpe?g)$/i.test(base)) return "";\n      if (/^qx-org-/i.test(base)) return storageUrlForPath("questions/figs/org/" + base);\n      const hit = LOCAL_FIG_MAP[base] || (typeof window !== "undefined" && window.QX_LOCAL_FIG_MAP && window.QX_LOCAL_FIG_MAP[base]);\n      if (hit) return String(hit);\n      return "";\n    }'
);

fs.writeFileSync('qx-owned-figures.js', code);
console.log('Reverted qx-owned-figures.js');

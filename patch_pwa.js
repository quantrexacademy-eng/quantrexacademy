const fs = require('fs');
let code = fs.readFileSync('pwa-register.js', 'utf8');

if (!code.includes('controllerchange')) {
  code = code.replace(
    /\}\)\.catch\(function \(\) \{\}\);/,
    `}).catch(function () {});\n    var reloading = false;\n    navigator.serviceWorker.addEventListener("controllerchange", function() {\n      if (reloading) return;\n      reloading = true;\n      window.location.reload();\n    });`
  );
  fs.writeFileSync('pwa-register.js', code);
  console.log('Added auto-reload on controllerchange');
} else {
  console.log('Already has controllerchange');
}

const fs = require('fs');

// 1. Fix handleSolImgErr in solution-format.js
let solHtml = fs.readFileSync('solution-format.js', 'utf8');
solHtml = solHtml.replace('img.style.display = "none";', 'img.classList.add("qx-img-hidden"); img.style.display = "none";');
fs.writeFileSync('solution-format.js', solHtml);

// 2. Add .qx-img-hidden to qx-cbt-contrast.css
let cbtCss = fs.readFileSync('assets/qx-cbt-contrast.css', 'utf8');
if (!cbtCss.includes('.qx-img-hidden')) {
  cbtCss += '\nimg.qx-img-hidden { display: none !important; }\n';
}
fs.writeFileSync('assets/qx-cbt-contrast.css', cbtCss);

// 3. Fix white text on white background in Light mode options
// The issue is `.mtk-opt.wrong .mtk-opt-text { color: #fff !important; }` inside Light Mode?
// Let's add explicit colors for light mode options
cbtCss += `
html[data-theme="light"] .mtk-test-root[data-test-theme="light"] .mtk-opt .mtk-opt-text { color: #0f172a !important; -webkit-text-fill-color: #0f172a !important; }
html[data-theme="light"] .mtk-test-root[data-test-theme="light"] .mtk-opt.wrong .mtk-opt-text,
html[data-theme="light"] .mtk-test-root[data-test-theme="light"] .mtk-opt.correct .mtk-opt-text { color: #fff !important; -webkit-text-fill-color: #fff !important; }
`;
fs.writeFileSync('assets/qx-cbt-contrast.css', cbtCss);

console.log('Fixed img error handling and option contrast');

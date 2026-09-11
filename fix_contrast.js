const fs = require('fs');
let html = fs.readFileSync('app.html', 'utf8');

const newCSS = `
        [data-theme="dark"] .qx-guest-banner {
          background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(14,165,233,0.15)) !important;
          border-color: rgba(16,185,129,0.3) !important;
        }
        [data-theme="dark"] .qx-guest-banner span,
        [data-theme="dark"] .qx-guest-banner strong {
          color: #f8fafc !important;
        }
        [data-theme="dark"] .qc-ex-sol, 
        [data-theme="dark"] .qc-ex-sol *,
        [data-theme="dark"] .qx-sol-card,
        [data-theme="dark"] .qx-sol-card *,
        [data-theme="dark"] .eg-sol,
        [data-theme="dark"] .eg-sol * {
          color: #f8fafc !important;
          -webkit-text-fill-color: #f8fafc !important;
        }
        [data-theme="dark"] .qc-ex-sol img,
        [data-theme="dark"] .qx-sol-card img,
        [data-theme="dark"] .eg-sol img {
          filter: brightness(0.9) contrast(1.1);
        }
`;

html = html.replace('</style>', newCSS + '\n</style>');
fs.writeFileSync('app.html', html);
console.log('Fixed contrast for banners and solutions');

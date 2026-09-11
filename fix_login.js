const fs = require('fs');
let html = fs.readFileSync('login.html', 'utf8');

const injection = `
/* --- ULTRA PREMIUM LOGIN --- */
body {
  background: radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
              radial-gradient(circle at 90% 80%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
              #0f172a !important;
  color: #f8fafc !important;
}
.login-card {
  background: rgba(15, 23, 42, 0.6) !important;
  backdrop-filter: blur(24px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: 0 24px 40px rgba(0, 0, 0, 0.5) !important;
  border-radius: 24px !important;
}
.auth-input {
  background: rgba(0, 0, 0, 0.2) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border-radius: 12px !important;
  transition: all 0.3s ease !important;
}
.auth-input:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.2) !important;
  background: rgba(0, 0, 0, 0.4) !important;
}
.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
  border: none !important;
  border-radius: 12px !important;
  box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4) !important;
  transition: all 0.3s ease !important;
  color: #fff !important;
}
.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(37, 99, 235, 0.6) !important;
}
.btn-outline {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  border-radius: 12px !important;
}
.btn-outline:hover {
  background: rgba(255, 255, 255, 0.1) !important;
}
.brand-mark {
  background: linear-gradient(135deg, #3b82f6, #10b981) !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-weight: 900 !important;
  font-size: 28px !important;
}
.auth-sub, .auth-switch, label, .privacy-notice {
  color: #94a3b8 !important;
}
`;

if (!html.includes('ULTRA PREMIUM LOGIN')) {
  html = html.replace('</style>', injection + '\n</style>');
  fs.writeFileSync('login.html', html);
  console.log('Login page upgraded');
} else {
  console.log('Already upgraded');
}

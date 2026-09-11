const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = path.join(__dirname, "assets", "banners");
fs.mkdirSync(outDir, { recursive: true });
const logoPath = path.join(__dirname, "assets", "quantrex-logo-3d-256.png");
const logoB64 = fs.readFileSync(logoPath).toString("base64");

function wideSvg(w, h) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111f"/>
      <stop offset="55%" stop-color="#0b1b3a"/>
      <stop offset="100%" stop-color="#123056"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#0b57d0"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <circle cx="${w * 0.9}" cy="${h * 0.15}" r="${h * 0.5}" fill="#38bdf8" opacity="0.08"/>
  <circle cx="${w * 0.06}" cy="${h * 0.92}" r="${h * 0.38}" fill="#0b57d0" opacity="0.18"/>
  <image href="data:image/png;base64,${logoB64}" x="${w * 0.035}" y="${h * 0.18}" width="${h * 0.64}" height="${h * 0.64}"/>
  <text x="${w * 0.22}" y="${h * 0.24}" fill="#7dd3fc" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.065)}" font-weight="800" letter-spacing="3">QUANTREX ACADEMY</text>
  <text x="${w * 0.22}" y="${h * 0.42}" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.13)}" font-weight="800">Coaching access</text>
  <text x="${w * 0.22}" y="${h * 0.56}" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.065)}" font-weight="600">Engineering  ·  Medical  ·  Test Series</text>
  <rect x="${w * 0.22}" y="${h * 0.66}" rx="${h * 0.045}" width="${w * 0.2}" height="${h * 0.2}" fill="url(#accent)"/>
  <text x="${w * 0.32}" y="${h * 0.795}" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.09)}" font-weight="800">₹10</text>
  <rect x="${w * 0.44}" y="${h * 0.68}" rx="${h * 0.04}" width="${w * 0.32}" height="${h * 0.16}" fill="#042f2e" stroke="#34d399" stroke-width="2"/>
  <text x="${w * 0.60}" y="${h * 0.785}" text-anchor="middle" fill="#6ee7b7" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(h * 0.055)}" font-weight="800">7 DAYS FULL ACCESS</text>
</svg>`;
}

function squareSvg(s) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111f"/>
      <stop offset="100%" stop-color="#123056"/>
    </linearGradient>
  </defs>
  <rect width="${s}" height="${s}" fill="url(#bg)"/>
  <image href="data:image/png;base64,${logoB64}" x="${s * 0.34}" y="${s * 0.08}" width="${s * 0.32}" height="${s * 0.32}"/>
  <text x="50%" y="${s * 0.48}" text-anchor="middle" fill="#7dd3fc" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(s * 0.035)}" font-weight="800" letter-spacing="4">QUANTREX ACADEMY</text>
  <text x="50%" y="${s * 0.57}" text-anchor="middle" fill="#ffffff" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(s * 0.06)}" font-weight="800">Coaching access</text>
  <text x="50%" y="${s * 0.64}" text-anchor="middle" fill="#cbd5e1" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(s * 0.032)}" font-weight="600">One free look per chapter</text>
  <text x="50%" y="${s * 0.80}" text-anchor="middle" fill="#7dd3fc" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(s * 0.11)}" font-weight="800">₹10</text>
  <text x="50%" y="${s * 0.89}" text-anchor="middle" fill="#6ee7b7" font-family="Segoe UI, Arial, sans-serif" font-size="${Math.round(s * 0.038)}" font-weight="800">7 DAYS FULL ACCESS</text>
</svg>`;
}

async function run() {
  const jobs = [
    ["qx-coaching-wide.png", wideSvg(1600, 600), 1600, 600],
    ["qx-coaching-strip.png", wideSvg(1600, 400), 1600, 400],
    ["qx-coaching-square.png", squareSvg(1080), 1080, 1080]
  ];
  for (const [name, svg, w, h] of jobs) {
    const dest = path.join(outDir, name);
    await sharp(Buffer.from(svg)).resize(w, h).png({ compressionLevel: 8 }).toFile(dest);
    console.log("wrote", dest);
  }
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});

# qxmd166 — Full proof: uniform colour + figure clarity + pro shell

Date: 2026-09-17 ~21:05 IST (Asia/Calcutta)  
Build: **qxmd166**  
Cache: `qx-pwa-qxmd166`  
Source: `/workspace/qx-full`  
**No Vercel. Firebase = DATABASE only — no question-bank math rewritten. No deploy by this agent.**

## Goals (from quantrex-proof-prompt)

1. Uniform Quantrex colour tokens + professional homepage/shell (dark+light).
2. Question text + images readable in dark and light (no crush filters).
3. Speed: palette/toolbar toggles stay CSS-instant.
4. Re-verify stem hide + solution format (no qxmd165 regression).
5. Toolbar wiring (Bookmark, Group, All Q, Full, Theme, Aa, Report, Palette).
6. Medical + Engineering share CSS — not Engineering-only.

## What changed

### A) Uniform Quantrex blue tokens
- Root cause: competing primaries — teal (`qx-premium-ui` `#0D9488`), violet (`qx-landing-premium` `#4338CA`), Google blue (`quantrex-brand` / gemini `#0b57d0`).
- Aligned to **Quantrex blue** `#0b57d0` / dark `#8ab4f8`:
  - `assets/qx-premium-ui.css`
  - `assets/qx-quantrex-branding.css` gradient
  - `assets/qx-landing-premium.css` (scoped so global `*` reset cannot break login)
  - `assets/qx-site-contrast.css` final-authority token block + shared button/card radii
  - Examgoal chrome `--eg-blue` / header → `#0b57d0` (Med + Eng share)
- Home polish: guest banner, board hero, greet bar, premium pill → blue family (kill multi-hue clash).

### B) Question text + images (dark + light)
- Removed crushing `filter: brightness(0.9) contrast(1.1)` on dark solution images in `app.html`.
- `qx-text-visible.css`: paper-white figure plates + `filter: none` for stem/options/sol images across Examgoal + Allen + practice (Med+Eng).
- Homepage orbit logos: white plates + Engineering badge → clearer `jee_main` asset (`index.html`).

### C) Speed
- Palette / All Q / Theme remain **class toggles** (`syncCycleBtn`) — CSS transition ≤0.14s; no full rebuild.
- No SW/page-blank regression intended; cache bumped so hard refresh picks `qxmd166`.

### D) Stem hide + solution format (no regression)
- Existing qxmd165 nuclear stem-hide CSS retained + reinforced in qxmd166 text-visible block.
- Browser CSS proof: mock `.eg-test-root.eg-sol-showing #egQArea` → `display:none`, `visibility:hidden`, `opacity:0`.
- Unit checks: **13 pass / 0 fail** (`scripts/qxmd166-unit-checks.js`).

### E) Toolbar
- Code review: all eight controls have DOM ids + onclick / wireTap / doc backup in `examgoal-test-ui.js` (Bookmark, Group, All Q, Full, Theme, Aa, Report, Palette).
- Palette Right/Top/Both pref + independent ✕ preserved from qxmd165.
- Live Practice click-through not exercised (needs bank session on hosting) — marked code-review PASS.

## Browser verification (local `http://127.0.0.1:8765`, CDP)

| Check | Result |
|-------|--------|
| `version.json` / build pill | **qxmd166** |
| Index light `--primary` | `#0b57d0` |
| App dark `--primary` / `--qx-primary` | `#8ab4f8` |
| Orbit logos naturalWidth > 0 | All 6 PASS |
| Stem-hide CSS on mock sol-showing | PASS |
| Index light/dark + mobile screenshots | Captured under `/tmp/qxmd166-proof/cdp-*.png` |
| Live Practice Check Answer / Medical paper | **Not run in browser** (local guest app; parent live smoke) |

## Pass / Fail table

| Area | Light | Dark | Notes |
|------|-------|------|-------|
| Speed | PASS | PASS | Palette/theme CSS-instant (code + short transitions). Live multi-route jank not timed. |
| Uniform colour / pro UI | PASS | PASS | Tokens unified to Quantrex blue; home greet/hero blue family. |
| Homepage | PASS | PASS | CDP screenshots; logos load; update toast shows qxmd166 title. |
| Question text | PASS* | PASS* | Contrast CSS + theme rules; *full Practice UI = code-review / parent smoke. |
| Question images | PASS* | PASS* | Crush filter removed; paper plates; *live figures = parent smoke. |
| Solution format | PASS | PASS | Unit 13/13; delimiter + stem-echo. |
| Stem hide after Check Answer | PASS | PASS | CSS nuclear + unit; mock DOM hide proven in browser. |
| Toolbar (each button) | PASS* | PASS* | Wiring present; *live tap = parent smoke. |
| Palette Right/Top/Both | PASS | PASS | Pref + syncCycleBtn retained (qxmd165). |
| Medical | PASS* | PASS* | Shared CSS paths (eg/allen/mtk); *track smoke = parent. |
| Engineering | PASS* | PASS* | Shared CSS; local app shell Engineering tab looks coherent. |
| Mobile | PASS | PASS | 390px index CDP shot; palette mobile rules unchanged. |

**Overall:** **PASS** for code + local browser token/logo/stem-hide proofs. Items marked PASS* are code-review / CSS-proven; parent should hard-refresh live and smoke Practice Check Answer + toolbar after USB → Firebase hosting.

## Unit checks

```bash
node scripts/qxmd166-unit-checks.js
# TOTAL: 13 pass / 0 fail
```

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd166-files-to-copy.txt`.

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Smoke after deploy

1. Hard refresh → Build **qxmd166** / SW `qx-pwa-qxmd166`.
2. Home light+dark: Quantrex blue accents; orbit logos visible.
3. PYQ Practice → Check/Show Answer: stem gone; solution math clean; figures not crushed.
4. Toolbar: Bookmark, Group, All Q, Full, Theme, Aa, Report, Palette (Both).
5. Medical + Engineering practice share look.
6. Mobile ~390px: palette/settings OK.

## Constraints preserved

Quantrex branding · English UI · free access · no Firebase math rewrite · no invented answers · **no Vercel** · **no deploy by executor**

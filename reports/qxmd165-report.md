# qxmd165 — Solution math fix + stem hide everywhere + palette Both + home polish

Date: 2026-09-17 ~20:45 IST (Asia/Calcutta)  
Build: **qxmd165**  
Cache: `qx-pwa-qxmd165`  
Source: `/workspace/qx-full`  
**No Vercel. Firebase = DATABASE only — no question-bank math rewritten.**

## Goals

1. Fix broken Solution LaTeX / raw TeX (delimiter damage, Quick Shortcut, KaTeX after reveal).
2. Stem must disappear whenever Solution is open — Practice, Test Series review body echo, Engineering **and** Medical (Examgoal + Allen + `app.js`).
3. Palette: **Right sidebar / Top bar / Both** (independent ✕; CSS-only toggle; mobile intact).
4. Dark + light: stem hide wins; solution math readable; homepage polished (not redesigned).
5. Version bump → **qxmd165**; USB copy list; **do not deploy**.

## Root cause (Solution raw TeX)

`repairSolutionProse` injected `$|…|$` around absolute-value pipes and **shattered** `\left|…\right|` into `\left$|…\right|$`. Screenshot pattern:

`\left| \sin xcos x \right| = \frac{1}{4} … $\dfrac{1}{2}$$ \\`

## What changed

### A) `solution-format.js` (P0)
- Stop pipe-`$` injection on `\left|` / `\right|`.
- New `repairSolutionDelimiters`: undo `\left$|`, balance `$…$` / trailing `$$ \\`, wrap bare TeX lines, Marks-export via `QxMathSanitize.repairMarksExportTex` when present.
- Hooked in `formatBody` after `repairSolutionProse`.
- `formatShortcutLine`: multi-line safe + delimiter repair + MathTextRenderer/Mx.
- Stem-echo: implication / `\Rightarrow` blocks **never** stripped as def-echoes (fixes empty result after lone `$x^2=4$`).

### B) Stem hide when Solution open (P0, sitewide)
- `examgoal-test-ui.js`: `revealPracticeSolution` clears `#egQArea.innerHTML` + nuclear hide; `Mx.afterRender` on `#egSol`.
- Render path already empties stem markup when `showSol` (node kept).
- `app.js`: `qxHidePracticeStem` on `qxRevealSolution` + Check Answer (`answerQ`) — Allen/legacy practice (Engineering + Medical).
- `allen-test-ui.js`: `solOpen` → empty `#egQArea` + `eg-sol-showing` on desktop **and** app shell.
- `test-engine.js`: review `renderSolutionBodyHtml` fallback runs `stripLeadingStemEcho` + `repairSolutionDelimiters` (Test Series View Solution body no longer reprints stem). Review rows still show stem once by design (Marks review layout); solution card itself is echo-free.

### C) Palette dual controls (P0 UX)
- Pref key `qx_eg_palette_mode`: `side` | `strip` | `both` (default **both**).
- Practice **Aa** pop: Right / Top / Both (instant `syncCycleBtn`, no full refresh).
- Settings → **Practice palette** (same three options).
- Palette button honours preference; strip ✕ / side ✕ stay independent.
- Mobile: no structural change to `qx-mobile.css` independent strip/side rules (`eg-qxeg1`+); settings seg fits Right/Top/Both.

### D) Dark + light + homepage
- Stem-hide CSS extended for `.mtk-test-root` / `.allen-practice` / `.qx-stem-sol-hidden` under `html[data-theme]` **and** `data-test-theme`.
- Solution card / KaTeX contrast for dark + light (`qx-solution.css` + contrast sheets).
- Home polish: guest banner, board hero, tool cards (`qx-site-contrast.css`); landing badges (`qx-landing-premium.css`); `index.html` contrast `?v=qxmd165`.

## Unit checks

```bash
node scripts/qxmd165-unit-checks.js
```

| Sample | Result |
|--------|--------|
| Q33261 stem-echo | PASS |
| Q33268 stem-echo | PASS |
| Q33268 no `\left$|` / trailing `$$\\` | PASS |
| Synth Given+defs | PASS |
| Synth lone `$x^2=4$` | PASS |
| Synth full-stem-then-work | PASS |
| log/sin delimiter repair | PASS |
| Quick Shortcut math path | PASS |

**TOTAL: 13 pass / 0 fail**

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd165-files-to-copy.txt`.

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Smoke after deploy

1. Hard refresh → Build **qxmd165** / SW `qx-pwa-qxmd165`.
2. PYQ → Basics of Mathematics → Practice → Check/Show Answer:
   - Stem **gone**; Solution math typeset (no raw `\left|` / `$$\\`).
   - Show Answer OFF / close → stem returns.
3. Aa → Palette **Both**; toggle Right / Top; ✕ closes one only; mobile OK.
4. Settings → Practice palette persists.
5. Toggle dark/light on home + solution panel — readable, no invisible stem bleed.
6. Medical track practice + Test Series View Solution — no stem echo inside solution card.

## Constraints preserved

Quantrex branding · English UI · free access · no Firebase math rewrite · no invented answers · **no Vercel**

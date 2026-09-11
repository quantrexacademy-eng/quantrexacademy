# Quantrex Academy — website fix prompt (from Downloads file)

Source: `C:\Users\Admin\Downloads\quantrex-website-fix-prompt.md`  
Adapted to the **existing vanilla SPA** at `C:\Users\Admin\qx-hosting`. Do not rewrite in React. Do not invent academic content.

## Goal

One complete pass on **presentation, navigation, branding, and speed**. Question text, keys, and official figures stay identical.

## Architecture (do not fork per page)

```
local bank / Firestore questions/{id}
  → math-render.js (Mx) — only math engine
  → question-format.js + qx-question-format.css — one card
  → test-engine.js (palette, timer, Next/Prev/Exit, A−/A+)
```

Student runtime: `STUDENT_MARKS_RUNTIME=false`. Never call Marks from the browser.

## Issue map (website-real, not generic)

| # | User request | Quantrex root cause |
|---|---|---|
| 1 | Math too small / missing = / raw LaTeX | CSS was forcing UI fonts onto `.katex *`. Fix: `qx-math-system.css` last. Typeset after every Next via `Mx.afterRenderLight`. |
| 2 | Missing / scattered figures | Dead local overlays; CDN. Restore official imgs; figure sits in the stem flow (`qx-question-flow`). |
| 3 | Bikhre questions | One card: stem → figure → options → footer. No page-specific layouts. |
| 4 | Other-coaching watermarks | `QxImgClean` + Quantrex overlay. Do not invent redraws; flag if official source is missing. |
| 5 | Test UI like NTA | Existing CBT: palette (not visited / answered / review), timer, subject tabs, submit summary. Keep it. |
| 6 | Next / Previous / Exit / Zoom | `goTo` + capture-phase zoom. Exit warns/saves. Zoom uses `--qx-content-zoom` (vector math, not bitmap). |
| 7 | **Speed / smooth** (this session) | Never `JSON.parse` a 15k–41k bank on the phone. PYQ paper via `/api/catalog?action=paper`. Slim first-paint CSS/fonts. Cap was wrongly 120 Qs/paper — raise to 220 for NEET. |

## Speed rules

1. Dashboard first paint: brand + typography + mobile + touch. Defer test-series / handwritten-sol / RFC CSS.
2. Google fonts: Inter + Source Serif 4 only on first request. KaTeX ships math fonts.
3. No preload of Irodov/opt-fig JSON on every dashboard open.
4. PYQ mock / resume / analysis: catalog paper only — **never** `loadSingleBank(..., { allowLarge: true })`.
5. Prefetch next question figures only (already in `qx-test-engine-perf.js`).

## Do not

- Invent stems, options, figures, solutions.
- Change official A/B/C/D letter options or empty official sols.
- Deploy `Desktop\quantrexacademy` as source of truth.
- Load Marks CDN at student runtime.

## Acceptance

- Opening a PYQ mock does not freeze the tab.
- Next/Previous feel instant; math still typeset.
- Figures do not overlap options; zoom does not shrink math to unreadability.
- Quantrex watermark only (or flagged missing official art).

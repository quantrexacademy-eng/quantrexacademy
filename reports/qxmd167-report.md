# qxmd167 — Perfect Q+Sol format + simple Practice + ExamGoal foot + instant Palette

Date: 2026-09-17 ~21:40 IST (Asia/Calcutta)  
Build: **qxmd167**  
Cache: `qx-pwa-qxmd167`  
Source: `/workspace/qx-full`  
**No Vercel. Firebase = DATABASE only — no question-bank JSON rewrite. No deploy by this agent.**

## Goals (all included — “Sara taak samil”)

1. **Perfect question + solution format (P0)** — KaTeX-ready TeX; no raw glued commands; no stem reprint in Solution; options without radio-over-letter; Quick Shortcut path; Med+Eng shared pipeline; dark+light stem-hide CSS retained.
2. **Practice UI clean** — Theme / Aa / All Q / Palette always visible; mobile no `max-width:58%` overflow-hide; secondary Bookmark/Group/Full/Report tuck into Aa More on narrow screens.
3. **Palette FAST** — `#egMenuBtn` → `syncCycleBtn` / `_egSyncCycleBtn` class toggles only; default preference **side**; top strip via All Q only; independent ✕; side slide ≤140ms; strip not forced open by side.
4. **ExamGoal features in Practice** — Mark for Review & Next, Clear Response, Save & Next, Show Answer, Check Answer; palette legend Correct/Wrong/Answered/Marked/Ans+Mark/Seen/Unseen; status colors via existing `paletteStatus`. No Submit on Practice.
5. Stem hide after Check/Show Answer (qxmd165/166 nuclear CSS + empty `#egQArea` retained).

## What changed

### A) Format / KaTeX prep (`qx-math-sanitize.js`) — P0
Expanded `repairMarksExportTex`:
- `sinx` / `cosx` / `tanx` → `\sin x` / `\cos x` / `\tan x`
- `\sin xcos` → `\sin x \cos`
- `\lnsinx` → `\ln \sin x`
- `\betaare` → `\beta are` (stops raw unknown-command flash)
- `{log}_{cosx}` → `\log_{\cos x}`; bare `cotx` → `\cot x`
- `sin 2x` → `\sin 2x`
- Zero-width / U+2061 strip retained

`solution-format.js` already calls this from `repairSolutionDelimiters` — bank JSON untouched.

### B) Practice chrome (`examgoal-test-ui.js` + CSS)
- Toolbar order: **Theme, Aa, All Q, Palette** (primary) then Bookmark / Group / Full / Report (secondary).
- Mobile ≤720px: secondary hidden in toolbar, available under Aa → More (proxy clicks).
- Kill `max-width:58%` + horizontal overflow-hide; wrap / shrink icons; title truncates.
- Class `eg-qxmd167`; palette default **side** (`qx-settings.js` + `getPalettePref`).
- CSS: side-open does **not** force `#egQBar`; `[hidden]` + `eg-side-open` paints immediately; `--eg-chrome-ms: 140ms`.

### C) ExamGoal foot on Practice
- Foot: Show Answer | Mark for Review & Next | Clear Response || Previous | Save & Next.
- Wired by existing `test-engine.js` `#qxClearBtn` / `#qxReviewNextBtn` / `#qxSaveBtn` handlers.
- Legend includes Marked / Ans+Mark; practice `paletteStatus` already colors marked/answered.

### D) Options radio vs letter
Sitewide CSS: hide `.mtk-opt-radio` (letter circle is the control); selected letter gets soft ring — no overlap.

### E) Stem hide
No regression: `eg-sol-showing` nuclear rules + empty stem markup when Solution open (qxmd164–166).

## Unit checks

```bash
node scripts/qxmd167-unit-checks.js
# TOTAL: 21 pass / 0 fail
```

Covers: sinx/xcos/lnsinx/βare/log_cosx/dfrac αβ, log/sin delimiter, Q33261/33268 stem-echo, shortcut path, palette default side, Practice Mark/Clear/Save + legend.

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd167-files-to-copy.txt` (also `/workspace/uploads/qxmd167-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Smoke after deploy (honest — live required)

| Check | Unit/code | Live smoke needed |
|-------|-----------|-------------------|
| Build pill / SW `qxmd167` | PASS | Hard refresh |
| Glued TeX → KaTeX (sinx, xcos, βare) | PASS sanitize | Practice stem + sol dark+light Med+Eng |
| Q33268 solution no stem / no raw | PASS formatBody | Check Answer visual |
| Quick Shortcut rendered | PASS path | Real tip with KaTeX in browser |
| Radio vs letter overlap | PASS CSS | Select MCQ on phone |
| Toolbar primary visible mobile | PASS CSS | ~390px Practice |
| Palette one-tap side only | PASS code | Tap Palette; strip stays closed |
| All Q opens strip | PASS code | Tap All Q |
| Mark / Clear / Save & Next | PASS DOM ids | Tap each on Practice |
| Stem hide after Check/Show | PASS CSS retained | Check Answer then scroll |
| Medical + Engineering | Shared CSS/JS | One chapter each |

**Overall:** Code + unit **PASS (21/21)**. Live Practice KaTeX paint, toolbar tap-through, and Med+Eng dark/light still need parent smoke after USB → Firebase hosting.

## Constraints preserved

Quantrex branding · English UI · free access · no Firebase math rewrite · no invented answers · **no Vercel** · **no deploy by executor**

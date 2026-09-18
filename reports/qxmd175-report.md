# qxmd175 — Marks-way Check Answer + mobile Prev/Next + math typeset

Date: 2026-09-18 ~08:55 IST (Asia/Calcutta)  
Build: **qxmd175**  
Cache: `qx-pwa-qxmd175`  
Source: `/workspace/qx-full` (on qxmd174 tree)  
**No Vercel. No deploy by this agent. No bank math JSON rewrite.**

## User ask (AJAY · Hinglish combined)

1. **Check Answer UX = Marks Practice** — after Check Answer, solution must come Marks-way: **do not keep question stem visible in a split/divide layout**. Stem hides (or is replaced) while Solution is open; stem returns on close / Show Answer off / next question. Verify Practice + Test Series + Eng/Med.
2. **Mobile Prev/Next hiding again** — keep fully visible at bottom with safe-area (qxmd173 intent). Solution panel / overflow must not clip them. Clear stays hidden on mobile; Show Answer unchanged.
3. **Question + solution format still broken sitewide** — dig past qxmd174 `$$` strip: typeset not firing after Check Answer / solution inject; options; preview; solution-format; double-sanitize; KaTeX race; HTML entities; glued TeX. Fix **client-side** render path. **Do not invent/rewrite bank JSON math.**

## Root causes

### (1) Check Answer still looked “divided”

- Solution panel was injected **below options/check row**, so with a stem that still painted (or theme `visibility:visible !important` fighting hide), the screen read as **question + solution split**.
- Stem-hide CSS existed (`eg-sol-showing` / `eg-stem-sol-hidden`) but Marks-like **replacement of the stem slot** was missing — solution did not take the stem’s place.
- Allen/legacy practice kept sol reveal under the options block.

### (2) Mobile Prev/Next clipping

- Fallback foot creation used `className = "eg-foot"` only → wiped **`eg-foot-practice` / `eg-marks-foot`**, so qxmd173 mobile Prev|Next / Clear-hide CSS stopped matching.
- After Check Answer, solution scroll/overflow could bury the foot; no re-force of foot visibility from the reveal path (`forceFootVisible` was out of scope inside `revealPracticeSolution`).

### (3) Raw / broken math after Check Answer

- Residual sanitize bug: empty-display cleaner used `/\$\$\s*\$\$/g` (`\s*` = zero whitespace) → matched the **boundary of adjacent** `$$x$$$$y$$` and glued them to `$$xy$$` (KaTeX never saw two islands).
- `Mx.afterRender(solEl)` when `solEl` **is** `#egSol` / panel: `querySelectorAll` **misses the root**, so first-pass KaTeX paint skipped the injected solution.
- First-pass island paint selectors omitted `.eg-sol-panel` / `#egSolPanel`; KaTeX load race after DOM inject left raw TeX until a full refresh.

## Fixes (qxmd175)

### A) Marks-way Check Answer / stem

- Render + DOM reveal: **Solution panel inserts in the stem slot** (after `#egQArea`), class `eg-sol-marks-way` — not a side-by-side / under-stem split of the question text.
- Stem still emptied + nuclear-hidden while sol open; returns on close / Show Answer off / next (refresh).
- CSS: qxmd175 overrides so stem stay gone against qxmd167 `visibility:visible !important`; no 2-column q-card while sol open.
- Allen desktop + app shell: `#qaSolReveal` / `#qaResult` move above options when `solOpen`.
- `app.js` `qxHidePracticeStem` also targets `.eg-q-stem`.

### B) Mobile foot

- Creating a missing foot keeps **`eg-foot-practice eg-marks-foot`** on practice.
- `root._egForceFoot` hooked so reveal can re-force foot; Check Answer handler re-forces after refresh.
- CSS: foot `position:fixed; bottom:0; z-index:2147483000; padding-bottom: safe-area`; Prev|Next min-height 52px; Clear still `display:none` on mobile; sol panel gets bottom padding so it doesn’t cover the foot.

### C) Client math path (no bank rewrite)

- `normalizeDelimiters`: empty display only with **required whitespace** `/\$\$[ \t\n\r]+\$\$/g` — adjacent `$$…$$$$…$$` preserved.
- `afterRenderLight` `pickMathRoots`: include sol panel selectors; **unshift root** when it is itself a math host (`#egSol`, panel, etc.).
- First-pass KaTeX forEach includes `.eg-sol`, `#egSolPanel`, options hosts.
- Reveal / `qxRevealSolution` / `answerQ`: typeset retries at 50 / 200 / 500 ms for KaTeX race.

## Unit checks

```bash
node scripts/qxmd175-unit-checks.js
# TOTAL: 30 pass / 0 fail
```

Asserts include: stem hidden when sol open; Marks-way replace; Clear hidden mobile CSS; `$$` preserved (incl. adjacent blocks); typeset/sanitize hooks present.

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `/workspace/uploads/qxmd175-files-to-copy.txt` (and `reports/qxmd175-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Residual risk

- Theme CSS added later with equal/higher specificity on `.eg-q-stem { visibility:visible !important }` without `.eg-sol-showing` exclusion could fight stem-hide again — qxmd175 block is last in examgoal + qx-text-visible for now.
- If an alternate practice shell never gets `eg-qxmd175` / `eg-qxmd173` on the root, Clear-hide / foot nuclear rules may not apply (bind adds both).
- Typeset retries help KaTeX race; very slow CDN KaTeX (>500ms) may still flash raw TeX briefly.
- Preview rows remain plain-text snippets by design (no live KaTeX in list).

## Constraints preserved

Quantrex branding · English UI · Show Answer unchanged · mobile Clear hidden · **no bank math JSON rewrite** · **no Vercel** · **no deploy by executor**

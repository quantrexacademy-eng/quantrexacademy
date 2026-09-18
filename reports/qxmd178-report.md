# qxmd178 — Stem never above practice header (Marks mobile Solution open)

Date: 2026-09-18 ~09:45 IST (Asia/Calcutta)  
Build: **qxmd178**  
Cache: `qx-pwa-qxmd178`  
Source: `/workspace/qx-full` (on qxmd177 tree)  
**No Vercel. No deploy by this agent. No bank math JSON rewrite.**

## User ask (AJAY)

After qxmd175–177: *"Nahi resolve hua"* — screenshot shows **full question stem painted ABOVE the blue "Limits • Mathematics" practice header** (near status bar) while Show Answer ON / SOLUTION open. Stopping scroll (qxmd177) was not enough.

## Root cause (high confidence)

**Primary — legacy off-canvas stem-hide paints orphan stem at viewport top**

CSS from qxmd160–175 still declared:

```css
position: absolute !important;
left: -9999px / -10000px !important;
top: 0 !important;   /* examgoal qxmd160 block */
```

on `.eg-sol-showing #egQArea` / `.eg-q-stem` (also in `qx-site-contrast.css` / `qx-text-visible.css`).

When `display:none` raced or lost briefly to theme `visibility:visible !important`, mobile WebKit kept the absolute box with **`top:0` relative to the fixed `#app-main` / practice containing block** — so stem text painted at the **top of the viewport, above `.eg-top`**. That matches the screenshot: stem near the status bar, blue header below it. qxmd176/177 tried to override with `position:static` gated on `.eg-qxmd176/.eg-qxmd177`, but the **live absolute/`top:0` rules remained** in older blocks and could still win on specificity/order races.

Inside `.eg-test-root`, `#egQArea` is correctly **after** `.eg-top` in DOM and is emptied when sol opens — so the ghost was **not** normal in-flow stem below the header; it was **off-flow absolute paint** (and/or host leftover).

**Secondary — `#app-main` scrolled the whole practice shell**

`body.marks-test-active` forced `.eg-test-root { position: relative }` and `#app-main { overflow-y: auto }`, so chrome was not a locked fullscreen column. Overflow was not confined to the content pane; host chapter `.q-card` / `.q-text` siblings could also peek if anything remained outside the practice root.

## Fix (qxmd178)

1. **Rewrite all live absolute/`left:-9999`/`top:0` stem-hide rules** in `examgoal-test-ui.css`, `qx-site-contrast.css`, `qx-text-visible.css` to **`display:none` + `position:static` + `top/left:auto`** (no off-canvas).
2. **Defensive `eg-qxmd178` CSS**: `.eg-sol-showing #egQArea` / `.eg-q-stem` nuclear hide; hide stray stems / host `.q-card` while practice active.
3. **Locked Marks-like shell**: `.eg-test-root.eg-qxmd178` → `position:fixed; inset:0; overflow:hidden; flex column`; **`.eg-top` flex-shrink 0 at top**; **only `.eg-body` scrolls**; `#app-main` `overflow:hidden` when `eg-qxmd178-host`.
4. **JS**: `egNukeStemAboveHeader` + `egCoverHostQuestionStrip`; wired from `revealPracticeSolution` + practice `bind`; `enterMarksTestMode` / `enterAllenPracticeMode` add `eg-qxmd178-host`.
5. **Soft**: client unglue for `coordinateofthevertex` / `mustliein` / false `$…$` prose islands (no bank rewrite).
6. **Kept**: Show Answer sync, Clear hidden mobile, Prev/Next visible, no Vercel, no bank rewrite.

## Unit checks

```bash
node scripts/qxmd178-unit-checks.js
# TOTAL: 33 pass / 0 fail
```

Asserts: stem `display:none` rules; **no live absolute/-9999 stem-hide**; fixed root + body-only overflow; no `scrollTop=0`; host cover helpers; Show Answer / Clear / Prev-Next retained.

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `/workspace/uploads/qxmd178-files-to-copy.txt`.

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.** Hard-refresh / clear SW so `qx-pwa-qxmd178` loads.

## Residual risk

- `:has()` host/sibling selectors need modern WebKit/Chrome (practice phones OK; very old WebViews may rely on JS `egCoverHostQuestionStrip` only).
- If a future theme sheet reintroduces `position:absolute; top:0` on `.eg-q-stem` without `.eg-sol-showing` exclusion, ghost could return — keep absolute banned in stem-hide.
- Soft unglue covers reported lim/vertex glues; novel OCR joins may still need one-line pair adds (client-only).

## Constraints preserved

Quantrex branding · English UI · mobile Clear hidden · Prev/Next visible · Show Answer sync · **no bank math JSON rewrite** · **no Vercel** · **no deploy by executor**

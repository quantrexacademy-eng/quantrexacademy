# qxmd176 — Marks-like Check Answer (no ghost stem) + Show Answer sync + glued-word sanitize

Date: 2026-09-18 ~09:00 IST (Asia/Calcutta)  
Build: **qxmd176**  
Cache: `qx-pwa-qxmd176`  
Source: `/workspace/qx-full` (on qxmd175 tree)  
**No Vercel. No deploy by this agent. No bank math JSON rewrite.**

## User ask (AJAY · screenshot)

After qxmd175 Marks-way Check Answer: *"Question pura hide hogya — setting jaisa Marks hain waisa karo"*.

Screenshot symptoms:
1. Question stem **fragments stuck ABOVE the header** (scrolled/off-canvas ghost) — broken.
2. Big SOLUTION panel where the question was; options gone.
3. **Show Answer toggle OFF** while Solution visible (state mismatch).
4. Quick Shortcut glued words: `oddodd`, `eveneven`, `sosymmetricrelation`.
5. Prev/Next visible at bottom (ok — keep).

## Root cause of ghost / full-hide

### Ghost stem above header
qxmd175 hid the stem with **`position:absolute; left:-9999px; clip:rect(...)`** (JS inline + CSS) while also calling **`panel.scrollIntoView(...)`**. Off-canvas absolute positioning takes the stem out of normal flow; on mobile WebKit this paints/scrolls orphan stem text **above the chrome/header**. Emptying the stem alone was not enough when absolute + scroll raced with theme `visibility` rules.

### “Question pura hide” feel
Stem was nuked (empty + absolute off-screen) without Marks-like chrome: metadata stayed, but the off-canvas ghost + options buried under a tall Solution made it feel like the question vanished wrongly — not like Marks Practice Check Answer.

### Show Answer mismatch
Check Answer only set `_egChecked` / revealed the panel; **`_egShowAnswer` stayed false**, so the foot toggle rendered OFF while Solution was open. Close-X cleared checked; the toggle path did not stay in sync.

### Glued Quick Shortcut words
Lowercase OCR/prose joins (`oddodd`, `sosymmetricrelation`) were not handled by Cap-case glue splitters (`GLUE_WORDS_CAP_RE` only splits before Capitals).

## Marks-like layout implemented (qxmd176)

1. **Stop off-canvas hide** — stem collapse uses **in-flow** `display:none` + empty `#egQArea`; **`position:static; left:auto; clip:auto`**. CSS `eg-qxmd176` overrides all prior absolute/`-9999` stem-hide rules.
2. **No `scrollIntoView` on sol panel** — scroll `.eg-body` / `.eg-main` to `scrollTop = 0` only; body/`eg-q-card` get `overflow` containment so paint cannot leak above header.
3. **Solution still replaces stem slot** (`eg-sol-marks-way` after `#egQArea`) — not a split under the stem.
4. **Metadata stays** — info strip (Q#, type, source/exam) + top chrome remain visible.
5. **Options hide while sol open** (Marks-like; answer key lives in Solution); restore on close / Show Answer OFF / refresh.
6. **Show Answer sync** — Check Answer sets `_egShowAnswer = true` + checkbox ON; toggle reflects `wantShowSol`; OFF clears `_egChecked` and restores stem; close X → OFF + restore.
7. **Client unglue** — `Mx.unglueLowercaseMathProse` in `math-render.js`, wired into `fixWordSpacing` / `cleanQuestionText` / `formatShortcutLine` / solution `formatBody`. **No bank JSON rewrite.**

## Keep (verified)

- Mobile Clear hidden; Prev/Next fully visible + safe-area  
- Aa top  
- Quantrex brand  
- No Vercel  

## Unit checks

```bash
node scripts/qxmd176-unit-checks.js
# TOTAL: 35 pass / 0 fail
```

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `/workspace/uploads/qxmd176-files-to-copy.txt` (and `reports/qxmd176-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Residual risk

- Older CSS blocks still *declare* `left:-9999` for stem-hide; `eg-qxmd176` overrides with `position:static`. If a future theme sheet loads after examgoal CSS with equal specificity and re-applies absolute without the qxmd176 class gate, ghost could return — keep `eg-qxmd176` on the practice root.
- Dictionary unglue covers relation-theory / common OCR pairs; rare novel glues may still need a one-line pattern add (client-only).
- Options hidden while sol open is intentional Marks-like; if a path opens sol without `eg-sol-showing` / `eg-qxmd176`, options may remain visible (non-fatal).
- Typeset retries from qxmd175 retained; very slow KaTeX CDN may still flash raw TeX briefly.

## Constraints preserved

Quantrex branding · English UI · mobile Clear hidden · Prev/Next visible · **no bank math JSON rewrite** · **no Vercel** · **no deploy by executor**

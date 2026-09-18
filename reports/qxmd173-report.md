# qxmd173 — Mobile Practice foot: hide Clear · Prev|Next primary · safe-area · Aa top

Date: 2026-09-18 ~08:15 IST (Asia/Calcutta)  
Build: **qxmd173**  
Cache: `qx-pwa-qxmd173`  
Source: `/workspace/qx-full` (on qxmd172 tree)  
**No Vercel. No deploy by this agent. No bank JSON rewrite. No invented content.**

## User ask (Hindi → interpreted)

1. **Clear** must NOT appear on mobile Practice  
2. Desktop/website keeps ExamGoal-style Clear in the toolbar  
3. Mobile Practice bottom: **Previous | Next** as the main buttons (+ existing **Show Answer** — unchanged)  
4. Bottom bar was clipped under the screen edge → fully visible with `env(safe-area-inset-bottom)`  
5. **Aa / Text size** stays in the **top** toolbar; panel opens **downward** from the top (not bottom, not full-screen), so Prev/Next/Show Answer stay visible  

## What changed

### A) Mobile Practice foot (≤768px)

| Item | Behavior |
|------|----------|
| **Clear** | Hidden via CSS + narrow JS (`#qxClearBtn` / `.eg-btn-clear`) |
| **Mark for Review** (foot) | Also hidden on mobile foot so Prev\|Next is the primary row (Mark remains available via header tools) |
| **Show Answer** | **Untouched** — same DOM (`#egShowAns` / `.eg-show`), no hide/restyle/relocate |
| **Previous \| Next** | Primary full-width 2-col grid; **min-height 52px**, 16px bold, high contrast (slate Prev / Quantrex blue Next); short label **Next** on phone |
| **Safe-area** | Foot `bottom: 0` + `padding-bottom: calc(12px + env(safe-area-inset-bottom))`; overflow/clip cleared; content `padding-bottom: calc(120px + safe-area)` |
| **forceFootVisibleNow** | Same safe-area approach (no longer `bottom: max(8px, safe-area)` which clipped tall feet) |

### B) Desktop (≥769px)

- ExamGoal Clear (+ Mark) **still shown** in the practice foot row  
- Full labels (Save & Next) via `.eg-btn-full`  
- Layout unchanged ExamGoal horizontal toolbar feel  

### C) Aa / Text size (top)

- `#egFmtBtn` remains in **top** tools (not moved to foot)  
- Override legacy mobile rule that anchored `.eg-fmt-pop` to `bottom: calc(88px + safe-area)`  
- qxmd173: popover `position: fixed; top: calc(52px + safe-area-inset-top); right: 8px; bottom: auto; max-height: min(42vh, 320px)` — opens **downward**, compact, does not bury foot controls  

### D) Version / cache

- `version.json` → qxmd173 / `qx-pwa-qxmd173`  
- `sw.js`, `app.html` busts, `index.html` / `login.html` / `help.html` light busts, `qx-settings.js` `PARITY = "qxmd173"`  

## Unit checks

```bash
node scripts/qxmd173-unit-checks.js
# TOTAL: 20 pass / 0 fail
```

## How to verify (USB → hosting)

1. Hard refresh → build pill **qxmd173** / SW `qx-pwa-qxmd173`  
2. Phone Practice (~390px): **no Clear**; Show Answer still there; large **Previous | Next** fully above home indicator  
3. Tap **Aa** in top bar → compact panel opens under header (not above foot / not full screen); Prev/Next still visible  
4. Desktop ≥769px: Clear Response still in foot with Mark / Prev / Save & Next  
5. No bank/content changes  

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd173-files-to-copy.txt` (also `/workspace/uploads/qxmd173-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Residual risk

- Older CSS still has a legacy `@media (max-width: 720px) .eg-fmt-pop { bottom: … }` rule; qxmd173 overrides need `eg-qxmd173` on the root (injected by `examgoal-test-ui.js`). If an alternate practice shell omits that class, Clear hide / Aa top pop may not apply.  
- Mark-for-review is hidden from the **mobile foot** only; users mark via header flag/tools. If a device width sits between 721–768px, Clear hide uses 768px breakpoint (slightly wider than older 720px Marks CSS).  
- Inline `forceFootVisibleNow` can still rewrite foot styles on thrash; it now matches the safe-area padding model, but extreme theme toggles should be spot-checked once on a notched phone.  

## Constraints preserved

Quantrex branding · English UI · **no bank math JSON rewrite** · Show Answer unchanged · desktop Clear kept · **no Vercel** · **no deploy by executor**

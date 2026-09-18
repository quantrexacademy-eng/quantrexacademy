# qxmd177 — Marks mobile Check Answer (no question jump to top)

Date: 2026-09-18 ~09:45 IST (Asia/Calcutta)  
Build: **qxmd177**  
Cache: `qx-pwa-qxmd177`  
Source: `/workspace/qx-full` (on qxmd176 tree)  
**No Vercel. No deploy by this agent. No bank math JSON rewrite.**

## User ask (AJAY)

After qxmd176: *"Pura question top mein ja raha hai. Option uske niche — image mein dekho — jaisa mobile mein Marks mein hain waisa setting karo."*

Symptoms:
1. On Check Answer / Show Answer, the **entire question jumps/scrolls to the top** of the viewport.
2. Options sit in a **broken stack below** (reflow / reorder feel — not Marks Practice).
3. Want **Marks mobile Practice Check Answer** layout: stable content column, Solution in the question body under metadata, no orphan/jump.

## Root cause of top jump

### Primary (qxmd176 regression)
`revealPracticeSolution` and the bind typeset path **forced `scrollTop = 0`** on `.eg-body` / `.eg-main` / root after opening Solution (“safe” replacement for `scrollIntoView`). That is exactly the Marks-opposite behavior: content is yanked to the top whenever Solution opens.

### Secondary
Check Answer then calls `api.refresh()` → `paintQuestionNow` replaces `main.innerHTML`. New `.eg-body` mounts at `scrollTop = 0`. Even without the explicit assign, refresh alone recreated the jump unless scroll was captured and restored **by selector** after remount.

### Options “broken stack”
Options stayed in the render tree while Solution was injected; combined with the top jump + height collapse of the stem, the column felt like Q→top and options piled underneath. Marks hides options while Solution is showing and keeps metadata + sol in normal flow.

## Layout approach (Marks-like)

1. **No scroll on Check / Show Answer** — removed all live `scrollTop = 0` and any `scrollIntoView` on the sol panel.
2. **`egCaptureScroll` / `egRestoreScroll` / `egLockScrollJump`** — freeze viewport before mutate; restore after reveal **and** after refresh (resolve by CSS key so remounted `.eg-body` still gets the prior offset).
3. **In-flow replace** — stem slot still collapses with `position:static` (no absolute / `-9999`); Solution (`eg-sol-marks-way`) stays under the metadata strip.
4. **Options** — emptied + `eg-opts-sol-hidden` in render when `showSol`; DOM hide deferred to `requestAnimationFrame` after sol is in the tree (paint-first, then hide) to reduce reflow jump.
5. **Show Answer sync** kept from qxmd176 (Check Answer turns toggle ON; OFF / ✕ closes + restores).
6. **Mobile** — Clear stays hidden; Prev/Next fully visible + safe-area; Aa top unchanged.
7. **CSS `eg-qxmd177`** — `overflow-anchor: none`, metadata flex in-flow, opts/stem hide, sol relative in body.

## Soft check

Glued Quick Shortcut / math sanitize from qxmd176 left as-is (client unglue). No bank rewrite.

## Unit checks

```bash
node scripts/qxmd177-unit-checks.js
# TOTAL: 36 pass / 0 fail
```

Asserts: no live `scrollTop = 0` / no `panel.scrollIntoView` on sol open; scroll capture+restore+lock helpers; Marks-like classes (`eg-qxmd177`, `eg-sol-marks-way`); opts hide; Show Answer sync; Clear-hide / Prev-Next / Aa.

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `/workspace/uploads/qxmd177-files-to-copy.txt` (and `reports/qxmd177-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Residual risk

- If a future refresh path remounts outside `.eg-test-root` / `#app-main` without matching capture keys, restore could no-op (scroll stays at 0). Keys cover body/main/scroll/q-card/app-main/document.
- Very tall Solution after open can still grow the column downward (intended); we only prevent the **jump-to-top**.
- Older sheets still declare absolute stem-hide; `eg-qxmd177` + static overrides must stay on the practice root.
- Typeset retries retained; slow KaTeX may briefly flash raw TeX.

## Constraints preserved

Quantrex branding · English UI · mobile Clear hidden · Prev/Next visible · Show Answer sync · **no bank math JSON rewrite** · **no Vercel** · **no deploy by executor**

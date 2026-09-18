# qxmd170 — Perfect Q+Sol format harden + features (no Marks wait)

Date: 2026-09-18 ~07:40 IST (Asia/Calcutta)  
Build: **qxmd170**  
Cache: `qx-pwa-qxmd170`  
Source: `/workspace/qx-full`  
**No Vercel. No deploy by this agent. No bank JSON rewrite. Marks Google login not required.**

## User ask

> Features and format solution format sab kuch theek kar dena

Live was **qxmd169**. Marks book sync blocked on Google login — hardened local pipeline only.

## P0 — Question + Solution format

| Issue | Fix |
|-------|-----|
| Raw glued TeX (`sinx`, `sinxcosx`, `lnsinx`, `\betaare`, broken `$$`, `\left\|`) | Strengthened `qx-math-sanitize.js` `repairMarksExportTex`: bare `lnsinx`/`lncosx`, product `sinxcosx`, `{lncos}^{2}x`, `log _{1/2}`, `\sin xcos`, Greek glue; stems/options via `htmlContent` + `normalizeMathContent` |
| Solution reprints stem after Check/Show | Kept `stripLeadingStemEcho` + stem-hide CSS (`eg-sol-showing` / `eg-stem-sol-hidden`); Q33261/33268 unit green |
| Solution = Answer + explanation only | Unchanged Answer badge path; formatBody strips Given/stem echo first |
| Radio overlapping letter circle | Sitewide `.mtk-opt-radio { display:none }` retained; letter circle `flex-shrink:0` |
| KaTeX dark+light on options | New option `.katex` color rules for `data-test-theme=dark/light` |
| Quick Shortcut raw / whole-line `$Key step…$` | `formatShortcutLine` runs sanitize; prose tips wrap **math only**; `wrapBareLine` skips Key-step lines |
| Bank JSON | **Untouched** |

## P1 — Features retained / hardened

| Feature | Status |
|---------|--------|
| Mobile Practice: Prev/Next + ⋯ More (Mark/Clear/Show) | Kept (`eg-qxmd170` CSS/JS) |
| Report + Group on toolbar | Kept `eg-tool-reach` |
| Palette CSS-instant (no `api.refresh`) | Kept ≤80ms lock / 120ms chrome |
| Medical Digital Books: MIPYQ NEET 2027 + 8 books | MIPYQ first in **Recommended**; `qxFolderTrack` fallback; `booksForExam` embedded medical fallback if remote empty |
| Practice failsafe ~10s | Kept |

## Unit checks

```bash
node scripts/qxmd170-unit-checks.js
# TOTAL: 50 pass / 0 fail

node scripts/qxmd167-unit-checks.js
# TOTAL: 21 pass / 0 fail  (format regression)
```

## How to verify (USB → hosting)

1. Hard refresh so SW activates **qxmd170** (build pill + `qx-pwa-qxmd170`).
2. Practice → Basics of Mathematics → Q33265 / Q33268: no raw `lnsinx`/`sinxcosx`; Check Answer → stem hidden; solution = Answer + steps only.
3. Quick Shortcut shows “Key step:” as text + rendered math (not one giant math error).
4. Options: letter circle only (no radio overlap); KaTeX readable dark + light.
5. Phone Practice: **Previous | Next** + ⋯; Report + Group visible.
6. Medical → Digital Books: **Most Important PYQ NEET 2027** in Recommended + All Books (≥8).

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd170-files-to-copy.txt` (also `/workspace/uploads/qxmd170-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Constraints preserved

Quantrex branding · English UI · free access · **no bank math JSON rewrite** · qxmd165–169 stem-hide / Practice foot kept · **no Vercel** · **no deploy by executor** · Marks Google login not required for this ship

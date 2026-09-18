# qxmd169 — Mobile Practice foot + Report/Group + Medical MIPYQ + speed

Date: 2026-09-18 ~02:50 IST (Asia/Calcutta)  
Build: **qxmd169**  
Cache: `qx-pwa-qxmd169`  
Source: `/workspace/qx-full`  
**No Vercel. No deploy by this agent. No invented bank math.**

## User feedback (Hinglish / screenshots)

1. Mobile Practice looks weird — stacked **Mark for Review / Clear / Save & Next** dominate.
2. Bring back **Create Group / Save questions** and **Report question** on the toolbar.
3. Medical Digital Books must match Marks — missing **Most Important PYQ NEET 2027**.
4. Palette still not fast — must be CSS-instant one-tap.
5. Loading very slow — “This is taking longer than usual” / Retry.

Live was qxmd168. Kept format / stem-hide from 167/168.

## Fixes

### A) Mobile Practice foot (≤720px)

| Before | After |
|--------|--------|
| Show Answer + Mark + Clear stacked full-width + Save & Next | **⋯ More \| Previous \| Next** only (large) |
| Mark forced `flex: 1 1 100%` | Extras hidden until More / swipe-up / long-press (~480ms) |
| Save & Next label | **Next** (same goTo; auto-save path unchanged) |

- Desktop (≥721): full ExamGoal foot (Show / Mark / Clear + Prev / Next); More hidden.
- Check Answer stays in compact `eg-action-row` above the foot.
- Class `eg-qxmd169` + sheet scrim.

### B) Toolbar

- `#egPlusBtn` (Group / Save questions) and `#mtkReportBtn` (Report) get `eg-tool-reach`.
- Mobile Practice CSS no longer hides `.eg-tool-reach` with other secondaries.
- Theme / Aa / All Q / Palette remain primary; Bookmark / Full stay under Aa → More.

### C) Medical Digital Books

- Added **Most Important PYQ NEET 2027** to `data/books.json` medical + embedded `QX_BOOKS_CATALOG`.
- Wired to existing pack id `6a91185f41ab5aba084f4d30` (nav + chapters already on disk — **no invented questions**).
- Medical catalog now **8** books (Organic, HCV×2, Irodov, Bio 360, Top 500 Phy/Chem, MIPYQ).

### D) Speed

- Palette: menu/All-Q lock **80ms**; cell **120ms**; nav **150ms**; scrim ignore **200ms**; `--eg-chrome-ms: 120ms`.
- Still **no `api.refresh` on Palette open** (class sync only).
- Legend practice counts now include **Marked** + **Ans+Mark** so numbers match grid colors.
- Desk soft nudge **6s** / hard **16s**; practice failsafe default **10s** (inflight extend **6s**).
- Chapter/nav fetch: `cache: "default"` with version bust; `no-store` only when `resetBooksCache` sets `_qxBookForceNet`.
- Abort chapter **12s** / nav **10s** (was 20/15).

## Unit checks

```bash
node scripts/qxmd169-unit-checks.js
# TOTAL: 21 pass / 0 fail

node scripts/qxmd167-unit-checks.js
# TOTAL: 21 pass / 0 fail  (format + stem-hide regression)
```

(`qxmd168-unit-checks.js` expects build string `qxmd168` / old `no-store` — expected drift after bump.)

## How to verify (USB → hosting)

1. Hard refresh so SW activates **qxmd169**.
2. Phone Practice (~390px): foot shows **Previous | Next** + **⋯**; Mark/Clear/Show only via More / swipe / long-press.
3. Toolbar: **Report** and **Group** icons visible (not only buried in Aa).
4. Medical → Digital Books: **Most Important PYQ NEET 2027** listed; opens existing chapter pack.
5. Palette: one tap → side slides ≤120ms; strip stays closed; legend counts match cell colors.
6. Open a chapter / Practice set: should not hang on 50MB banks; Retry still works via force-net.

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd169-files-to-copy.txt` (also `/workspace/uploads/qxmd169-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Constraints preserved

Quantrex branding · English UI · free access · **no bank math JSON rewrite** · qxmd167/168 format & stem-hide kept · **no Vercel** · **no deploy by executor**

# qxmd172 — Eng+Med content wire + Quantrex brand + Marks-like Practice/Settings

Date: 2026-09-18 ~07:55 IST (Asia/Calcutta)  
Build: **qxmd172**  
Cache: `qx-pwa-qxmd172`  
Source: `/workspace/qx-full`  
Inventory: `/workspace/uploads/qxmd-content-inventory.md`  
**No Vercel. No deploy by this agent. No bank JSON rewrite. No invented questions.**

## User ask (combined)

1. Engineering + Medical: Marks-parity content **except videos**; branding **Quantrex only**
2. Marks-like mobile Practice + Settings + polished website Settings
3. Keep qxmd170 format fixes
4. Catalog/wire local packs only; note gaps
5. No deploy / no Vercel

---

## Shipped in this build

### A) Marks-like mobile Practice + Settings (from qxmd171, still in tree)

| Area | Status |
|------|--------|
| Mobile Practice foot ≤720px | **Mark \| Clear** + **Previous \| Save & Next** (`eg-marks-foot` / `eg-qxmd171`) |
| Toolbar | Theme / Aa / All Q / Palette; **Report + Group** reachable |
| Palette | CSS-instant (≤120ms chrome, ≤80ms lock) |
| Mobile Settings | Sectioned: Exam track · Notifications · Appearance · Practice · Account |
| Website Settings | Desktop cards, Quantrex blue `#2563eb`, dark/light readable |
| Format (qxmd170) | Sanitize / stem-hide / radio / shortcut **kept** |

### B) Engineering + Medical Digital Books (content wire)

**Engineering (active packs with nav + chapters):**  
MIPYQ · HCV Vol1/2 · Organic · Irodov · Rank Booster · 99 Percentile · Backlog Booster · BITSAT Eng/LR · Olympiad · Black Book · + 3 curated PYQ collections.  
**Coming soon (no data — not invented):** Skills Diff Calculus · Skills Integral Calculus.

**Medical (8 catalog books):**

| Book | How it opens |
|------|----------------|
| Most Important PYQ NEET 2027 | Own nav + chapters (`6a91185f…`) |
| Organic Chemistry | **Alias → Eng** `6a4ce383…` (+ new med nav manifest) |
| HCV Vol 2 | **Alias → Eng** `6a0addba…` (+ med nav) |
| HCV Vol 1 | **Alias → Eng** `69f9cc23…` (+ med nav) |
| Irodov | **Alias → Eng** `69cfb536…` (+ med nav) |
| Biology 360/360 | Own nav + **`qxBankFallback → neet`** chapter banks |
| Top 500 Phy / Chem for NEET | Own nav + **bankFallback → jee_main** sourceIds |

`QX_BOOK_NAV_ALIAS` in `data.js` + physical `data/nav/books/<medId>.json` copies so Medical routes open.

### C) Videos excluded

- Chapter hub: **Concept Video(s)** removed (`qx-redesign-nav.js`)
- JEE Advanced resources: video card removed (`marks-features.js`)
- Notes / Formula / Revision / Practice / PYQ remain

### D) Quantrex-only branding (user-facing)

- Catalog titles: **Quantrex Digital Books — Engineering / NEET**
- UI strings: Marks syllabus / Marks paper / Marks style → Quantrex-neutral
- `cleanUiLabel` strips `Marks` / `Get Marks App` / `getmarks.app` text
- Settings class `qx-qxmd-settings` (was `qx-marks-settings`)
- Scoring chip tooltip: **Scoring** (not “Marks” brand)
- Filenames (`marks-features.js`, etc.) **unchanged** per inventory guidance

---

## Not shipped — needs Marks scrape / authoring (do not invent)

| Gap | Notes |
|-----|-------|
| Skills Diff / Integral Calculus books | Catalog `isComingSoon`; no nav/chapters |
| Biology DPP | No `dpp` Biology bank |
| Medical / NEET test series | No `data/tests/neet*` (JEE Main series only) |
| Standalone Biology formula cards | Formula is PCM; Med UI synthesizes from NCERT nav only |
| Medical Quick Concepts tree | PCM quick concepts only |
| Any Marks-only book not in inventory | Would need scrape + local pack — **not done** |

Banks already present (usable without scrape): JEE Main/Adv, BITSAT, NEET (~43k), AIIMS, JIPMER, Abhyas NEET, state CET family, etc. — see inventory.

---

## Unit checks

```bash
node scripts/qxmd172-unit-checks.js
# TOTAL: 26 pass / 0 fail

node scripts/qxmd167-unit-checks.js
# TOTAL: 21 pass / 0 fail  (format regression)
```

(`qxmd171-unit-checks` expects build string `qxmd171` — expected drift after bump.)

## How to verify

1. Hard refresh → build **qxmd172** / SW `qx-pwa-qxmd172`
2. Medical → Digital Books → open Organic / HCV1 / HCV2 / Irodov (should navigate, not “catalog not loaded”)
3. Medical → Biology 360 / Top 500 → chapters load via bank fallback
4. Chapter hub: **no Concept Video** card
5. Settings: sectioned Quantrex UI; Practice foot Mark|Clear + Prev|Save&Next on phone
6. No “Marks” / “Get Marks App” in visible labels

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd172-files-to-copy.txt` (also `/workspace/uploads/qxmd172-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

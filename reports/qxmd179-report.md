# qxmd179 — Eng/Med Digital Books split + question-count badges

Date: 2026-09-18 ~04:20 IST (Asia/Calcutta)  
Build: **qxmd179**  
Cache: `qx-pwa-qxmd179`  
Source: `/workspace/qx-full` (on qxmd178)  
**No Vercel. No deploy by this agent. No invented bank question content.**

## User ask (AJAY)

Engineering vs Medical Digital Books must match Marks lists. Medical had Engineering MIPYQ wired in (same id `6a91185f…` / `jee_main` / 4289). Counts/badges must match Marks; questions must be same-to-same as Marks for each book — do not wire Med books to wrong Eng packs.

## What was wrongly in Medical

| Issue | Before | After |
|-------|--------|-------|
| **Most Important PYQ** | Same id as Eng `6a91185f41ab5aba084f4d30`, `bankSlug: jee_main`, count **4289**, subjects include **Mathematics** | Distinct id `qx_mipyq_neet_2027`, **coming soon**, badge **4941 Questions**, **not** openable to Eng pack |
| Eng-only books in Med array | Not present in `books.json` medical (Rank/Backlog/Olympiad/BITSAT) — bug was MIPYQ reuse | Still absent; unit checks assert |
| Titles | Mixed / Eng-leaning Organic title | Med titles: Organic **NEET 2027**, Irodov **for NEET**, Bio **360/360 — NEET 2027** |

## Engineering catalog (Marks-aligned + Quantrex extras)

**Recommended:** Physical Chemistry (coming soon) · MIPYQ (**4200+** badge; local **4289**) · HCV Vol 2  

**All Books (Marks set):** Organic JEE · HCV2 · HCV1 · Irodov JEE · Rank Booster · 99 Percentile · Backlog Se Azadi · Olympiad · English & Reasoning (BITSAT…)  

**Quantrex extras (not on Marks grid):** Black Book (1201) · Skills Diff/Integral (coming soon) · curated Must-Do / Top 100 / Top 250  

## Medical catalog (Marks-aligned)

**Recommended:** Physical Chemistry NEET (coming soon) · MIPYQ **4941** (coming soon) · HCV Vol 2  

**All Books:** Organic NEET · HCV2 · Biology 360/360 · HCV1 · Irodov NEET · Top 500 Phy · Top 500 Chem  

**Not in Med:** Rank Booster, Backlog, Olympiad, BITSAT Eng/LR, 99 Percentile JEE-only, Eng MIPYQ id  

## Counts applied (source)

| Book | Badge | Source |
|------|-------|--------|
| Eng Most Important PYQ | **4200+ Questions** (count 4289) | Local chapter JSON sum **4289**; Marks UI shows 4200+ |
| Med Most Important PYQ | **4941 Questions** | Marks screenshot only — **no local NEET pack** |
| Eng/Med HCV1 / HCV2 | 1853 / 1854 | Nav module sums (aliases for Med) |
| Organic Eng/Med | 1151 | Local Eng Organic chapters (Med aliases → Eng) |
| Irodov Eng/Med | 158 | Local Eng Irodov (Med aliases → Eng) |
| Rank Booster | 2793 | Local chapters |
| 99 Percentile | 3139 | Local |
| Backlog | 760 | Local |
| Olympiad | 1512 | Local |
| BITSAT Eng/LR | 1749 | Local |
| Biology 360/360 | 17415 | Nav chapter count sum → `neet` bankFallback |
| Top 500 Phy/Chem | 500 / 500 | Nav `sourceIds` length |
| Physical Chemistry Eng/Med | — | **Missing packs** → coming soon |
| Black Book | 1201 | Local |

UI: yellow Marks-like `qx-photo-qbadge` on every cover with known count (`bookCountBadgeText` in `book-covers.js`).

## Correctly wired vs residual (same-as-Marks content)

### Wired to local same pack / nav (usable)

- Eng MIPYQ, HCV1/2, Organic JEE, Irodov JEE, Rank Booster, 99%, Backlog, Olympiad, BITSAT Eng/LR, Black Book, curated three  
- Med Top 500 Phy/Chem (sourceIds → jee_main)  
- Med Biology 360 (nav → neet bankFallback)  
- Med HCV1/2 / Irodov / Organic: **Marks Med catalog ids** + nav aliases → **Eng chapter packs** (only packs on disk)

### Residual — missing local Marks-identical content

1. **Med Most Important PYQ (4941)** — Marks Med book id + chapter bank **not on disk**. Listed coming-soon with badge; **must not** reopen Eng 4289 pack.  
2. **Physical Chemistry JEE + NEET** — no standalone pack/nav/chapters; catalog coming-soon + SVG covers.  
3. **Med Organic NEET edition** — only Eng Organic pack exists; alias may differ from Marks NEET Organic question set until Med pack scraped.  
4. **Med HCV / Irodov** — Marks uses separate catalog ids; content assumed shared MCQ edition via Eng packs (unverified byte-identical to Marks Med).  
5. Skills Diff/Integral — still coming soon (no invent).

## Unit checks

```bash
node scripts/qxmd179-unit-checks.js
# TOTAL: 35 pass / 0 fail
```

## Files to copy

See `/workspace/uploads/qxmd179-files-to-copy.txt` (also `reports/qxmd179-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

# qxmd168 — Digital Books load complete (nothing missing)

Date: 2026-09-17 ~21:50 IST (Asia/Calcutta)  
Build: **qxmd168**  
Cache: `qx-pwa-qxmd168`  
Source: `/workspace/qx-full`  
**No Vercel. No deploy by this agent. No Firebase math/bank JSON rewrite.**

## User ask

> Digital book not loading — sab kuch load ho, kuch bhi miss na ho

## Root causes found

1. **`go("books")` called `resetBooksCache()` on every Books navigation** — wiped catalog payload/cache constantly; Retry could not reliably recover nav/chapter failures.
2. **`resetBooksCache` only cleared `_booksCache`** — did **not** clear `_bookNavCache` / `_bookChaptersLoaded`, so a failed/empty chapter stayed “loaded”.
3. **`loadBookChapter` used `cache: "force-cache"`** — stale empty/404 HTTP or SW hits could poison chapter loads.
4. **Empty chapter responses were marked loaded** — Retry never re-fetched.
5. **Medical bank books (Biology 360 / Top 500)** fell back to **`loadSingleBank(allowLarge)`** (50MB+ parse) → anti-hang / 20s view timeout → “not loading”.
6. **Curated PYQ books** existed on disk (`nav` + `chapters`) but **`books.json` curated was `[]`** — missing from the list.
7. **`data/qx_book_qid_index.json` missing** — practice/deep-link QID → chapter resolve failed for book packs.
8. **Figures:** box has **0** files under `/assets/diagrams`; JSON points at `/assets/diagrams/qx-book-*`. Need prefer-local + Firebase `onerror` (USB/live may have locals).
9. **Stale script busts** — `marks-features.js?v=qxvis4` etc. while build was qxmd167.
10. **qxmd167 Practice/format** kept intact (separate files; unit checks still green).

## Fixes (qxmd168)

| Area | Change |
|------|--------|
| Catalog | Restored **3 curated** books into `data/books.json` + embedded `QX_BOOKS_CATALOG` |
| `resetBooksCache` | Clears nav + chapter caches via `clearBookLoadCaches`; supports `{bookId, keepPayload}` |
| `app.js` | **Stopped** auto-reset on every Books view |
| `loadBookChapter` | `cache: "no-store"` + version bust; **only** mark loaded when `qs.length > 0` |
| Bank books | Prefer **`loadChapterBank`** (shard) / catalog by `sourceIds` — never hang on 50MB bank first |
| `getBookQuestions` | Matches medical↔engineering **aliases** |
| QID index | Generated **`data/qx_book_qid_index.json`** (20 055 ids) |
| Figures | Prefer local `/assets/diagrams/qx-book-*`; `data-qx-storage-src` + `retryOnError` → Firebase |
| Letter-only opts | Explicit path: never stall on “Loading options…” for digital books |
| SW / HTML | Cache `qxmd168`; NEVER_STALE includes `data.js`, `book-covers`, `qx-image-clean`, `qx-owned-figures`; busts aligned |

## Unit checks

```bash
node scripts/qxmd168-unit-checks.js
# TOTAL: 26 pass / 0 fail

node scripts/qxmd167-unit-checks.js
# (Practice/format regression) still green
```

## How to verify (USB → hosting)

1. Hard refresh (or clear site data once) so SW activates **qxmd168**.
2. Open **Digital Books** — Engineering list shows all catalog books **including curated** Must-Do / Top 250 / Top 100; Medical shows NEET set.
3. Open **Rank Booster** → any subject → any chapter → **all questions** for that exercise appear (e.g. 2793 Qs across book).
4. Open **HC Verma Vol 2** → Objective I/II/Exercises → chapter → questions appear.
5. Tap a question with figure options: local diagram if present on USB; otherwise Firebase (not stuck Loading). Letter-only A–D still paints.
6. If empty: **Retry** clears book caches and reloads.

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd168-files-to-copy.txt` (also `/workspace/uploads/qxmd168-files-to-copy.txt`).

**Note:** Chapter JSON under `data/books/chapters/**` and `data/nav/books/**` already in tree — copy if target tree is missing them. Diagram PNGs under `assets/diagrams/` are **not** on this box (0 files); USB/live may already have them. Loader prefers local when present and falls back to Firebase Storage.

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Constraints preserved

Quantrex branding · English UI · free access · **no bank math JSON rewrite** · qxmd167 Practice/format kept · **no Vercel** · **no deploy by executor**

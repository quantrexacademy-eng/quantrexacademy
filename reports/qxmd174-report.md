# qxmd174 — Fix raw LaTeX sitewide + Existence of Limit load

Date: 2026-09-18 ~08:25 IST (Asia/Calcutta)  
Build: **qxmd174**  
Cache: `qx-pwa-qxmd174`  
Source: `/workspace/qx-full` (on qxmd173 tree)  
**No Vercel. No deploy by this agent. No bank math JSON rewrite.**

## User ask

1. **Question format sabhi sahi karo** — Practice / options / Questions Preview showed raw TeX (`\mathrm{R}_{1}`, `$\left\{`, `\mathbb{Z}`, `\lim`, `\begin{pmatrix}`, `\int`, broken `\{1,2,3\}`).
2. **Chapter questions fail to load** — Mathematics → Limits (UI: Functions area / JEE Main) → Topicwise → **Existance of Limit** showed triple empty: banner + empty + toast.

## Root causes

### A) Raw LaTeX (format)

`qx-math-sanitize.js` → `normalizeDelimiters()` used:

```js
s.replace(/\$\s*\$/g, "")
```

Intended to remove **empty** `$ $` islands. In JavaScript that also matches the two characters of a display-math opener/closer **`$$`**. So every `$$…$$` block lost its delimiters on every sanitize pass (ingest + `Mx.html`):

| Before (bank) | After buggy sanitize |
|---|---|
| `$$\begin{pmatrix}…$$` | `\begin{pmatrix}…` (bare — KaTeX never sees it) |
| `$$\int…$$` | `\int…` |
| `$\mathrm{R}_{1}$` (inline) | usually OK — but mixed `$$` neighbors broke |

Additionally, `repairMarksExportTex` collapsed TeX set braces `\{` → `{`, so set notation lost visible braces.

**Not** a bank JSON content problem — client pipeline only.

### B) Existence / Existance of Limit load

- Nav meta title is typo **`Existance of Limit`** (`data/nav/chapter_meta/jee_main/Mathematics/limits.json`) with **14** Marks IDs.
- Local bank `data/banks/chapters/jee_main/mathematics/limits.json` **has all 14** under `_marksId`.
- Failures still happened when: title fuzzy mismatch (`Existence` vs `Existance`), `_marksId` filter miss, or Marks live topic API returned `[]` — then UI showed **toast + banner + empty** with no stub fallback.

## Fixes (qxmd174)

### Format

- `normalizeDelimiters`: only clear **empty** `$$ $$` and inline `$  $` (requires whitespace); **never** eat display `$$…$$`.
- Stop collapsing TeX `\{` / `\}` set braces (keep `\left\{` / `\right\}`).
- Preview rows (`stemPreviewText`): stronger TeX→plain strip so Questions Preview never shows raw `\mathrm` / `\lim`.
- `ensureMathDelimiters` BARE_SYM: add `int|sum|prod|oint`.

### Load

- `findMetaItem`: case-insensitive + **Existance ↔ Existence** normalization.
- `filterByMarksIds`: also match raw hex / `m_` ids.
- Topic filter miss / live empty / last chance → **stubs from chapter_meta questionIds** (then catalog fill).
- Single empty copy: **“No questions in this topic yet.”** (no triple noise).
- Display-only `qxTopicDisplayTitle` (Existance → Existence) — **does not rewrite bank JSON**.

## Unit checks

```bash
node scripts/qxmd174-unit-checks.js
# TOTAL: 27 pass / 0 fail
```

Asserts include: `$$x^2$$` / pmatrix / `\mathrm` / `\{1,2,3\}` keep delimiters; Existence fuzzy resolves to **14** real bank questions.

## Existence of Limit now?

**Yes.** Fuzzy title `Existence of Limit` → meta `Existance of Limit` → `filterByMarksIds` → **14** questions from local limits chapter bank. If filter ever misses, stubs still populate the list (not triple error).

## Files to copy → `E:\QUANTREX\website` then Firebase hosting

See `reports/qxmd174-files-to-copy.txt` (also `/workspace/uploads/qxmd174-files-to-copy.txt`).

## Deploy (parent only)

```bash
firebase deploy --only hosting --project quantrexacademy-app
```

**Do not use Vercel.**

## Residual risk

- KaTeX must still load for `$…$` / `$$…$$` to paint; sanitize now leaves delimiters intact so typeset can run.
- Preview list rows are **plain-text snippets** (by design); full Practice / Test still typeset.
- Other chapters with Marks-meta typos may need the same fuzzy norm (generic `existance` hook covers this class).
- Show Answer / Clear mobile policy from qxmd173 **unchanged**.

## Constraints preserved

Quantrex branding · English UI · **no bank math JSON rewrite** · Show Answer unchanged · **no Vercel** · **no deploy by executor**

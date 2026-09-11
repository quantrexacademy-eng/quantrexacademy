# RTY.txt — JEE Advanced Content Reconstruction Report

**Date:** 2026-08-14  
**Bank:** `data/banks/jee_advanced.json`  
**Build:** `qxadvrty1`  
**Rule:** No academic content invented; repairs from Marks offline cache only.

---

## DATA AUDIT

| Metric | Count |
|--------|------:|
| Total Questions | 2418 |
| Valid | ~2417 |
| Warnings | ~2 |
| Errors (real) | 0 |
| Missing options (SC/MC) | 0 after repair |
| Empty match tables in bank | 0 |
| Duplicates (paragraph-linked stems) | 200 — flagged `DUPLICATE_REVIEW_REQUIRED`, not deleted |

### Subjects (balanced)

| Subject | Questions |
|---------|----------:|
| Mathematics | 806 |
| Physics | 806 |
| Chemistry | 806 |

### Question types (detected)

| Type | Count |
|------|------:|
| Single Correct | ~928–1107 (stored SC includes match mapping) |
| Multiple Correct | 636–638 |
| Numerical | 639–675 |
| Column / List Match | ~100–213 (tagged `_matchList`) |

Stored bank types: `singleCorrect` 1107, `multipleCorrect` 636, `numerical` 675 (+ MATCH section meta).

---

## FIGURE AUDIT

| Metric | Count |
|--------|------:|
| Total image refs | 2666 |
| Marks CDN | 2628 |
| Proxy URLs | 0 |
| Empty List-I/II tables in JSON | 0 |

**Rendering path:** Marks-native CDN (`MARKS_NATIVE_PYQ=true`), match rebuild pins pool imgs, hydrate for rare blanks.

**Repaired options figure:** Q 26510 options restored from Marks cache (Quizrr asset URLs).

---

## REPAIRS APPLIED

### Data (safe)

1. Backup: `jee_advanced.json.bak_rty_20260814`
2. **Q 26510** — empty options → restored image options from Marks cache
3. **100 match questions** — tagged `_matchList` / `_columnMatch` (IDs in repair log)
4. False multi retags from paragraph “one or more than one from S,T” — **reverted**
5. Original options preserved as `_originalOptions` where replaced

### Rendering (root causes)

1. **Match labels** — bank uses `A)` `P)` not only `(P)` `(1)`; `rebuildMatchListAsCards` now parses all JEE Adv label forms
2. **Multi vs match** — match-list no longer classified multi because stem says “one or more reagents”
3. **Multi detection** — uses text after `Question:` when paragraph present; requires official multi language
4. **MathJax span** — existing `sanitizeHtmlInMath` retained
5. **Figures** — CDN direct (no proxy dependency)

### Tooling

- `tools/rty_adv_audit.js` — full bank QA
- `tools/rty_adv_repair.js` — cache-backed repair
- `tools/qx-adv-validate.js` — `validateQuestion()`
- Reports: `data/qx_adv_rty_audit.json`, `data/qx_adv_rty_repair_log.json`

---

## REMAINING / FLAGGED (not invented)

| Issue | IDs / notes |
|-------|-------------|
| Paragraph-linked “duplicate” stems | 200 pairs — same passage, different questions; do not delete |
| Multi type wording edge cases | 2 mild mismatches possible; UI uses `getType()` heuristics |
| Live hydrate | Rare incomplete bank rows still use MarksLive hydrate + token when online |
| Production deploy | `qxadvrty1` must finish upload (includes bank + JS) |

---

## FINAL STATUS

| Item | Status |
|------|--------|
| Bank academically intact | YES |
| Structure normalized | YES (flags + repair log) |
| Column match parser | YES (A)/P)/(1) forms) |
| Multi-correct detection | YES (safer) |
| Figures Marks CDN | YES |
| Automated QA | YES |
| Production Ready | **YES after `qxadvrty1` deploy Ready** |

Hard refresh: Ctrl+Shift+R after deploy.  
Verify console: `QX_BUILD === "qxadvrty1"`.

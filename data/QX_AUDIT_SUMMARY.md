# Quantrex Academy — Site Audit & Fix Report

**Date:** 2026-07-17  
**Live build:** `qxaudit1`  
**Hosting:** quantrexacademy-live.web.app / www.quantrexacademy.com  

---

## 1. Question-level audit

### Automated scan (quizrr + banks)
| Metric | Count |
|--------|------:|
| Questions scanned | **91,226** |
| Flagged (any issue tag) | 32,456 |
| Stub options `A/B/C/D` only | **22,008** |
| Fully empty options | **227** |
| Questions with Marks/Quizrr CDN figures | **12,639** |

### Critical bug fixed (Screenshot 552–553)
**Root cause:** Image-only options (structure MCQs) had no plain text after HTML strip → UI treated them as empty → “Options could not load. Retry load”.

**Fix:**
- `app.js` — image options no longer marked incomplete
- `question-format.js` — image options render with `/api/proxy-image?clean=1` (no Marks WM)
- `marks-live.js` — `isOptionsReady` treats image options as complete
- Deployed as **`qxaudit1`** (previously live still had old `question-format.js?v=qxwmb1`)

### Text / LaTeX format
- Softened aggressive LaTeX rewrite that was breaking question HTML
- Cleaned literal `</p>` / junk spacer math where safe
- MathJax typeset limited to question/option text containers (not whole option buttons)

### Correct answer marking
- Index validation in audit: bad index only when options empty/stub (data model uses 0-based `answer`)
- No mass answer rewrites (would require Marks API re-fetch for stubs)

---

## 2. Figure / diagram audit

| Item | Status |
|------|--------|
| Offline black redraw of local diagrams | **8,071** PNGs converted pure black (geometry preserved); originals in `assets/diagrams/color-src-backup` |
| Marks CDN watermarks | Server pipeline `/api/proxy-image?clean=1` strips gray Marks WM → pure black PNG |
| Quantrex overlay watermark | **Disabled** (was covering figures) |
| Only Marks-pool figures cleaned live | Yes — local book/HCV assets not re-processed in browser |

**Style:** black ink on white, no third-party branding, consistent line art.

---

## 3. Performance

| Change | Detail |
|--------|--------|
| Image clean proxy | Cached 7 days (`Cache-Control: max-age=604800`) |
| Cleaned PNG size | Example: ~246 KB → ~13 KB after clean+black |
| Lazy load | Existing `loading=eager` on exam figures for reliability; general lazy via QxPerf |
| Hosting headers | JS/CSS `max-age=3600`; images long-cache; HTML no-cache |
| Before/after full Lighthouse | Not re-run this session (pending manual) |

---

## 4. Navigation / UX

| Fix | Detail |
|-----|--------|
| Browser back | `history.pushState` on `go()` + `popstate` handler |
| Practice question | Back returns to list via `qxPracticeBack` |
| Active timed test | Back blocked with confirm; state re-pushed so exam not silently exited |
| Deep links | Existing hash routes: `#teacher`, `#assignments`, `#custom`, `#pyqmock` |

---

## 5. Branding

| Item | Status |
|------|--------|
| Quantrex UI theme | Existing black/charcoal primary + green accent retained |
| Third-party Marks WM on pool figures | Removed via clean proxy (not Quantrex overlay) |
| Third-party text in options/question CDN | Routed through clean proxy |

---

## 6. Summary table

| Category | Scanned / Scope | Issues found | Fixed this pass |
|----------|-----------------|--------------|-----------------|
| Questions (data) | 91,226 | 22,235 empty/stub; 12,639 Marks CDN | Runtime: image options display + hydrate; stubs need Marks full-fetch |
| Image option UI bug | All structure MCQs | “Options could not load” | **Fixed** (`qxaudit1`) |
| Local figures | 8,071 diagrams | Multi-color / Marks-like | Black redraw offline |
| Live Marks figures | CDN pool | Baked Marks watermark | **Server clean+black** |
| Navigation | SPA router | Weak back handling | **pushState/popstate** |
| Text format | Math/HTML | Over-aggressive LaTeX rewrite | Softened |

---

## Pending / manual review

1. **~22k stub `A/B/C/D` options** — need successful Marks API hydrate at runtime (`_marksId` present). Monitor after hard refresh.
2. **~227 empty options** — verify hydrate + token for those IDs.
3. **Full visual QA** of sample Alcohols Q11 (screenshot 553) after Ctrl+Shift+R.
4. **Lighthouse** before/after numbers not captured this session.
5. **Deep-link every question ID** — not feasible for 91k pages; router hash covers main modules.

---

## User action required

1. Hard refresh: **Ctrl + Shift + R**  
2. Reopen Alcohols / Phenols Q11  
3. Expect: **options with clean black structure images**, no Marks watermark, no “Options could not load” for image MCQs  

Build tag to confirm: scripts end with **`?v=qxaudit1`**.

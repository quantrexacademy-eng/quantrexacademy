# Quantrex Academy — Math typography + question format (executable)

Source of this spec: `C:\Users\Admin\Desktop\loki.txt`, rewritten for the **existing** vanilla SPA at `C:\Users\Admin\qx-hosting`. Do not rewrite in React. Do not invent stems, options, figures, or solutions.

## Goal

Mathematics on every student screen (practice, PYQ mock, chapter PYQ, test series, solutions) must look like **textbook + NTA CBT math**: large enough without zoom, KaTeX’s own fonts, sharp, spaced, scalable. Ordinary body text stays Inter. Math is **not** “symbols in the UI font”.

## Architecture (do not fork per page)

```
official bank HTML (Marks / Quizrr / Examgoal / local)
  → existing math-render.js (Mx) — one renderer
  → one CSS token system (qx-math-system.css last)
  → practice / CBT / PYQ / solutions
```

- Keep `math-render.js` as the only math engine (KaTeX islands + MathJax MathML).
- Do **not** wrap whole questions in math mode.
- Do **not** rasterize formulas.
- Do **not** add page-specific `font-size` hacks.

## Tokens (single source)

| Token | Desktop default | Role |
|---|---|---|
| `--nta-q` | **18px** | stem / options / solution text |
| `--math-inline-size` | **1.22em** | inline math ≥ surrounding text |
| `--math-display-size` | **1.38em** | display / aligned / matrix / cases |
| `--qx-content-zoom` | 1 | A− / A+ (already wired) |

A−/A+ steps: 16 / **18** / 20 / 22px. Never 14px.

Mobile: stem ≥ 16px; **do not shrink** `.katex` below inline size. Long display math: horizontal scroll, never `transform: scale` to fit.

## Hard rules

1. **Never set `font-family` on `.katex *`**. KaTeX needs `KaTeX_Main` / `KaTeX_Math` / `KaTeX_Size1–4` for integrals, radicals, stretchy brackets.
2. Never shrink math to fit a line.
3. Display math: block, left-aligned like NTA, `overflow-x: auto`.
4. Options math = question math size.
5. Dark mode: inherit a solid color; no faint opacity on glyphs.
6. Browser zoom 125–200% must enlarge math (vector KaTeX, not bitmaps).
7. Quantrex branding only. `STUDENT_MARKS_RUNTIME=false`.
8. Restore missing figures only from Marks / Quizrr / Examgoal / already-baked local / Firebase. Never invent.

## What this prompt does **not** authorize

- React rewrite, new question schema migration, deleting other sites.
- Inventing empty official solutions or truncated stems.
- Celebrity / political / god voices.
- Deploying `Desktop\quantrexacademy` as if it were source of truth. Live work is `C:\Users\Admin\qx-hosting`.

## Acceptance

- Math is readable at 100% zoom on a 13″ laptop and a 360px Android width.
- Fractions, roots, sub/superscripts, matrices, `\left`/`\right` look typeset, not UI-font.
- Screenshot-944 style stems (`<br>` inside `$aligned$`) still render.
- Dead `/assets/qx-figures/alcohol-prep/*` replaced by official figures when Marks/cache has them.
- No raw `$...$` / `\frac` left on screen after `Mx.html`.

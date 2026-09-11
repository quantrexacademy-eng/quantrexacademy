# Quantrex Academy — Final Figure / Watermark / Layout Prompt

Master reference: **Organic Chemistry Digital Book** (clear multi-color figures, readable text, subtle Quantrex seal).

Apply this to **entire site**: JEE Main / Advanced mock & practice, Rank Booster, I.E. Irodov, digital books, column matching.

## 1. QUANTREX WATERMARK (must not hide figures)

- Keep **Quantrex Academy** watermark. Never show Marks logo.
- Follow exam-book watermark rules:
  - **Diagonal angle −22°**
  - **Low opacity** like Organic book (~6–8% stem, ~5% options)
  - Small seal (~22–28% of figure), centered
  - `mix-blend-mode: multiply` so ink stays readable
  - Never cover Irodov / scanned question text
- Figure itself stays **opacity 1**, full color, no crop.

## 2. FIGURES MUST LOAD (no FIGURE boxes)

Screenshots 875 / 876 / 873: options or stem show broken **FIGURE**.

- JEE Main PYQ mock CBT: restore option images from bank / `_qxBankOptions` / `qx_opt_fig_index.json` **before paint**.
- Treat `FIGURE` / `Fig.` / diagram-only stubs as empty — never count them as real options.
- If an option’s visible text is only FIGURE, replace with the real CDN/proxy image.
- Rank Booster / Irodov: stem image **is** the question — never treat img-only stem as incomplete; never overwrite with Marks FIGURE.
- Clean proxy first (`/api/proxy-image?clean=1&v=c93`). No raw Marks logo. Fast cache.

## 3. IRODOV

- Every Irodov figure must show (full problem scan).
- Watermark faint + diagonal so formula text stays readable.
- Do not clip, hide, or shrink below readable size (`max-height` ~88vh).

## 4. COLUMN MATCHING

- Compact, beautiful tables: tight padding, no giant empty first column.
- List-I / List-II figures: correct aspect ratio, contained, aligned, not huge empty cards.
- Stem composite figures (A–D in one image) centered; option row compact.
- Match chips (A → II) stay neat; no wasted vertical space.

## 5. BEAUTY + SPEED

- Questions + figures should look clean and attractive (Organic standard).
- No flicker, no scan thrash, no CORS on figures.
- Restore from local bank first so first paint is fast.

## 6. ACCEPTANCE

- No heavy watermark covering text/bonds
- No Marks watermark
- No FIGURE boxes on JEE Main mock / Rank Booster / Irodov
- Irodov text readable
- Column match compact and aligned
- Hard-refresh (`Ctrl+Shift+R`) after deploy

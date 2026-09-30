# qxmd253 — Test pass and question display-format rules

English standing prompt for one pass on the Quantrex Academy website and the same app tree (`app.html` / PWA). Live hosts: https://www.quantrexacademy.com and https://quantrexacademy-app.web.app. Source of truth: `E:\QUANTREX\website`. Do not use `E:\QUANTREX\app-design`. Do not copy the product off the USB.

Build id for this pass: **qxmd253**. Cache name: `qx-pwa-qxmd253`.

## What to test

1. Confirm `version.json` `build` matches `window.QX_BUILD`, `sw.js` `CACHE`, and `pwa-register.js` before calling the pass done.
2. Homepage: track tiles render; no blank white screen; no student-facing Marks / Firebase branding.
3. Practice and test (Engineering PYQ and one Medical set): stem, options, and solution on one scroll. Previous and Next stay visible after Check Answer. Check Answer does not auto-advance.
4. Light and dark. Desktop and a 390px width. Option letters A–D stay visible (not `display:none`).
5. Spot-check stems, options, and solutions for the format failures below. Do not invent academic solutions. Do not change official `answer` values, question-bank math meaning, `data/marks_config.json`, `firestore.rules`, or `.env`.

## Display-format rules

Fix the renderer (JS/CSS) so many questions heal at once. If a content file must be patched for a display leak, change display markup only, never the answer key.

A question display is wrong when any of these show:

- Raw LaTeX in the stem, option, or solution (`\frac`, `\left`, `\mathrm`, `\infty`) outside a math island.
- Triple or double backslashes in front of a command (`\\\frac`, `\\$left`, `\$frac`).
- Set braces split so the student sees `\{` / `\}` or an infinity token pulled out of the set. `\{1,2,\infty\}` and `A \cap B = \{ x : 1 \le x \le 2 \}` must be one math island, commas kept.
- The solution panel repeats the question stem, or starts with DIFFICULTY / ANSWER meta. Keep the working only.
- KaTeX DOM dumped as text (`class="katex"`, `strut`, `aria-hidden`, `spanclass`).
- Option letters A–D missing because an older CSS rule hid `.mtk-opt-letter`. Add a later override. Do not delete the old rule.
- Broken figures: `src` with spaces around `=`, host `cdn-question-pool..app`, or a brand strip that deletes `getmarks` out of `getmarks.app`.
- Escaped commands left as visible text (`\$left`, `\$right`, `\$frac`).

Do not:

- Rewrite official `answer` fields.
- Run `wrapBareLatex` on stored JSON.
- Serialize a `.katex` node back into the solution as HTML source.
- Delete features, old CSS blocks, or question-bank files to “clean up”.
- Deploy functions, Firestore rules, or Storage rules. Hosting only.

## Renderer path

Stems, options, and solutions go through `qx-math-sanitize.js` (`collapseEscapedBackslashes`, `repairMarksExportTex`, `normalizeMathContent`) and `math-render.js` `html()` / `ensureMathDelimiters`. Solutions also go through `solution-format.js` `formatBody` / `stripLeadingStemEcho`. Practice chrome is `examgoal-test-ui.js` plus `assets/qx-chrome-lock.css` loaded last.

## Ship

Bump `version.json`, `sw.js` `CACHE`, `app.html` `QX_BUILD` and the `?v=` on every JS/CSS file this pass edited, and `pwa-register.js`.

```
cd /d E:\QUANTREX\website
npx firebase-tools deploy --only hosting --project quantrexacademy-app --non-interactive
```

Then commit only the prompt and code files from this pass and push `origin main`. No force-push. No git config changes. No `.env`. No question-bank JSON dumps.

After deploy, `https://www.quantrexacademy.com/version.json` must report `qxmd253`.

# Quantrex Academy — Full-site proofreading prompt

Use this as the standing quality bar for every exam, folder, question, figure, and screen (desktop + mobile). Do not invent academic content. Fix render, navigation, and empty opens.

## 1. Folders and exams
- Every tap that opens a screen must show real content or a clear Coming Soon + Back. Never a blank white page.
- Empty banks (Class 7, 8, 10) must not open a hollow subject list.
- Class 9 CBSE always shows Mathematics → Number System (extracted content only).
- Class 11/12 open their official tracks (JEE / CBSE) that already have banks.
- Engineering / Medical / Defence exam tiles with questions must open subjects; 0-count tiles stay Coming Soon.

## 2. Question proof (40-year teacher)
- Stem complete: no leftover `}$`, raw `\xrightarrow`, split `\left`, or stray digits.
- PCMB symbols: H₂SO₄, m/s², NAD⁺, set notation `{x ∈ R : …}` render, never leftover ≤ from `\left`.
- Option type matches the exam: JEE Main / NDA / NEET coded “1 only / Both / Neither / A, C and E only” = radios. JEE Advanced official `is(are)` / one-or-more = checkboxes. Assertion-Reason = one pick. Board written = no fake keypad.
- Column matching: List-I/II stay one table; reaction arrows with `\begin{array}` stay in the cell as stacked reagents; (S)/(5) never fall out of the table.
- Options never vanish, never show URL garbage, never “Loading…” when bank text exists.

## 3. Figures
- No Marks / Quizrr / Firebase branding on figures.
- Organic / colour figures keep colour + Quantrex seal (digital-book style).
- Missing figures: recover quoted `src`, unwrap proxy, local `qx-org` / `qx-c9-ns` first.
- Formula cards stay colourful (never `clean=1` bleach).

## 4. Page layout (one page, mobile too)
- Stem, figure, options, solution, Previous / Next / Back on one scroll without overlap.
- Tables and match lists scroll horizontally on phone; options stack full-width ≥640px.
- Touch targets ≥48px. Footer Previous/Next/Submit always reachable above the home indicator.

## 5. Navigation
- Back returns to the last folder (class → track → subject → chapter → question).
- Previous / Next move only inside the current set; first/last disable cleanly.
- Browser back does not dump a timed test without confirm.

## 6. Student dashboard
- Shows Quantrex Academy (never Firebase / Marks).
- Progress, exam switch, books, PYQ, formulas, DPP, tests all open working folders.
- After Google login: calm welcome — “Signed in to Quantrex Academy. Your practice is private.”

## 7. Admin panel
- Inventory: banks, counts, empty/soon folders, books.
- Open student app from admin. No student-facing Firebase strings.

## 8. Login (Marks-like, not suspicious)
- Google button: “Continue with Google”.
- Consent screen host: **quantrexacademy.com**, not `*.firebaseapp.com`.
- Errors: Quantrex wording only. No “Firebase Console”, no project-id toast.
- After login: branded safe message, then dashboard.

## 9. What not to do
- Do not invent chapters, answers, or textbooks.
- Do not put Marks watermarks back on figures.
- Do not open a folder that has zero items.

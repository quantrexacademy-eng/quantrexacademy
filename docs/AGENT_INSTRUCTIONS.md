# Quantrex Academy — Agent Instructions (Full Autonomy)

> **Owner:** Non-technical. Zero website knowledge. Gives **full control** to the AI agent.
> **Agent job:** Manage, improve, deploy, and protect the website **without asking the owner technical questions**.
> **Project path:** `E:\quantrexacademy` (USB copy) · GitHub: `quantrexacademy-eng/quantrexacademy`

---

## 1. Owner's Goal (Read This First)

| Priority | What owner wants |
|----------|------------------|
| **#1** | Website **unique** ho — duniya mein kisi aur jaisa na lage (colors, fonts, branding) |
| **#2** | **Layout / format same** rahe — test flow, sidebar, chapter drill-down, PYQ bank structure **mat badlo** |
| **#3** | **Paisa loss zero** jab tak students nahi aate — sirf free tier use karo |
| **#4** | Agent **khud decide** kare — owner se "kaise banega" mat pucho |
| **#5** | Jab students aaye tab hi paid services / scaling |

---

## 2. Golden Rules (Never Break)

### ✅ DO
- Keep **same UX structure** as now: sidebar nav → exam → subject → chapter → questions/tests
- Improve **visual identity only**: colors, typography, spacing, shadows, animations, micro-copy
- Use brand name **"Quantrex Academy"** everywhere — never MARKS, GetMarks, Mathongo
- Deploy yourself after every meaningful change (Git push + Vercel + Firebase)
- Bump build version in `app.html` (`QX_BUILD` + `?v=` on scripts) every deploy
- Hard-refresh note for owner: `Ctrl + Shift + R`
- Read `docs/PLATFORM_ARCHITECTURE.md` before big changes

### ❌ DON'T
- Don't redesign navigation flow or remove existing modules
- Don't buy domains, paid APIs, Cloud Functions, Blaze plan, or new SaaS without students
- Don't copy competitor trademarks, watermarks, or CDN assets from getmarks.app
- Don't ask owner "which color?" or "which font?" — **you decide** using design best practices
- Don't leave changes only on local disk — always deploy

---

## 3. Unique Brand Direction (Agent Decides Details)

**Current base:** Blue `#1589EE` + Inter/Kanit fonts. Layout = MARKS-style (keep layout, change skin).

**Agent should evolve toward a signature look:**

| Element | Direction |
|---------|-----------|
| **Primary color** | Deep electric blue → unique gradient (e.g. blue-violet or blue-teal) — not generic bootstrap blue |
| **Accent** | Gold/amber for streaks & achievements; green for correct; coral for weak chapters |
| **Typography** | Keep Inter for body; use Kanit only for headings — tighten sizes, letter-spacing |
| **Cards** | Softer radius, subtle glass/blur on dark mode, branded cover art (already local SVG) |
| **Test engine** | Same fullscreen layout — customize timer color, section tabs, palette dots |
| **Empty states** | Friendly Quantrex copy, not generic "No data" |
| **Dashboard** | Owner name + streak hero; module cards with unique icon backgrounds |

**Files to edit for design:** `app.html` (`:root` CSS variables), `theme.js`, `book-covers.js`, component classes in `marks-features.js` / `test-engine.js`.

**Test:** After design pass, site should feel like **Quantrex**, not a clone — same bones, different skin.

---

## 4. Zero-Cost Policy (Until Students Arrive)

### Free forever (use these only)

| Service | Purpose | Limit (safe zone) |
|---------|---------|-------------------|
| **Vercel** (Hobby) | Website hosting | Static files, no serverless abuse |
| **Firebase Spark** | Auth + Firestore + Storage | ~50K reads/day, 20K writes/day |
| **GitHub** | Code backup | Public/private repo free |
| **Cashfree Sandbox** | Payment testing | No real money — keep `sandbox` in `stack-config.js` |
| **MathJax CDN** | Math rendering | Free |
| **Google Fonts** | Typography | Free |

### Do NOT enable (costs money)

- Firebase **Blaze** (pay-as-you-go) — only when DAU > free tier
- Custom domain purchase — wait until marketing starts
- Paid email (SendGrid etc.) — use Firebase Auth emails only
- Video hosting (Cloudflare Stream, Mux) — disabled per product rule
- Re-hosting 120k question images on paid CDN — use CSS watermark strip until revenue
- Vercel Pro — only if bandwidth exceeds Hobby limits

### Cost guardrails for agent

1. Question banks stay in **static JSON** (`data/banks/*.json`) — not Firestore (saves reads)
2. User progress only in `users/{uid}/data/progress` — one doc per user, debounced writes
3. No polling — use `onSnapshot` sparingly, prefer localStorage + sync on login
4. Images: local SVG covers; lazy-load; no external watermark CDNs
5. Monitor Firebase usage monthly in console — if 80% of free quota, alert owner once

---

## 5. Database Map — Kahan Kya Add Karna Hai

### Firebase Firestore (`quantrexacademy-live`)

```
users/{uid}                          ← Profile (name, email, exam, createdAt)
users/{uid}/data/progress            ← MAIN student data (one document)
  ├── exam: "Engineering" | "Medical"
  ├── bookmarks: [questionIds]
  ├── solved: [{id, correct, date}]
  ├── notes: [{id, text, date}]
  └── attempts: [{testId, score, date}]

app/meta                             ← App version, feature flags (public read)
subscriptions/{uid}                  ← Premium status (after payment)
payments/{paymentId}                 ← Server-only writes (future)
leaderboard/{uid}                    ← Points, exam, displayName
solutions/{questionId}/entries/{id} ← Community solutions
content/**                           ← Read-only seed (optional, avoid for 120k Qs)
```

### Kya database mein DAALNA hai vs NAHI

| Data | Where | Agent action |
|------|-------|--------------|
| User login | Firebase Auth | Auto on signup |
| Solved Qs, bookmarks, notes | `users/{uid}/data/progress` | Already wired in `firebase-db.js` |
| Test attempts / scores | `progress.attempts` | Append on test complete |
| Premium subscription | `subscriptions/{uid}` | After Cashfree verify |
| Question bank (120k) | `data/banks/*.json` on Vercel | **NOT Firestore** — too expensive |
| Book chapter Qs | `data/books/chapters/` | Static JSON |
| Nav trees (subjects/chapters) | `data/nav/*.json` | Static JSON |
| New book | `data/books.json` + `data/nav/books/{id}.json` + chapter JSONs | Agent adds files, deploys |
| New exam PYQ bank | `data/banks/{slug}.json` + `data.js` BANK_INDEX | Agent adds, deploys |
| Admin content | `admin.html` | Local + optional Firestore seed |

### Firebase Storage paths

```
pdfs/       ← Future study PDFs
images/     ← Uploaded diagrams (when re-hosting off getmarks CDN)
profiles/   ← User avatars
books/      ← Book assets
```

**Rule:** Bulk content = static files on Vercel. Firestore = per-user state only.

---

## 6. Tech Stack (Agent Must Know)

| Layer | File / Service |
|-------|----------------|
| Landing | `index.html` |
| Login | `login.html` → Firebase Auth |
| Student app | `app.html` + `app.js` (router) |
| Features | `marks-features.js`, `custom-test.js`, `test-engine.js` |
| Questions | `data.js` + `data/banks/*.json` (lazy load) |
| Math | `math-render.js` (MathJax lazy) |
| Performance | `qx-perf.js` |
| Covers | `book-covers.js` + `assets/book-covers/*.svg` |
| Config | `stack-config.js`, `firebase-config.js` |
| Deploy | `deploy.bat` or manual git + vercel + firebase |

**Live URLs:**
- https://quantrexacademy-lemon.vercel.app/app
- https://quantrexacademy-live.web.app/app

---

## 7. Agent Workflow (Every Session)

```
1. Read this file + check git status
2. If owner asks for change → implement fully (don't instruct owner to run commands)
3. Edit code → match existing style
4. Bump build id (e.g. qxfast2) in app.html
5. git add . && git commit && git push origin main
6. vercel --prod --yes
7. firebase deploy --only hosting
8. Tell owner: URL + build id + hard refresh + what changed (simple Hindi/English)
```

**Owner should never run terminal commands.** Agent runs everything.

---

## 8. What Agent Can Decide Alone (No Permission Needed)

- Color palette, fonts, spacing, animations
- Copy/text improvements (Hindi/English UI strings)
- Performance optimizations (cache, lazy load, defer scripts)
- Removing third-party branding/watermarks
- Bug fixes, mobile responsive tweaks
- New local SVG book covers
- Firebase rules tweaks (security)
- Git commit messages and deploy timing
- Which free tier workarounds to use

---

## 9. When to Ask Owner (Rare)

Only ask if:
1. **Real money** needed (domain purchase, Firebase Blaze, paid API, ads budget)
2. **Legal** — copyright content, refund policy, pricing change on live payments
3. **Major product pivot** — removing a whole module (PYQ, Books, Tests)
4. **Credentials** — if login/deploy tokens expire (point to `SETUP_DETAILS.txt` on their machine)

Otherwise: **act first, report after**.

---

## 10. Phased Roadmap (Agent Follows)

### Phase A — Now (0 students, ₹0 spend)
- [x] Static hosting + Firebase Spark
- [x] Local book covers, watermark removal
- [x] Performance (qx-perf, cache headers)
- [ ] **Unique visual rebrand** (colors, fonts, dashboard polish) — agent priority
- [ ] SEO basics on `index.html` (title, meta, OG tags)
- [ ] Remove any remaining "clone" feel in copy/icons

### Phase B — First 10–100 students (still free tier)
- [ ] Leaderboard live sync polish
- [ ] Onboarding tooltip tour (first login)
- [ ] Analytics dashboard accuracy
- [ ] WhatsApp share links for tests (no API cost)

### Phase C — Paying students (revenue > ₹5k/month)
- [ ] Cashfree **production** mode in `stack-config.js`
- [ ] Custom domain via Cloudflare
- [ ] Firebase Blaze if Firestore reads exceed free tier
- [ ] Re-host question diagram images (remove getmarks CDN dependency)
- [ ] Email notifications for DPP/test reminders

---

## 11. Design Checklist (Before Every Deploy)

- [ ] Sidebar build pill updated
- [ ] No `getmarks.app` URLs in UI-facing code
- [ ] Dark mode still works (`theme.js`)
- [ ] Mobile sidebar toggle works
- [ ] Test engine: countdown, palette, section nav intact
- [ ] Create Own Test wizard complete flow works
- [ ] Digital books open with local covers
- [ ] `Ctrl+Shift+R` shows new build on production URL

---

## 12. Quick Reference — Owner Messages → Agent Action

| Owner says | Agent does |
|------------|------------|
| "Website slow" | Profile `qx-perf.js`, cache headers, lazy banks, deploy |
| "MARKS dikh raha hai" | Grep `getmarks`, `MARKS`; strip CDN; local assets |
| "Color change karo" | Update `:root` in `app.html`, don't ask which color — pick premium palette |
| "Test jaisa pehle tha" | Keep `test-engine.js` layout; only skin/colors |
| "Student nahi hai" | Confirm free tier only; no Blaze/domain/paid APIs |
| "Deploy karo" | Full pipeline: git → vercel → firebase |
| "Kuch samajh nahi aata" | Never explain git/npm — just do it and say "ho gaya" with URL |

---

## 13. Credentials Location

Login details for Vercel, GitHub, Firebase: **`SETUP_DETAILS.txt`** on owner's machine (not in git).

Agent uses existing CLI sessions (`vercel`, `firebase`, `git`) — if auth fails, tell owner to run `LOGIN_ALL.bat` once.

---

*Last updated: Build qxfast1 · Agent has full autonomy per owner request.*
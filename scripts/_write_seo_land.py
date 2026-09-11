#!/usr/bin/env python3
"""Write static JEE keyword landing pages (klo.txt on-page SEO)."""
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
CSS = """
:root{--bg:#eef4fb;--card:#fff;--ink:#0b1b33;--muted:#5b6b82;--brand:#1565C0;--line:#d4e3f4}
*{box-sizing:border-box}body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--bg);color:var(--ink);line-height:1.6}
.top{background:linear-gradient(125deg,#071526,#0b2a5b 45%,#1565C0 78%,#8450CB);color:#fff;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
.brand{display:flex;gap:10px;align-items:center;color:#fff;text-decoration:none;font-weight:800}
.brand img{width:40px;height:40px;border-radius:10px}
nav a{color:#fff;text-decoration:none;font-size:12px;font-weight:800;background:rgba(255,255,255,.12);padding:7px 12px;border-radius:999px;margin-left:6px}
main{max-width:860px;margin:0 auto;padding:22px 16px 48px}
h1{font-size:clamp(1.4rem,3.6vw,2rem);line-height:1.25;margin:0 0 10px}
h2{font-size:1.15rem;margin:22px 0 8px}p{color:var(--muted);margin:0 0 10px}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px;margin:14px 0}
.cta{display:block;text-align:center;background:linear-gradient(90deg,#1565C0,#8450CB);color:#fff;font-weight:800;padding:14px;border-radius:14px;text-decoration:none;margin-top:10px}
a{color:var(--brand);font-weight:700}
ul{margin:0;padding-left:1.2rem;color:var(--muted)}
footer{text-align:center;color:var(--muted);font-size:12px;padding:0 16px 28px}
"""

def page(title, desc, canonical, h1, blocks, faq, extra_links=""):
    faq_json = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in faq
        ],
    }
    import json
    faq_html = "".join(f"<h3>{q}</h3><p>{a}</p>" for q, a in faq)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index,follow,max-snippet:-1">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="https://www.quantrexacademy.com/assets/quantrex-logo-3d-192.png">
<link rel="icon" type="image/png" href="/assets/favicon-32x32.png">
<script type="application/ld+json">{json.dumps(faq_json, ensure_ascii=False)}</script>
<style>{CSS}</style>
</head>
<body>
<header class="top">
  <a class="brand" href="/"><img src="/assets/quantrex-logo-3d-64.png" alt="Quantrex Academy">Quantrex Academy</a>
  <nav><a href="/jee">JEE PYQs</a><a href="/neet">NEET</a><a href="/app.html">Open app</a></nav>
</header>
<main>
  <p style="font-size:12px;color:#5b6b82"><a href="/">Home</a> · <a href="/jee">JEE PYQs</a></p>
  <h1>{h1}</h1>
  {blocks}
  {extra_links}
  <div class="card"><h2>FAQs</h2>{faq_html}</div>
  <a class="cta" href="/app.html">Start practice on Quantrex Academy →</a>
</main>
<footer>© Quantrex Academy · JEE Main, JEE Advanced, NEET PYQs, mock tests and DPP. Rankings are decided by Google; we publish crawlable question pages and sitemaps.</footer>
</body>
</html>
"""

pages = [
    (
        "jee-main-pyq.html",
        "JEE Main Previous Year Questions with Solutions (Shift-wise PYQs) | Quantrex Academy",
        "Free JEE Main previous year questions with answers and solutions. Chapter-wise Physics, Chemistry and Mathematics from actual morning and evening shift papers on Quantrex Academy.",
        "https://www.quantrexacademy.com/jee-main-pyq",
        "JEE Main previous year questions with solutions",
        """<p>Quantrex Academy lists <strong>JEE Main PYQs</strong> chapter-wise so you can practise the same actual papers students sit in January and April sessions. Open any question for options, the correct answer, and a step-by-step solution.</p>
        <div class="card"><h2>What you get</h2>
        <ul>
          <li>Year, exam date, Morning Shift / Evening Shift when the paper label has them</li>
          <li>Easy / Medium / Hard as stored in the bank — not invented</li>
          <li>Actual paper questions vs practice (NTA Abhyas)</li>
          <li>JEE Mathematics, Physics and Chemistry hubs</li>
        </ul>
        <p><a href="/jee">All JEE PYQs</a> · <a href="/jee/mathematics">JEE Maths</a> · <a href="/jee/physics">JEE Physics</a> · <a href="/jee/chemistry">JEE Chemistry</a></p></div>""",
        [
            ("Are these official JEE Main questions?", "They are previous year questions stored in the Quantrex JEE Main bank, labelled with the paper year and shift when that data exists."),
            ("Can I filter by chapter?", "Yes. Open the JEE hub, pick Physics, Chemistry or Mathematics, then a chapter list."),
            ("Is there a mock test as well?", "Yes. After PYQs, take a timed JEE mock test in the Quantrex app with the same login."),
        ],
    ),
    (
        "jee-advanced-pyq.html",
        "JEE Advanced Previous Year Questions with Solutions | IIT-JEE PYQs | Quantrex Academy",
        "JEE Advanced previous year questions with solutions for IIT-JEE. Physics, Chemistry and Mathematics PYQs with answers on Quantrex Academy.",
        "https://www.quantrexacademy.com/jee-advanced-pyq",
        "JEE Advanced previous year questions (IIT-JEE PYQs)",
        """<p>Use this page as the IIT-JEE Advanced PYQ doorway. Questions include Paper 1 / Paper 2 labels when present, plus solutions. Then drill the same chapters in <a href="/jee/mathematics">JEE Mathematics</a>.</p>
        <div class="card"><h2>How to practise</h2>
        <ul>
          <li>Browse the combined <a href="/jee">JEE Main &amp; Advanced list</a></li>
          <li>Open a question — chips show year and paper when the source has them</li>
          <li>Attempt a full paper in the <a href="/jee-mock-test">mock test</a> app</li>
        </ul></div>""",
        [
            ("Do you cover JEE Advanced Mathematics?", "Yes. Use the JEE Mathematics hub and Advanced-tagged questions in the list."),
            ("Is this the same as JEE Main?", "No. Advanced papers are harder multi-correct / numerical sets. Both sit under the JEE hub so you can switch subjects quickly."),
        ],
    ),
    (
        "iit-jee-mathematics.html",
        "IIT JEE Mathematics — JEE Main & Advanced Maths PYQs, Practice | Quantrex Academy",
        "JEE Mathematics previous year questions and practice for JEE Main and JEE Advanced. Chapter-wise IIT-JEE Maths PYQs with solutions on Quantrex Academy.",
        "https://www.quantrexacademy.com/iit-jee-mathematics",
        "IIT JEE Mathematics — PYQs and practice",
        """<p><strong>JEE Maths</strong> is the highest-intent subject search after “JEE Main PYQ”. This page points to the live Mathematics chapter list: calculus, algebra, coordinate geometry, vectors, probability — as stored in the Quantrex bank.</p>
        <div class="card"><h2>Start here</h2>
        <p><a href="/jee/mathematics">Open the JEE Mathematics PYQ list</a> (14,000+ questions). Then take a <a href="/jee-mock-test">JEE mock test</a> or a <a href="/jee-dpp">Maths DPP</a> in the app.</p></div>""",
        [
            ("Is this JEE Main or Advanced Maths?", "Both. The mathematics hub mixes JEE Main and JEE Advanced sources; each question keeps its paper label."),
            ("Do you have JEE Maths test series?", "Timed tests and DPPs run inside the Quantrex app with the same account as the website."),
        ],
    ),
    (
        "jee-mock-test.html",
        "JEE Mock Test 2026–2027 — Free JEE Main Mock Tests | Quantrex Academy",
        "Take JEE Main mock tests and chapter tests on Quantrex Academy. Same login as PYQs and DPP. Practice the 2026–2027 pattern in the app.",
        "https://www.quantrexacademy.com/jee-mock-test",
        "JEE mock test — JEE Main timed practice",
        """<p>Students search <strong>JEE mock test</strong> and <strong>JEE Main mock test 2027</strong> when they want a full paper, not only PYQs. Quantrex timed tests live in the app (website + Google Play, one account).</p>
        <div class="card"><h2>What to do</h2>
        <ol>
          <li>Login on <a href="/login.html">quantrexacademy.com</a></li>
          <li>Open <a href="/app.html">the app</a> → Tests / PYQ papers</li>
          <li>Warm up with <a href="/jee">chapter PYQs</a> if a topic is weak</li>
        </ol>
        <p>NTA’s JEE Main pattern (recent cycles): 75 questions, 300 marks, 3 hours, Physics + Chemistry + Mathematics. Confirm the live NTA brochure each year.</p></div>""",
        [
            ("Are mock tests free?", "You can start from the website login and guest/trial flows in the app. Paid plans unlock the full test series where offered."),
            ("PYQ vs mock test?", "PYQs are actual past papers. Mock tests mix exam-pattern practice. Use both."),
        ],
    ),
    (
        "jee-dpp.html",
        "JEE DPP — Daily Practice Problems for JEE Main & Advanced | Quantrex Academy",
        "JEE DPP (daily practice problems) for JEE Main and JEE Advanced on Quantrex Academy. Same account as PYQs and mock tests.",
        "https://www.quantrexacademy.com/jee-dpp",
        "JEE DPP — daily practice problems",
        """<p>A <strong>JEE DPP</strong> is a short daily set — not a 3-hour mock. Quantrex DPPs are inside the logged-in app, tied to the same JEE Main / Advanced banks as the public PYQ list.</p>
        <div class="card"><h2>Suggested daily loop</h2>
        <ul>
          <li>1 chapter of <a href="/jee">JEE PYQs</a></li>
          <li>Today’s DPP in <a href="/app.html">the app</a></li>
          <li>1 timed <a href="/jee-mock-test">mock</a> on weekend</li>
        </ul></div>""",
        [
            ("What does DPP mean?", "Daily Practice Problems — a small set of questions for one day of JEE prep."),
            ("Is DPP the same as PYQ?", "No. PYQs are previous year papers. DPP is ongoing practice, often mixed difficulty."),
        ],
    ),
    (
        "jee-main-2027.html",
        "JEE Main 2027 — Exam Dates, Syllabus, PYQs, Mock Tests | Quantrex Academy",
        "JEE Main 2027 preparation hub: expected January and April sessions, syllabus from NTA, previous year questions, mock tests and DPP on Quantrex Academy. Official dates come from nta.ac.in.",
        "https://www.quantrexacademy.com/jee-main-2027",
        "JEE Main 2027 — PYQs, mock tests and what NTA usually announces",
        """<p>NTA has not always published the full 2027 calendar on the same day coaching blogs do. Treat session months as <strong>expected</strong> until you read them on <a href="https://jeemain.nta.nic.in" rel="noopener">jeemain.nta.nic.in</a> / nta.ac.in.</p>
        <div class="card"><h2>What students are searching now</h2>
        <ul>
          <li>JEE Main 2027 exam date (Session 1 typically January, Session 2 typically April)</li>
          <li>JEE Main 2027 syllabus (NTA Paper 1: Physics, Chemistry, Mathematics; NCERT class 11–12)</li>
          <li>JEE Main previous year questions and mock tests</li>
        </ul>
        <p>Prepare with <a href="/jee-main-pyq">shift-wise PYQs</a>, <a href="/iit-jee-mathematics">JEE Mathematics</a>, <a href="/jee-dpp">DPP</a> and <a href="/jee-mock-test">mock tests</a> on Quantrex — we do not invent AIR toppers or unofficial “released” dates.</p></div>
        <div class="card"><h2>Official sources</h2>
        <p>Exam dates, city intimation, admit card and answer key: NTA only. Quantrex is a practice academy (PYQ / tests / DPP), not the conducting body.</p></div>""",
        [
            ("When is JEE Main 2027?", "Expect two sessions (January and April) as in recent years. Use only NTA’s notice for the exact dates."),
            ("How should I prepare until the notice?", "Finish NCERT + chapter PYQs, then weekly mock tests. That plan does not depend on the final date."),
        ],
    ),
]

for name, title, desc, canon, h1, blocks, faq in pages:
    (ROOT / name).write_text(page(title, desc, canon, h1, blocks, faq), encoding="utf-8")
    print("wrote", name)

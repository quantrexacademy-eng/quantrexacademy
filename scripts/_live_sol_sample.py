#!/usr/bin/env python3
import json, urllib.parse, urllib.request, re

def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()

def paper(src):
    u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=neet&source=" + urllib.parse.quote(src) + "&v=qxfix47"
    d = json.loads(urllib.request.urlopen(u, timeout=180).read())
    qs = d.get("questions") or []
    n = len(qs)
    sols = sum(1 for q in qs if len(plain(q.get("solution") or "")) >= 12)
    imgs = sum(1 for q in qs if re.search(r"<img", str(q.get("solution") or ""), re.I))
    print(src, "Q", n, "sol", sols, "sol_img", imgs, "empty", n - sols)
    # sample one sol
    for q in qs:
        if len(plain(q.get("solution") or "")) > 40:
            print("  sample", q.get("id"), plain(q.get("solution"))[:160])
            break

for s in ("NEET 2025", "NEET 2021", "Re-NEET 2026 Mock 1"):
    paper(s)

u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=jee_main&source=" + urllib.parse.quote("JEE Main 2025 (22 Jan Shift 1)") + "&v=qxfix47"
try:
    d = json.loads(urllib.request.urlopen(u, timeout=180).read())
    qs = d.get("questions") or []
    sols = sum(1 for q in qs if len(plain(q.get("solution") or "")) >= 12)
    print("JEE sample paper", d.get("source"), "Q", len(qs), "sol", sols, "ok", d.get("ok"))
except Exception as e:
    print("jee paper err", e)

html = urllib.request.urlopen("https://www.quantrexacademy.com/app.html", timeout=30).read().decode("utf-8", "ignore")
for pat in ("solution-format.js", "qx-solution.css", "QX_BUILD"):
    m = re.search(pat + r"[^\"']{0,40}", html)
    print("html", m.group(0) if m else pat + " MISSING")

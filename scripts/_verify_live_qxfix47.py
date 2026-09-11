#!/usr/bin/env python3
import json
import re
import urllib.parse
import urllib.request

html = urllib.request.urlopen("https://www.quantrexacademy.com/app.html", timeout=30).read().decode("utf-8", "ignore")
m = re.search(r'QX_BUILD\s*=\s*"([^"]+)"', html)
print("QX_BUILD", m.group(1) if m else "NONE")
idx = json.loads(urllib.request.urlopen("https://www.quantrexacademy.com/data/nav/pyq_paper_index/neet.json?v=qxfix47", timeout=30).read())
print("2025", idx.get("2025"))
print("2024", [(p.get("source"), p.get("officialCount") or p.get("count"), p.get("durationMin")) for p in (idx.get("2024") or [])])
print("2026", [(p.get("source"), p.get("officialCount") or p.get("count")) for p in (idx.get("2026") or [])])
print("2002", idx.get("2002"))
mods = urllib.request.urlopen("https://www.quantrexacademy.com/data/nav/pyq_paper_index/neet_modules.json?v=qxfix47", timeout=30).read()
print("mods", mods[:500].decode())
for src in ("NEET 2025", "NEET 2002", "Re-NEET 2026 Mock 1"):
    u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=neet&source=" + urllib.parse.quote(src) + "&v=qxfix47"
    d = json.loads(urllib.request.urlopen(u, timeout=180).read())
    print("paper", src, "ok", d.get("ok"), "count", d.get("count"))

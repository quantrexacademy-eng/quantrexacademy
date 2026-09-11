#!/usr/bin/env python3
import hashlib, json, re, ssl, urllib.request
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "assets" / "diagrams"
RX = re.compile(r"https://cdn\.quizrr\.in[^\"'\\]+")
CTX = ssl.create_default_context()
files = [ROOT / "data/banks/mht_cet.json", ROOT / "data/banks/ts_eamcet.json"]
urls = set()
for fp in files:
    urls.update(RX.findall(fp.read_text(encoding="utf-8", errors="ignore")))
print("urls", len(urls), flush=True)
mapping = {}
for u in urls:
    dest = OUT / f"qx-self-{hashlib.sha1(u.encode()).hexdigest()[:16]}.png"
    if dest.exists() and dest.stat().st_size > 80:
        mapping[u] = "/assets/diagrams/" + dest.name
        continue
    req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://web.getmarks.app/"})
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            buf = r.read()
        if len(buf) > 80:
            dest.write_bytes(buf)
            mapping[u] = "/assets/diagrams/" + dest.name
            print("ok", dest.name, flush=True)
        else:
            print("small", u, flush=True)
    except Exception as e:
        print("fail", u, e, flush=True)
rew = 0
for fp in files:
    t = fp.read_text(encoding="utf-8")
    orig = t
    for u, loc in mapping.items():
        t = t.replace(u, loc)
    if t != orig:
        fp.write_text(t, encoding="utf-8")
        rew += 1
print(json.dumps({"mapped": len(mapping), "rewritten": rew}))

#!/usr/bin/env python3
import re, ssl, urllib.request
req = urllib.request.Request(
    "https://www.quantrexacademy.com/app.html",
    headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"},
)
with urllib.request.urlopen(req, timeout=25, context=ssl.create_default_context()) as r:
    t = r.read().decode("utf-8", "ignore")
print("QX_BUILD", re.search(r'QX_BUILD\s*=\s*"([^"]+)"', t).group(1))
print("sol52", "solution-format.js?v=qxfix52" in t)
print("marks52", "marks-features.js?v=qxfix52" in t)
print("math52", "math-render.js?v=qxfix52" in t)

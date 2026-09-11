#!/usr/bin/env python3
import re, urllib.request
def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "QuantrexVerify/152", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.status, r.read().decode("utf-8", "ignore")
st, ver = get("https://www.quantrexacademy.com/version.json")
print("version", st, ver[:240].replace("\n", " "))
st, html = get("https://www.quantrexacademy.com/app.html")
m = re.search(r'QX_BUILD\s*=\s*"([^"]+)"', html)
print("app", st, "QX_BUILD", m.group(1) if m else "none")
st, js = get("https://www.quantrexacademy.com/math-render.js")
print("flatten", "flattenUnsafeMathDollars" in js)
print("no wrap le", "$\\\\le$" not in js[js.find("Keep unicode operators"):js.find("Keep unicode operators")+800] if "Keep unicode operators" in js else "n/a")

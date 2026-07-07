#!/usr/bin/env python3
import re
import ssl
import urllib.request

CTX = ssl.create_default_context()
html = urllib.request.urlopen(
    urllib.request.Request("https://web.getmarks.app/", headers={"User-Agent": "Mozilla/5.0"}),
    context=CTX,
    timeout=30,
).read().decode("utf-8", "ignore")
scripts = re.findall(r'src="([^"]+\.js)"', html)
found_neet = set()
found_assign = set()
for src in scripts:
    url = src if src.startswith("http") else "https://web.getmarks.app" + src
    try:
        js = urllib.request.urlopen(
            urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}),
            context=CTX,
            timeout=60,
        ).read().decode("utf-8", "ignore")
    except Exception:
        continue
    found_neet.update(re.findall(r"/api/v\d+/neet/[a-zA-Z0-9_./?=&%-]{3,120}", js))
    found_assign.update(re.findall(r"/api/v\d+/[a-zA-Z0-9_./-]*assignment[a-zA-Z0-9_./?=&%-]{0,80}", js, re.I))
    found_assign.update(re.findall(r"assignmentSettings", js))

print("NEET API paths:")
for f in sorted(found_neet):
    print(f)
print("\nAssignment paths:")
for f in sorted(found_assign):
    print(f)
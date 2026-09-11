import json
import re
import urllib.request

base = "https://www.quantrexacademy.com"
hdr = {"Cache-Control": "no-cache", "User-Agent": "qx"}
url = (
    base
    + "/data/books/chapters/6a4ce383c59a7b462185330f/"
    + "6a4ce383c59a7b462185330f__6a4e21aea2f0a1af5a74e192__6a4e21d9a2f0a1af5a74e61e__6a4e21d9a2f0a1af5a74e61f.json?v=qxorgc1"
)
d = json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=hdr)).read())
q = d["questions"][0]["q"]
print("has qx-org", "qx-org-" in q)
print("has quizrr", "quizrr" in q)
m = re.search(r"/assets/diagrams/qx-org-[a-f0-9]+\.png", q)
print("src", m.group(0) if m else "none")
if m:
    resp = urllib.request.urlopen(
        urllib.request.Request(base + m.group(0), headers=hdr)
    )
    print("img", resp.status, resp.headers.get("content-type"), resp.headers.get("content-length"))
app = urllib.request.urlopen(urllib.request.Request(base + "/app.html", headers=hdr)).read().decode(
    "utf-8", "replace"
)
print("build", "qxorgc1" in app)

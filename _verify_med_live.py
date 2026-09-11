import json
import urllib.request

base = "https://www.quantrexacademy.com"


def get(p):
    req = urllib.request.Request(
        base + p, headers={"Cache-Control": "no-cache", "User-Agent": "qx-audit"}
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()


b = json.loads(get("/data/books.json?v=qxmed4"))
print("MED", [(x["title"][:48], x.get("isComingSoon")) for x in b.get("medical", [])])
v1 = json.loads(get("/data/nav/books/69f9cc23681eab6d6021a4d1.json?v=qxmed4"))
print("HCV1", [m["title"] for m in v1["modules"]])
print("HCV1 first ch", v1["modules"][0]["subjects"][0]["chapters"][0]["name"])
app = get("/app.html").decode("utf-8", "replace")
print("BUILD", "qxmed4" in app)
print("REV NAV", 'data-view="revision"' in app)
print("FORM NAV", 'data-view="formula"' in app)
js = get("/app.js?v=qxmed4").decode("utf-8", "replace")
print("FORMULA OFF", "Formula Cards are no longer" in js)
print("REV MAP", "revision:" in js)
mf = get("/marks-features.js?v=qxmed4").decode("utf-8", "replace")
print("DPP MED BIO", "qxEnsureMedicalDppNav" in mf)
print("NCERT TOOLS", "Diagram Based" in mf)
print("BOOKS LIB", "Recommended for You" in mf)
an = get("/analytics.js?v=qxmed4").decode("utf-8", "replace")
print("AN", "NEET Analytics" in an)

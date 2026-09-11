import urllib.request

def get(url, n=2_000_000):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=90) as r:
        return r.status, r.read(n).decode("utf-8", "replace")

st, html = get("https://www.quantrexacademy.com/app.html")
print("app", st)
print("BUILD37", 'window.QX_BUILD = "qxfix37"' in html)
print("math37", "math-render.js?v=qxfix37" in html)
print("fbjs37", "qx-firebase-bank.js?v=qxfix37" in html)
print("imgjs37", "qx-image-clean.js?v=qxfix37" in html)

for slug in ("formulas.json", "banks/nda.json", "banks/ap_eamcet.json", "banks/jee_main.json", "banks/dpp.json", "banks/kvpy.json"):
    url = "https://www.quantrexacademy.com/data/" + slug + "?v=qxfix37"
    try:
        st, t = get(url, 4_000_000)
        print(
            slug,
            "fb", t.count("firebasestorage.googleapis.com"),
            "gm", t.count("cdn-question-pool.getmarks.app") + t.count("cdn-assets.getmarks.app"),
            "glue", t.count("$$\\mathrm{"),
        )
    except Exception as e:
        print(slug, "ERR", type(e).__name__, e)

# sample firebase figure
st, t = get("https://www.quantrexacademy.com/data/formulas.json?v=qxfix37", 80_000)
idx = t.find("firebasestorage.googleapis.com")
print("formulas_has_fb", idx > 0)
if idx > 0:
    frag = t[idx - 8: idx + 180]
    print("fb_frag", frag[:180])

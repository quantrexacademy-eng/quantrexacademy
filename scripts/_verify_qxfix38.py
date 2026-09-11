import urllib.request

def get(u):
    r = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    return urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace")

h = get("https://www.quantrexacademy.com/app.html")
print("app BUILD38", 'window.QX_BUILD = "qxfix38"' in h)
print("app math38", "math-render.js?v=qxfix38" in h)
print("app typo38", "qx-typography.css?v=qxfix38" in h)
e = get("https://www.quantrexacademy.com/examgoal-test-series.html")
print("eg BUILD38", 'window.QX_BUILD = "qxfix38"' in e)
print("eg math38", "math-render.js?v=qxfix38" in e)
print("eg typo38", "qx-typography.css?v=qxfix38" in e)
print("eg katex css", "katex.min.css" in e)

import urllib.request

def get(u):
    r = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    return urllib.request.urlopen(r, timeout=60).read().decode("utf-8", "replace")

h = get("https://www.quantrexacademy.com/app.html")
print("app39", 'QX_BUILD = "qxfix39"' in h, "math39", "math-render.js?v=qxfix39" in h, "katex1.35", "1.35em" in h)
e = get("https://www.quantrexacademy.com/examgoal-test-series.html")
print("eg39", 'QX_BUILD = "qxfix39"' in e, "math39", "math-render.js?v=qxfix39" in e)

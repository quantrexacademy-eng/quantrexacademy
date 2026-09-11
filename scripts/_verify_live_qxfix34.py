import urllib.request
js = urllib.request.urlopen("https://www.quantrexacademy.com/qx-image-clean.js?v=qxfix34", timeout=40).read().decode("utf-8", "replace")
html = urllib.request.urlopen("https://www.quantrexacademy.com/app.html", timeout=40).read().decode("utf-8", "replace")
print("js_len", len(js))
print("isIrodovFig", js.count("isIrodovFig"))
print("abort_guard", "never abort the stem rewrite" in js)
print("keep_book", "qx-keep-book-figs" in js)
print("local_hcv", "hcv-" in js and "never remap" in js)
print("BUILD34", 'window.QX_BUILD = "qxfix34"' in html)
print("script34", "qx-image-clean.js?v=qxfix34" in html)
print("appjs34", "app.js?v=qxfix34" in html)
req = urllib.request.Request(
    "https://www.quantrexacademy.com/assets/diagrams/qx-book-60eb0a348f239904.png",
    method="HEAD",
)
with urllib.request.urlopen(req, timeout=30) as r:
    print("fig_status", r.status, r.headers.get("Content-Type"), r.headers.get("Content-Length"))

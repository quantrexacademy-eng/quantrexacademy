import urllib.request
html = urllib.request.urlopen("https://www.quantrexacademy.com/app.html", timeout=40).read().decode("utf-8", "replace")
print("BUILD36", 'window.QX_BUILD = "qxfix36"' in html)
print("imgjs", "qx-image-clean.js?v=qxfix36" in html)
print("fbjs", "qx-firebase-bank.js?v=qxfix36" in html)
# bank sample
req = urllib.request.Request(
    "https://www.quantrexacademy.com/data/banks/class_9.json",
    headers={"User-Agent": "Mozilla/5.0"},
)
# smaller bank
for slug in ("iat_iiser.json", "nda.json", "class_9.json"):
    try:
        t = urllib.request.urlopen(
            "https://www.quantrexacademy.com/data/banks/" + slug, timeout=60
        ).read().decode("utf-8", "replace")
        print(slug, "fb", t.count("firebasestorage.googleapis.com"), "gm", t.count("cdn-question-pool.getmarks.app"))
    except Exception as e:
        print(slug, "ERR", e)

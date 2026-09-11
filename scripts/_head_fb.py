import ssl, urllib.request
url = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/questions%2Ffigs%2FNEET%2FDPP-Chemistry%2F1d6b78f2-e4d2-4278-9d3a-08dbe1719df2-image.png?alt=media"
req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
ctx = ssl.create_default_context()
with urllib.request.urlopen(req, timeout=20, context=ctx) as r:
    print(r.status, r.headers.get("Content-Type"), r.headers.get("Content-Length"))

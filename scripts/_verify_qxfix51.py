#!/usr/bin/env python3
import re, ssl, urllib.parse, urllib.request
CTX = ssl.create_default_context()

def get(url, n=80):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Cache-Control": "no-cache"})
    with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
        b = r.read()
        return r.status, r.headers.get("content-type"), len(b), b[:n]

print("app", get("https://www.quantrexacademy.com/app.html?v=qxfix51")[2])
st, ct, n, head = get("https://www.quantrexacademy.com/app.html?v=qxfix51")
text = urllib.request.urlopen(urllib.request.Request("https://www.quantrexacademy.com/app.html", headers={"User-Agent":"Mozilla/5.0","Cache-Control":"no-cache"}), timeout=25, context=CTX).read().decode("utf-8","ignore")
m = re.search(r'QX_BUILD\s*=\s*"([^"]+)"', text)
print("QX_BUILD", m.group(1) if m else "missing")
print("image-clean", "qxfix51" in text)

def fb(folder, name):
    u = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/" + urllib.parse.quote("questions/figs/"+folder+"/"+name, safe="") + "?alt=media"
    st, ct, n, _ = get(u)
    print("FB", folder, name, st, n)

fb("irodov", "qx-irodov-a8dbbffe2c4f0c37.png")
fb("org", "qx-org-c49221e5dad1f07b.png")
fb("pyq/jee_main_2026_watermark_improved", "28S2_o_61_1_1_v2.png")
fb("pyq/jee_main_2026_april_watermarked", "06APRS2__q66_d1.jpg")

# live js
js = urllib.request.urlopen(urllib.request.Request("https://www.quantrexacademy.com/qx-image-clean.js?v=qxfix51", headers={"User-Agent":"Mozilla/5.0"}), timeout=25, context=CTX).read().decode("utf-8","ignore")
print("js irodov firebase", "questions/figs/irodov" in js, "CLEAN_VER", "97" in js[:800] or "CLEAN_VER = 97" in js)
print("js org firebase", "questions/figs/org" in js)

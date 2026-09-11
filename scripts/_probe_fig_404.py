#!/usr/bin/env python3
import json, re, ssl, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CTX = ssl.create_default_context()
UA = {"User-Agent": "Mozilla/5.0", "Referer": "https://www.quantrexacademy.com/"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=25, context=CTX) as r:
            b = r.read(80)
            return r.status, r.headers.get("content-type"), r.headers.get("content-length"), len(b)
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("content-type") if e.headers else None, None, 0
    except Exception as e:
        return None, str(e)[:80], None, 0

raw = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
urls = []
for q in raw["questions"]:
    if "2026" not in str(q.get("source") or ""):
        continue
    blob = str(q.get("q") or "") + " " + str(q.get("solution") or "") + " " + " ".join(map(str, q.get("options") or []))
    for u in re.findall(r'src=["\']([^"\']+)["\']', blob):
        if "firebasestorage" in u and u not in urls:
            urls.append(u)
print("unique fb 2026", len(urls))
ok = fail = 0
for u in urls[:12]:
    st, ct, cl, n = get(u)
    print(st, ct, cl, u.split("%2F")[-1][:80])
    if st == 200:
        ok += 1
    else:
        fail += 1
print("sample ok", ok, "fail", fail)

# local improved
imp = ROOT / "data/_migration/bake_tmp/pyq/jee_main_2026_watermark_improved"
print("local improved", len(list(imp.glob('*.png'))) if imp.exists() else 0)
jm = ROOT / "data/_migration/bake_tmp/pyq/jee_main"
print("local jee_main bake", len(list(jm.glob('*'))) if jm.exists() else 0)

# irodov original
iro = "https://cdn-question-pool.getmarks.app/2026_modules/jee_advanced_physics/AKCR2_1.webp"
print("IRODOV", get(iro))
# broken host form
print("BROKEN", get("https://.app/2026_modules/jee_advanced_physics/AKCR2_1.webp"))

# amine local file exists?
p = ROOT / "assets/diagrams/qx-org-c49221e5dad1f07b.png"
print("amine file", p.exists(), p.stat().st_size if p.exists() else 0)

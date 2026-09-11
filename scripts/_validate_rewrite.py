from pathlib import Path
import json, urllib.request, urllib.parse
ROOT = Path(r"C:\Users\Admin\qx-hosting")
for rel in ["data/formulas.json", "data/banks/ap_eamcet.json", "data/banks/jee_main.json"]:
    p = ROOT / rel
    j = json.loads(p.read_text(encoding="utf-8"))
    kind = type(j).__name__
    n = len(j) if isinstance(j, list) else (len(j.get("questions") or []) if isinstance(j, dict) else 0)
    t = p.read_text(encoding="utf-8", errors="ignore")
    print(rel, kind, "n", n, "fb", t.count("firebasestorage.googleapis.com"), "gm", t.count("cdn-question-pool.getmarks.app") + t.count("cdn-assets.getmarks.app"))

url = (
    "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
    + urllib.parse.quote("questions/figs/modules/ms/bs/Ans Q 1(1).jpg", safe="")
    + "?alt=media"
)
req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        print("modules_HEAD", r.status, r.headers.get("Content-Type"), r.headers.get("Content-Length"))
except Exception as e:
    print("modules_HEAD_ERR", type(e).__name__, e)
print("url", url[:180])

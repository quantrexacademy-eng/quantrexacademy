from pathlib import Path
from collections import Counter
NEED = Path(r"C:\Users\Admin\qx-hosting\data\_migration\selfdep_need_download.txt").read_text(encoding="utf-8").splitlines()
c = Counter()
for u in NEED:
    if "cdn-assets" in u:
        c["assets"] += 1
    elif "cdn-question-pool" in u:
        c["pool"] += 1
        path = u.split("cdn-question-pool.getmarks.app/", 1)[-1]
        top = "/".join(path.split("/")[:2])
        c["pool:" + top] += 1
    elif "quizrr" in u:
        c["quizrr"] += 1
    elif "examgoal" in u:
        c["examgoal"] += 1
    else:
        c["other"] += 1
print(dict(c))
print("--- pool samples ---")
n = 0
for u in NEED:
    if "cdn-question-pool" in u:
        print(u[:180])
        n += 1
        if n >= 15:
            break
print("--- leftover files ---")
import re
CDN = re.compile(r"cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|examgoal\.net")
root = Path(r"C:\Users\Admin\qx-hosting\data")
hits = []
for fp in root.rglob("*.json"):
    if fp.name.startswith("_") or ".bak" in fp.name or "_migration" in str(fp) or "qid_marks" in str(fp) or "clean_shards" in str(fp):
        continue
    try:
        t = fp.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        continue
    if CDN.search(t):
        hits.append((str(fp.relative_to(root)), t.count("cdn-question-pool.getmarks.app") + t.count("cdn-assets.getmarks.app") + t.count("cdn.quizrr.in") + t.count("examgoal.net")))
hits.sort(key=lambda x: -x[1])
print("files_with_cdn", len(hits))
for h in hits[:20]:
    print(" ", h)

# tex glue leftover
GLUE = "$$\\mathrm{"
for name in ("dpp.json", "kvpy.json", "mht_cet.json"):
    p = root / "banks" / name
    t = p.read_text(encoding="utf-8", errors="ignore")
    print(name, "glue", t.count("$$\\mathrm{"))

import json
import re
from collections import Counter
from pathlib import Path

root = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters\6a4ce383c59a7b462185330f")
hosts = Counter()
missing_local = 0
has_img = 0
no_img = 0
samples = []
src_rx = re.compile(r"src=[\"']([^\"']+)[\"']", re.I)
man = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\qx_organic_figure_manifest.json").read_text(encoding="utf-8"))
mp = man.get("map") or {}
bases = {k.split("/")[-1].split("?")[0] for k in mp}
broken = 0
broken_samples = []
for f in root.glob("*.json"):
    d = json.loads(f.read_text(encoding="utf-8"))
    for q in d.get("questions") or []:
        blob = " ".join(
            [str(q.get("q") or ""), str(q.get("solution") or "")]
            + [str(o) for o in (q.get("options") or [])]
        )
        srcs = src_rx.findall(blob)
        if not srcs:
            no_img += 1
            continue
        has_img += 1
        for s in srcs:
            if "https://.app/" in s or "https://cdn-question-pool.app/" in s:
                broken += 1
                if len(broken_samples) < 6:
                    broken_samples.append(s[:180])
            if s.startswith("http"):
                try:
                    hosts[s.split("/")[2]] += 1
                except Exception:
                    hosts["bad"] += 1
            elif s.startswith("/assets"):
                hosts["local"] += 1
            else:
                hosts["other"] += 1
            base = s.split("/")[-1].split("?")[0]
            if "quizrr" in s or "watermarked" in s or "organic_book" in s:
                if base not in bases and s not in mp and s.split("?")[0] not in mp:
                    missing_local += 1
                    if len(samples) < 8:
                        samples.append(s[:180])
print("qs with img", has_img, "without", no_img)
print("hosts", dict(hosts))
print("manifest", len(mp), "unmapped quizrr", missing_local)
print("broken host", broken)
print("UNMAPPED")
for s in samples:
    print(" ", s)
print("BROKEN")
for s in broken_samples:
    print(" ", s)
exist = miss = 0
miss_paths = []
base = Path(r"C:\Users\Admin\qx-hosting")
for v in mp.values():
    p = base / v.lstrip("/").replace("/", "\\")
    if p.exists():
        exist += 1
    else:
        miss += 1
        if len(miss_paths) < 5:
            miss_paths.append(str(p))
print("local exist", exist, "miss", miss, "of", len(mp))
for p in miss_paths:
    print(" missing", p)

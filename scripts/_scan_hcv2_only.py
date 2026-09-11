#!/usr/bin/env python3
from pathlib import Path
import re
ROOT = Path(r"C:\Users\Admin\qx-hosting")
HCV = [
    ("hcv2", ROOT / "data/books/chapters/6a0addba4b032b031e049a36"),
    ("hcv1", ROOT / "data/books/chapters/69f9cc23681eab6d6021a4d1"),
    ("rank", ROOT / "data/books/chapters/68f1ce4cc729e5251bd00430"),
]
SRC = re.compile(r"""src\s*=\s*\\?["']([^"']+)""", re.I)
for name, d in HCV:
    imgs = miss = getmarks = other = 0
    samples = []
    if not d.exists():
        print(name, "NO DIR")
        continue
    for fp in d.glob("*.json"):
        txt = fp.read_text(encoding="utf-8", errors="ignore")
        for raw in SRC.findall(txt):
            u = raw.replace("\\/", "/").split("?")[0].strip().rstrip("\\")
            if not re.search(r"png|jpe?g|webp|gif|svg|diagrams|getmarks|quizrr", u, re.I):
                continue
            imgs += 1
            if "getmarks" in u.lower() or "quizrr" in u.lower():
                getmarks += 1
                if len(samples) < 5:
                    samples.append(("cdn", u[:140]))
                continue
            if "/assets/" in u or u.startswith("assets/"):
                p = ROOT / u.lstrip("/")
                if not p.exists() or p.stat().st_size < 80:
                    miss += 1
                    if len(samples) < 8:
                        samples.append(("miss", u, p.exists(), p.stat().st_size if p.exists() else 0))
            else:
                other += 1
                if len(samples) < 8:
                    samples.append(("other", u[:140]))
    print(name, "imgs", imgs, "missing", miss, "cdn", getmarks, "other", other)
    for s in samples:
        print(" ", s)

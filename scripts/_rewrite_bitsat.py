from pathlib import Path
import hashlib, re
ROOT = Path(r"C:\Users\Admin\qx-hosting")
d = ROOT / "data/books/chapters/69736c8362b916d85e52cd1b"
OUT = ROOT / "assets" / "diagrams"
rx = re.compile(r"https?://cdn-question-pool\.getmarks\.app[^\"'\\>\s]+", re.I)
rew = hit = miss = 0
for fp in d.glob("*.json"):
    txt = fp.read_text(encoding="utf-8", errors="ignore")
    orig = txt
    for u in set(rx.findall(txt)):
        raw = u.replace("\\/", "/").rstrip("\\").split("?")[0]
        h = hashlib.sha1(raw.encode()).hexdigest()[:16]
        dest = OUT / f"qx-book-{h}.png"
        loc = "/assets/diagrams/" + dest.name
        if dest.exists() and dest.stat().st_size > 80:
            txt = txt.replace(u, loc)
            txt = txt.replace(u.replace("/", "\\/"), loc)
            hit += 1
        else:
            miss += 1
    if txt != orig:
        fp.write_text(txt, encoding="utf-8")
        rew += 1
left = 0
for fp in d.glob("*.json"):
    left += len(rx.findall(fp.read_text(encoding="utf-8", errors="ignore")))
print({"rewrittenFiles": rew, "replaced": hit, "noFile": miss, "left": left})

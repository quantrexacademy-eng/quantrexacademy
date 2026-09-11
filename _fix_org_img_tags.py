from pathlib import Path

p = Path(r"C:\Users\Admin\qx-hosting\data\books\chapters\6a4ce383c59a7b462185330f")
n = 0
for f in p.glob("*.json"):
    t = f.read_text(encoding="utf-8")
    t2 = t.replace(" / class=", " class=")
    if t2 != t:
        f.write_text(t2, encoding="utf-8")
        n += 1
print("fixed files", n)

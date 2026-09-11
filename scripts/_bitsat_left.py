from pathlib import Path
import re
ROOT = Path(r"C:\Users\Admin\qx-hosting")
d = ROOT / "data/books/chapters/69736c8362b916d85e52cd1b"
rx = re.compile(r"https?://cdn-question-pool\.getmarks\.app[^\"'\\]+")
n = 0
if d.exists():
    for fp in d.glob("*.json"):
        n += len(rx.findall(fp.read_text(encoding="utf-8", errors="ignore")))
print("bitsat getmarks leftover", n)

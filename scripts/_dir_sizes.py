#!/usr/bin/env python3
from pathlib import Path
roots = [
    Path(r"C:\Users\Admin\qx-hosting\data\_migration"),
    Path(r"C:\Users\Admin\qx-hosting\data\qid_marks"),
    Path(r"C:\Users\Admin\qx-hosting\data\banks"),
    Path(r"C:\Users\Admin\qx-hosting\assets\diagrams"),
    Path(r"C:\Users\Admin\qx-hosting\node_modules"),
    Path(r"C:\Users\Admin\qx-hosting\data\tests"),
    Path(r"C:\Users\Admin\qx-hosting\data\books"),
]
for d in roots:
    if not d.exists():
        print("missing", d)
        continue
    n = 0
    s = 0
    for p in d.rglob("*"):
        if p.is_file():
            try:
                s += p.stat().st_size
                n += 1
            except OSError:
                pass
    print(f"{s/1e9:.2f} GB  {n:7d} files  {d}")

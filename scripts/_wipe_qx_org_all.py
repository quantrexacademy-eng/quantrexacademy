#!/usr/bin/env python3
"""Pale/blue Marks wipe on all baked organic figures. Never eat ink."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting\scripts")))
from _wipe_marks_permanent import load_rgb, save_rgb, process_figure, DIAG

files = sorted(DIAG.glob("qx-org-*.png"))
print("qx-org", len(files), flush=True)
n = 0
for i, p in enumerate(files, 1):
    try:
        arr = load_rgb(p)
        out = process_figure(arr)
        save_rgb(out, p)
        n += 1
    except Exception as e:
        print("fail", p.name, e, flush=True)
    if i % 400 == 0 or i == len(files):
        print(f"  {i}/{len(files)} wiped={n}", flush=True)
print("done", n, flush=True)

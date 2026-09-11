from pathlib import Path
import json, sys
sys.path.insert(0, str(Path(r"C:\Users\Admin\qx-hosting\scripts")))
from _resolve_everything import MAP_FILE, TMP, storage_rel
blob = json.loads(MAP_FILE.read_text(encoding="utf-8"))
skip_sub = ("getmarks-assets", "modules/ms", "without_watermark/AP EAMCET")
for u in blob.get("map") or {}:
    rel = storage_rel(u)
    tail = rel.replace("questions/figs/", "").replace("\\", "/")
    if any(s in tail for s in skip_sub):
        continue
    src = TMP / tail
    if src.exists() and src.stat().st_size > 80:
        dest = "gs://quantrexacademy-app.firebasestorage.app/" + rel.replace("\\", "/")
        print(str(src) + "\t" + dest)

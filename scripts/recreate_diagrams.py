#!/usr/bin/env python3
"""
Aggressive watermark removal / recreation for flagged diagram images.
Saves 300 DPI PNG to manifest or keeps in recreate queue for manual review.
"""
from __future__ import annotations

import argparse
import importlib.util
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "data" / "qx_clean_manifest.json"
REVIEW = ROOT / "data" / "qx_image_review.json"
RECREATE = ROOT / "data" / "qx_image_recreate.json"
WM_RESIDUE_MAX = 0.018

_spec = importlib.util.spec_from_file_location("clean_mod", ROOT / "scripts" / "clean_diagram_images.py")
clean_mod = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(clean_mod)


def aggressive_clean(flat, w, h, px):
    """Extra passes for stubborn center MARKS / Vedantu overlays."""
    for _ in range(4):
        for y in range(h):
            for x in range(w):
                if not clean_mod.safe_overlay_remove(flat, w, h, x, y):
                    continue
                clean_mod.paint_bg(flat, w, h, x, y)
    for y in range(int(h * 0.04), int(h * 0.96)):
        for x in range(int(w * 0.04), int(w * 0.96)):
            r, g, b = flat[y * w + x]
            if not clean_mod.is_removable_wm(r, g, b):
                continue
            if clean_mod.is_likely_ink(r, g, b):
                continue
            if (r + g + b) / 3 < 108:
                continue
            clean_mod.paint_bg(flat, w, h, x, y)
    from PIL import Image
    new_px = [(*flat[i], px[i][3]) for i in range(len(px))]
    out = Image.new("RGBA", (w, h))
    out.putdata(new_px)
    return out.convert("RGB")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=50)
    args = ap.parse_args()

    review = clean_mod.load_json(REVIEW, {"flagged": [], "reasons": {}})
    manifest = clean_mod.load_json(MANIFEST, {"version": 1, "map": {}, "processed": 0})
    recreate = clean_mod.load_json(RECREATE, {"queue": [], "reasons": {}})
    flagged_set = set(review.get("flagged", []))
    todo = [u for u in review.get("flagged", []) if u not in manifest.get("map", {})][: args.limit]

    print(f"recreate flagged={len(flagged_set)} this_run={len(todo)}")
    ok = fail = 0
    for i, url in enumerate(todo, 1):
        try:
            raw = clean_mod.fetch(url)
            from PIL import Image
            import io
            im = Image.open(io.BytesIO(raw))
            rgb = im.convert("RGBA")
            w, h = rgb.size
            px = list(rgb.getdata())
            flat = [(p[0], p[1], p[2]) for p in px]
            before_wm = clean_mod.count_wm(flat, w, h)
            before_ink = clean_mod.count_ink(flat, w, h)
            cleaned = aggressive_clean(flat, w, h, px)
            flat2 = list(cleaned.getdata())
            flat2 = [(p[0], p[1], p[2]) for p in flat2]
            after_wm = clean_mod.count_wm(flat2, w, h)
            after_ink = clean_mod.count_ink(flat2, w, h)
            residue = after_wm / max(w * h, 1)
            damaged = after_ink < max(40, before_ink * 0.2)
            if damaged or residue > WM_RESIDUE_MAX:
                entry = {"url": url, "residue": residue, "reason": review["reasons"].get(url, "")}
                if url not in recreate["queue"]:
                    recreate["queue"].append(url)
                recreate["reasons"][url] = f"recreate_needed residue={residue:.4f}"
                fail += 1
                print(f"[{i}/{len(todo)}] QUEUE {url} residue={residue:.4f}")
            else:
                rel = clean_mod.rel_path(url)
                dest = ROOT / rel
                dest.parent.mkdir(parents=True, exist_ok=True)
                cleaned.save(dest, format="PNG", optimize=True, dpi=(300, 300))
                manifest["map"][url] = rel.replace("\\", "/")
                review["flagged"] = [u for u in review["flagged"] if u != url]
                review["reasons"].pop(url, None)
                recreate["queue"] = [u for u in recreate.get("queue", []) if u != url]
                recreate["reasons"].pop(url, None)
                ok += 1
                print(f"[{i}/{len(todo)}] OK {rel} wm {before_wm}->{after_wm}")
        except Exception as e:
            recreate["reasons"][url] = f"recreate error: {e}"
            if url not in recreate["queue"]:
                recreate["queue"].append(url)
            fail += 1
            print(f"[{i}/{len(todo)}] ERR {url} — {e}")

    manifest["version"] = clean_mod.CLEAN_VER
    manifest["processed"] = len(manifest.get("map", {}))
    manifest["updated"] = int(time.time())
    review["count"] = len(review.get("flagged", []))
    recreate["count"] = len(recreate.get("queue", []))
    clean_mod.save_json(MANIFEST, manifest)
    clean_mod.save_json(REVIEW, review)
    clean_mod.save_json(RECREATE, recreate)
    print(f"done ok={ok} queue={fail}")


if __name__ == "__main__":
    main()
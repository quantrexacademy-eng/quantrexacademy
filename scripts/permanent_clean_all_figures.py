# -*- coding: utf-8 -*-
"""
Permanently replace Marks/Quizrr pool figures with clean local assets.

- Download each unique CDN figure once
- Nuclear MARKS wipe + digital-book multi-tone color
- Save to assets/qx-figures/perm/qx-perm-{hash}.png
- Rewrite data/banks/*.json to use local paths only
- Never load dirty CDN at runtime after patch

Usage:
  python scripts/permanent_clean_all_figures.py
  python scripts/permanent_clean_all_figures.py --limit 500
  python scripts/permanent_clean_all_figures.py --patch-only
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BANKS = ROOT / "data" / "banks"
URL_LIST = ROOT / "scripts" / "_all_pool_urls.json"
OUT_DIR = ROOT / "assets" / "qx-figures" / "perm"
SRC_DIR = ROOT / "assets" / "diagrams" / "perm-src"
MANIFEST = ROOT / "data" / "qx_perm_figure_manifest.json"
LOG = ROOT / "scripts" / "_perm_clean_log.json"
PREFIX = "qx-perm"
CDN = "https://cdn-question-pool.getmarks.app/"


def fix_url(url: str) -> str:
    u = str(url or "").strip()
    u = re.sub(r"https?://\.app/", CDN, u, flags=re.I)
    return u


def short_id(url: str) -> str:
    return hashlib.sha1(fix_url(url).encode("utf-8")).hexdigest()[:16]


def download(url: str, dest: Path) -> bool:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 80:
        return True
    fixed = fix_url(url)
    req = urllib.request.Request(
        fixed,
        headers={
            "User-Agent": "Mozilla/5.0 QuantrexPermClean/1.0",
            "Referer": "https://web.getmarks.app/",
            "Accept": "image/*,*/*",
        },
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=50) as r:
                dest.write_bytes(r.read())
            return dest.stat().st_size > 80
        except Exception as e:
            time.sleep(0.6 * (attempt + 1))
            if attempt == 2:
                print("  DL fail", e)
    return False


def permanent_clean(im: Image.Image) -> Image.Image:
    """Remove ALL gray watermarks permanently; multi-tone teal book style for line-art."""
    im = im.convert("RGBA")
    a = np.asarray(im).astype(np.float32)
    r, g, b, al = a[:, :, 0], a[:, :, 1], a[:, :, 2], a[:, :, 3]
    t = np.clip(al / 255.0, 0, 1)
    rr = r * t + 255 * (1 - t)
    gg = g * t + 255 * (1 - t)
    bb = b * t + 255 * (1 - t)
    lum = 0.299 * rr + 0.587 * gg + 0.114 * bb
    chroma = np.maximum(np.maximum(rr, gg), bb) - np.minimum(np.minimum(rr, gg), bb)

    # Real color (digital-book organic) keep
    color_keep = (chroma >= 28) & (lum < 245)
    # Dark structure
    ink = (lum <= 95) | color_keep
    near_gray = (np.abs(rr - gg) < 52) & (np.abs(gg - bb) < 56) & (np.abs(rr - bb) < 58)

    out = np.stack([rr, gg, bb], axis=2)
    # Bleach MARKS mid-gray completely
    wm = (~ink) & near_gray & (lum > 100) & (lum < 248)
    pale = (~ink) & (lum > 185) & (chroma < 40)
    out[wm | pale] = 255

    # For grayscale line art → book multi-tone teal/blue (not pure black)
    mean_chroma = float(chroma[(al > 40) & (lum < 250)].mean()) if np.any((al > 40) & (lum < 250)) else 0
    if mean_chroma < 24:
        gray = out.mean(axis=2)
        result = np.full_like(out, 255)
        # deep teal bonds
        m0 = gray < 70
        m1 = (gray >= 70) & (gray < 110)
        m2 = (gray >= 110) & (gray < 150)
        m3 = (gray >= 150) & (gray < 190)
        m4 = (gray >= 190) & (gray < 230)
        result[m0] = [15, 90, 110]
        result[m1] = [13, 120, 140]
        result[m2] = [30, 80, 170]
        result[m3] = [55, 100, 190]
        result[m4] = [90, 130, 200]
        # keep pure white paper
        result[gray >= 230] = 255
        # restore real color if any slipped through
        result[color_keep] = out[color_keep]
        out = result
    else:
        out[ink] = np.stack([rr, gg, bb], axis=2)[ink]

    rgb = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGB")
    # tight crop
    arr = np.asarray(rgb)
    lum2 = arr.mean(axis=2)
    ys, xs = np.where(lum2 < 248)
    if len(xs) > 30:
        pad = 24
        x0 = max(0, int(xs.min()) - pad)
        x1 = min(rgb.width, int(xs.max()) + pad + 1)
        y0 = max(0, int(ys.min()) - pad)
        y1 = min(rgb.height, int(ys.max()) + pad + 1)
        rgb = rgb.crop((x0, y0, x1, y1))
    # pad white
    w, h = rgb.size
    canvas = Image.new("RGB", (w + 32, h + 32), (255, 255, 255))
    canvas.paste(rgb, (16, 16))
    # max side 1400
    mw, mh = canvas.size
    ms = max(mw, mh)
    if ms > 1400:
        s = 1400 / ms
        canvas = canvas.resize((int(mw * s), int(mh * s)), Image.Resampling.LANCZOS)
    return canvas


def process_url(url: str, force: bool = False) -> dict | None:
    sid = short_id(url)
    fixed = fix_url(url)
    out = OUT_DIR / f"{PREFIX}-{sid}.png"
    if out.exists() and out.stat().st_size > 200 and not force:
        return {
            "id": sid,
            "url": fixed,
            "clean": f"/assets/qx-figures/perm/{PREFIX}-{sid}.png",
            "bytes": out.stat().st_size,
            "skipped": True,
        }
    ext = Path(fixed.rsplit("?", 1)[0]).suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    src = SRC_DIR / f"{sid}{ext}"
    if not download(fixed, src):
        return None
    try:
        im = Image.open(src)
        cleaned = permanent_clean(im)
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        cleaned.save(out, "PNG", optimize=True)
        return {
            "id": sid,
            "url": fixed,
            "clean": f"/assets/qx-figures/perm/{PREFIX}-{sid}.png",
            "bytes": out.stat().st_size,
            "w": cleaned.width,
            "h": cleaned.height,
        }
    except Exception as e:
        print("  process fail", e)
        return None


def collect_urls() -> list[str]:
    if URL_LIST.exists():
        return [fix_url(u) for u in json.loads(URL_LIST.read_text(encoding="utf-8"))]
    re_url = re.compile(r"https?://[^\"'\\\s>]+\.(?:png|jpg|jpeg|webp)", re.I)
    seen = set()
    out = []
    for f in BANKS.glob("*.json"):
        s = f.read_text(encoding="utf-8")
        for m in re_url.finditer(s):
            u = fix_url(m.group(0))
            if re.search(r"cdn-question-pool|cdn\.quizrr|/pyq/", u, re.I):
                if u not in seen:
                    seen.add(u)
                    out.append(u)
    return out


def patch_banks(url_to_clean: dict[str, str]) -> int:
    """Replace CDN urls in all bank JSON with permanent local clean paths."""
    n = 0
    re_url = re.compile(r"https?://[^\"'\\\s>]+\.(?:png|jpg|jpeg|webp)", re.I)
    for f in BANKS.glob("*.json"):
        text = f.read_text(encoding="utf-8")
        original = text
        # also broken host form
        text2 = text

        def repl(m: re.Match) -> str:
            nonlocal n
            raw = m.group(0)
            fixed = fix_url(raw)
            clean = url_to_clean.get(fixed) or url_to_clean.get(raw)
            if clean:
                n += 1
                return clean + "?v=perm1"
            # broken host variant
            if "://.app/" in raw:
                fixed2 = fix_url(raw)
                clean2 = url_to_clean.get(fixed2)
                if clean2:
                    n += 1
                    return clean2 + "?v=perm1"
            return raw

        text2 = re_url.sub(repl, text2)
        # also replace remaining .app host
        text2 = re.sub(
            r"https?://\.app/([^\"'\\\s>]+)",
            lambda m: url_to_clean.get(CDN + m.group(1), m.group(0)),
            text2,
        )
        if text2 != original:
            f.write_text(text2, encoding="utf-8")
    return n


def load_manifest_map() -> dict[str, str]:
    if not MANIFEST.exists():
        return {}
    man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    m = {}
    for f in man.get("figures") or []:
        if f.get("url") and f.get("clean"):
            m[fix_url(f["url"])] = f["clean"]
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=0, help="0 = all")
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--patch-only", action="store_true")
    args = ap.parse_args()

    urls = collect_urls()
    print(f"Total unique pool URLs: {len(urls)}")
    if args.limit:
        batch = urls[args.offset : args.offset + args.limit]
    else:
        batch = urls[args.offset :]
    print(f"Batch: offset={args.offset} count={len(batch)}")

    url_map = load_manifest_map()
    figures = list(json.loads(MANIFEST.read_text(encoding="utf-8")).get("figures") or []) if MANIFEST.exists() else []
    by_id = {f.get("id"): f for f in figures}

    log = {"ok": 0, "skip": 0, "fail": 0, "fails": []}
    if not args.patch_only:
        SRC_DIR.mkdir(parents=True, exist_ok=True)
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        for i, url in enumerate(batch, 1):
            print(f"[{i}/{len(batch)}] {short_id(url)}")
            r = process_url(url, force=args.force)
            if not r:
                log["fail"] += 1
                log["fails"].append(url[:120])
                continue
            if r.get("skipped"):
                log["skip"] += 1
            else:
                log["ok"] += 1
            by_id[r["id"]] = {
                "id": r["id"],
                "url": r["url"],
                "clean": r["clean"],
                "bytes": r.get("bytes", 0),
                "w": r.get("w", 0),
                "h": r.get("h", 0),
            }
            url_map[r["url"]] = r["clean"]
            if i % 50 == 0:
                man = {"version": 1, "count": len(by_id), "figures": list(by_id.values())}
                MANIFEST.write_text(json.dumps(man, indent=2), encoding="utf-8")
                LOG.write_text(json.dumps(log, indent=2), encoding="utf-8")
                print("  checkpoint", len(by_id), log)

        man = {"version": 1, "count": len(by_id), "figures": list(by_id.values())}
        MANIFEST.write_text(json.dumps(man, indent=2), encoding="utf-8")
        LOG.write_text(json.dumps(log, indent=2), encoding="utf-8")
        print("Process DONE", log)

    # Always patch banks from full manifest
    url_map = load_manifest_map()
    print(f"Patching banks with {len(url_map)} mappings…")
    n = patch_banks(url_map)
    print("Bank replacements", n)
    print("Permanent clean assets in", OUT_DIR)
    return 0 if log["fail"] == 0 or args.patch_only else 0


if __name__ == "__main__":
    raise SystemExit(main())

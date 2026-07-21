# -*- coding: utf-8 -*-
"""
AI-redraw PYQ chemistry figures as original clean line art (no MARKS watermark).
Uses OpenAI Images API (gpt-image-1) with source figure as reference via vision+edit.

Security: OPENAI_API_KEY from env or local .env (never commit .env).

Usage:
  python scripts/ai_redraw_figures.py --topic alcohol-prep --limit 5
  python scripts/ai_redraw_figures.py --topic alcohol-prep --limit 5 --deploy
"""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "assets" / "diagrams" / "alcohol-prep-src"
OUT_DIR = ROOT / "assets" / "qx-figures" / "alcohol-prep"
MANIFEST = ROOT / "data" / "qx_alcohol_prep_figure_manifest.json"
SCAN = ROOT / "scripts" / "_alcohol_prep_figs.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
LOG = ROOT / "scripts" / "_ai_redraw_log.json"
PREFIX = "qx-alc-prep"
CDN = "https://cdn-question-pool.getmarks.app/"

PROMPT = (
    "Redraw this organic chemistry educational figure as a brand-new clean original "
    "textbook illustration for JEE students. "
    "Requirements: pure white background; pure black lines and text only; "
    "same molecules, bonds, arrows, reagents, labels, and educational meaning; "
    "no watermark, no MARKS logo, no website chrome, no decorative borders; "
    "sharp vector-like line art; high contrast; neat spacing; professional exam style. "
    "Do not change chemistry. Output only the diagram."
)


def load_dotenv():
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k, v = k.strip(), v.strip().strip('"').strip("'")
        if k and k not in os.environ:
            os.environ[k] = v


def api_key() -> str:
    load_dotenv()
    key = os.environ.get("OPENAI_API_KEY", "").strip()
    if not key:
        raise SystemExit("OPENAI_API_KEY missing. Put it in quantrexacademy/.env (gitignored).")
    return key


def fix_url(url: str) -> str:
    u = str(url or "").strip()
    u = re.sub(r"^https?://\.app/", CDN, u, flags=re.I)
    return u


def short_id(url: str) -> str:
    return hashlib.sha1(fix_url(url).encode("utf-8")).hexdigest()[:12]


def http_json(method: str, url: str, body: dict | None = None, timeout: int = 180) -> dict:
    data = None
    headers = {
        "Authorization": f"Bearer {api_key()}",
        "Content-Type": "application/json",
        "User-Agent": "QuantrexFigureRedraw/1.0",
    }
    if body is not None:
        data = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code}: {err[:500]}") from e


def download(url: str, dest: Path) -> bool:
    if dest.exists() and dest.stat().st_size > 40:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    fixed = fix_url(url)
    req = urllib.request.Request(fixed, headers={"User-Agent": "QuantrexFigureRedraw/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            dest.write_bytes(r.read())
        return dest.stat().st_size > 40
    except Exception as e:
        print("  DL fail", e)
        return False


def b64_image(path: Path) -> str:
    return base64.standard_b64encode(path.read_bytes()).decode("ascii")


def mime_for(path: Path) -> str:
    ext = path.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        return "image/jpeg"
    if ext == ".webp":
        return "image/webp"
    if ext == ".gif":
        return "image/gif"
    return "image/png"


def redraw_with_images_edits(src: Path) -> bytes | None:
    """Use OpenAI Images edits if available; fallback to generations from text description."""
    # Prefer responses API with image input + image generation tool when available.
    # Strategy 1: gpt-image-1 edits via multipart is complex in pure urllib —
    # use base64 data URL in responses API instead.
    data_url = f"data:{mime_for(src)};base64,{b64_image(src)}"
    body = {
        "model": "gpt-4.1-mini",
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Describe this chemistry figure precisely for redrawing: "
                            "all structures, atoms, bonds, arrows, reagents, labels, layout. "
                            "Then I will generate a clean redraw. Be exact about connectivity."
                        ),
                    },
                    {"type": "input_image", "image_url": data_url},
                ],
            }
        ],
    }
    try:
        desc = http_json("POST", "https://api.openai.com/v1/responses", body, timeout=120)
    except Exception as e:
        print("  vision fail", e)
        desc = None

    description = ""
    if desc:
        # Extract text from responses API
        for item in desc.get("output") or []:
            if item.get("type") == "message":
                for c in item.get("content") or []:
                    if c.get("type") in ("output_text", "text") and c.get("text"):
                        description += c["text"] + "\n"
        if not description and isinstance(desc.get("output_text"), str):
            description = desc["output_text"]

    gen_prompt = PROMPT
    if description.strip():
        gen_prompt = (
            PROMPT
            + "\n\nExact content to redraw (preserve chemistry):\n"
            + description.strip()[:3500]
        )

    # Image generation
    gen_body = {
        "model": "gpt-image-1",
        "prompt": gen_prompt,
        "size": "1024x1024",
        "quality": "high",
    }
    try:
        out = http_json("POST", "https://api.openai.com/v1/images/generations", gen_body, timeout=180)
    except Exception as e:
        print("  gen fail, trying dall-e-3", e)
        gen_body = {
            "model": "dall-e-3",
            "prompt": gen_prompt[:3800],
            "size": "1024x1024",
            "response_format": "b64_json",
            "quality": "standard",
        }
        try:
            out = http_json("POST", "https://api.openai.com/v1/images/generations", gen_body, timeout=180)
        except Exception as e2:
            print("  gen fail2", e2)
            return None

    data = (out.get("data") or [None])[0]
    if not data:
        return None
    if data.get("b64_json"):
        return base64.standard_b64decode(data["b64_json"])
    if data.get("url"):
        with urllib.request.urlopen(data["url"], timeout=60) as r:
            return r.read()
    return None


def postprocess_png(raw: bytes, dest: Path) -> bool:
    """Optional black-ink cleanup + tight crop for exam clarity."""
    try:
        import numpy as np
        from PIL import Image
        from io import BytesIO

        im = Image.open(BytesIO(raw)).convert("RGBA")
        arr = np.asarray(im).astype(np.float32)
        r, g, b, a = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2], arr[:, :, 3]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)
        bg = ((lum >= 235) & (chroma < 28)) | (a < 12)
        ink = (lum < 200) | (chroma > 40)
        ink[bg] = False
        out = np.full_like(arr, 255)
        out[ink, 0] = 0
        out[ink, 1] = 0
        out[ink, 2] = 0
        out[ink, 3] = 255
        out[~ink, 3] = 255
        rgb = Image.fromarray(out.astype(np.uint8), "RGBA").convert("RGB")
        # tight crop
        a2 = np.asarray(rgb)
        lum2 = 0.299 * a2[:, :, 0] + 0.587 * a2[:, :, 1] + 0.114 * a2[:, :, 2]
        ys, xs = np.where(lum2 < 250)
        if len(xs):
            pad = 18
            x0, x1 = max(0, xs.min() - pad), min(rgb.width, xs.max() + pad + 1)
            y0, y1 = max(0, ys.min() - pad), min(rgb.height, ys.max() + pad + 1)
            rgb = rgb.crop((x0, y0, x1, y1))
        dest.parent.mkdir(parents=True, exist_ok=True)
        rgb.save(dest, "PNG", optimize=True)
        return True
    except Exception as e:
        print("  postprocess fail, save raw", e)
        dest.write_bytes(raw)
        return dest.stat().st_size > 40


def load_urls(topic: str) -> list[str]:
    if topic == "alcohol-prep":
        if SCAN.exists():
            scan = json.loads(SCAN.read_text(encoding="utf-8"))
            return [u["url"] for u in scan.get("urls") or []]
        if MANIFEST.exists():
            man = json.loads(MANIFEST.read_text(encoding="utf-8"))
            return [f["url"] for f in man.get("figures") or []]
    raise SystemExit(f"Unknown topic {topic}")


def ensure_src(url: str) -> Path | None:
    sid = short_id(url)
    for ext in (".png", ".jpg", ".jpeg", ".webp", ".PNG", ".JPG"):
        p = SRC_DIR / f"{sid}{ext}"
        if p.exists() and p.stat().st_size > 40:
            return p
    # download
    fixed = fix_url(url)
    ext = Path(fixed.rsplit("?", 1)[0]).suffix.lower() or ".png"
    if ext not in (".png", ".jpg", ".jpeg", ".webp", ".gif"):
        ext = ".png"
    dest = SRC_DIR / f"{sid}{ext}"
    if download(fixed, dest):
        return dest
    return None


def update_manifest_and_overrides(results: list[dict]):
    if MANIFEST.exists():
        man = json.loads(MANIFEST.read_text(encoding="utf-8"))
    else:
        man = {"topic": "Preparation and Properties of Alcohols", "figures": []}
    by_id = {f.get("id"): f for f in man.get("figures") or []}
    for r in results:
        by_id[r["id"]] = {
            "url": r["url"],
            "urlRx": re.escape(r["url"].rstrip("/").rsplit("/", 1)[-1]),
            "clean": r["clean"],
            "w": r.get("w", 0),
            "h": r.get("h", 0),
            "id": r["id"],
            "aiRedraw": True,
        }
    man["figures"] = list(by_id.values())
    man["count"] = len(man["figures"])
    MANIFEST.write_text(json.dumps(man, indent=2, ensure_ascii=False), encoding="utf-8")

    ov = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = ov.get("rules") or []
    # drop old alc-prep rules then re-add all from manifest
    rules = [r for r in rules if not str(r.get("clean", "")).startswith(f"/assets/qx-figures/alcohol-prep/{PREFIX}-")]
    for f in man["figures"]:
        rules.append({"urlRx": f["urlRx"], "clean": f["clean"]})
    ov["rules"] = rules
    ov["version"] = int(ov.get("version") or 1) + 1
    OVERRIDES.write_text(json.dumps(ov, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("overrides version", ov["version"], "alc rules", sum(1 for r in rules if "alcohol-prep" in str(r.get("clean", ""))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", default="alcohol-prep")
    ap.add_argument("--limit", type=int, default=5, help="Max figures this run (review in batches)")
    ap.add_argument("--offset", type=int, default=0)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    urls = load_urls(args.topic)
    batch = urls[args.offset : args.offset + args.limit]
    print(f"AI redraw topic={args.topic} batch {args.offset}+{len(batch)} / {len(urls)}")
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SRC_DIR.mkdir(parents=True, exist_ok=True)

    results = []
    log = {"ok": [], "fail": []}
    for i, url in enumerate(batch, 1):
        sid = short_id(url)
        out_png = OUT_DIR / f"{PREFIX}-{sid}.png"
        print(f"[{i}/{len(batch)}] {sid} {url.rsplit('/',1)[-1][:60]}")
        if out_png.exists() and out_png.stat().st_size > 200 and not args.force:
            print("  skip existing")
            results.append({"id": sid, "url": fix_url(url), "clean": f"/assets/qx-figures/alcohol-prep/{PREFIX}-{sid}.png"})
            continue
        src = ensure_src(url)
        if not src:
            log["fail"].append({"url": url, "err": "download"})
            continue
        try:
            raw = redraw_with_images_edits(src)
            if not raw:
                log["fail"].append({"url": url, "err": "no image"})
                continue
            if not postprocess_png(raw, out_png):
                log["fail"].append({"url": url, "err": "save"})
                continue
            print("  saved", out_png.name, out_png.stat().st_size)
            results.append({"id": sid, "url": fix_url(url), "clean": f"/assets/qx-figures/alcohol-prep/{PREFIX}-{sid}.png"})
            log["ok"].append(sid)
            time.sleep(1.2)
        except Exception as e:
            print("  ERR", e)
            log["fail"].append({"url": url, "err": str(e)[:200]})

    if results:
        update_manifest_and_overrides(results)
    LOG.write_text(json.dumps(log, indent=2), encoding="utf-8")
    print("DONE ok", len(log["ok"]), "fail", len(log["fail"]))
    print("Review files in", OUT_DIR)
    print("Then run bank patch + deploy when happy.")
    return 0 if log["ok"] or results else 1


if __name__ == "__main__":
    sys.exit(main())

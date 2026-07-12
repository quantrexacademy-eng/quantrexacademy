"""
Site-wide figure pipeline — quizrr + getmarks + broken .app URLs.
Patches JSON/JS under data/, marks_data/, clean_shards; resumable manifest.
"""
import hashlib
import json
import re
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageEnhance

ROOT = Path(r"E:\quantrexacademy")
OUT = ROOT / "assets" / "diagrams"
SRC = ROOT / "assets" / "diagrams" / "site-src"
MANIFEST = ROOT / "data" / "qx_site_figure_manifest.json"
OVERRIDES = ROOT / "data" / "qx_figure_overrides.json"
LOGO_SRC = ROOT / "assets" / "quantrex-academy-brand.png"
LOGO_WM = ROOT / "assets" / "quantrex-academy-brand-wm.png"

SCAN_ROOTS = [
    ROOT / "data" / "clean_shards",
    ROOT / "data",
]
SCAN_FILES = [ROOT / "data.js"]
URL_MANIFEST_GLOB = "urls_w*.json"

URL_PATTERNS = [
    re.compile(r"https://cdn\.quizrr\.in/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I),
    re.compile(r"https://cdn-question-pool\.getmarks\.app/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I),
    re.compile(r"https://\.app/[^\"'\s>]+\.(?:png|jpg|jpeg|webp|gif)", re.I),
]
LOCAL_SKIP_RE = re.compile(r"^/assets/diagrams/", re.I)
GETMARKS_CDN = "https://cdn-question-pool.getmarks.app/"

PALETTE = [
    [37, 99, 235], [220, 38, 38], [15, 118, 110], [124, 58, 237],
    [234, 88, 12], [22, 163, 74], [219, 39, 119], [202, 138, 4],
]
LOGO_OPACITY = 0.38
FALLBACK_OPACITY = 0.32
DIAG_COVERAGE = 0.68
ROT_DEG = 35


def normalize_url(url: str) -> str:
    u = url.strip()
    if u.startswith("https://.app/"):
        return GETMARKS_CDN + u[len("https://.app/") :]
    return u


def url_hash(url: str) -> str:
    return hashlib.sha1(normalize_url(url).encode("utf-8")).hexdigest()[:16]


def local_name(url: str) -> str:
    return f"qx-site-{url_hash(url)}.png"


def local_path(url: str) -> Path:
    return OUT / local_name(url)


def load_manifest():
    if MANIFEST.exists():
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    return {"version": 1, "map": {}}


def save_manifest(m):
    MANIFEST.write_text(json.dumps(m, indent=2), encoding="utf-8")


def extract_urls(blob: str):
    found = set()
    for pat in URL_PATTERNS:
        found.update(pat.findall(blob))
    return found


def collect_urls():
    urls = set()
    shard_dir = ROOT / "data" / "clean_shards"
    if shard_dir.exists():
        for f in shard_dir.glob(URL_MANIFEST_GLOB):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                urls.update(data.get("urls", []))
            except Exception:
                pass
    for root in SCAN_ROOTS:
        if not root.exists():
            continue
        for f in root.rglob("*"):
            if f.suffix.lower() not in (".json", ".js"):
                continue
            if f.name.startswith("urls_w"):
                continue
            try:
                blob = f.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            urls.update(extract_urls(blob))
    for f in SCAN_FILES:
        if not f.exists():
            continue
        try:
            blob = f.read_text(encoding="utf-8", errors="ignore")
            urls.update(extract_urls(blob))
        except Exception:
            pass
    return sorted(u for u in urls if not LOCAL_SKIP_RE.match(u))


def download(url: str, dest: Path, retries=3):
    cdn = normalize_url(url)
    if dest.exists() and dest.stat().st_size > 200:
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    for i in range(retries):
        try:
            req = urllib.request.Request(cdn, headers={"User-Agent": "QuantrexSiteFigureBot/1.0"})
            with urllib.request.urlopen(req, timeout=40) as r:
                dest.write_bytes(r.read())
            if dest.stat().st_size > 100:
                return True
        except Exception as e:
            if i == retries - 1:
                print("download fail", cdn[:80], e)
            time.sleep(0.5 * (i + 1))
    return False


def strip_watermark(arr: np.ndarray, aggressive: bool = False) -> np.ndarray:
    out = arr.astype(np.float32).copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    lum = (r + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    wm = (
        ((b > r + (6 if aggressive else 12)) & (b > g + (1 if aggressive else 4)) & (lum > (130 if aggressive else 155)))
        | ((lum > (148 if aggressive else 165)) & (lum < 245) & (chroma < (34 if aggressive else 28)))
    )
    if aggressive:
        h, w = lum.shape
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        d1 = np.abs(yy / max(h, 1) - xx / max(w, 1))
        wm |= (d1 < 0.14) & (lum > 142) & (chroma < 42)
    out[wm] = 255.0
    return out.astype(np.uint8)


def recolor_image(path: Path, out_path: Path, aggressive_wm: bool = False):
    raw = np.array(Image.open(path).convert("RGBA"), dtype=np.uint8)
    stripped = strip_watermark(raw, aggressive=aggressive_wm)
    arr = stripped.astype(np.int16)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = (r + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    wm = ((b > r + 8) & (b > g + 2) & (lum > 140)) | ((lum > 155) & (lum < 235) & (chroma < 28))
    bg = (lum > 248)
    ink = (~bg) & (~wm) & (lum < 215)
    if ink.sum() < 80:
        Image.open(path).convert("RGB").save(out_path, "PNG", optimize=True)
        return False
    out = np.full((*ink.shape, 4), 255, dtype=np.uint8)
    h, w = ink.shape
    band = np.zeros((h, w), dtype=np.int32)
    band[ink & (lum < 95)] = 0
    band[ink & (lum >= 95) & (lum < 145)] = 1
    band[ink & (lum >= 145)] = 2
    yy, xx = np.mgrid[0:h, 0:w]
    xq = np.minimum(3, xx * 4 // max(w, 1))
    yq = np.minimum(2, yy * 3 // max(h, 1))
    color_idx = (band * 12 + xq * 3 + yq) % len(PALETTE)
    for i, rgb in enumerate(PALETTE):
        mask = ink & (color_idx == i)
        out[mask, :3] = rgb
    textish = ink & (lum >= 130) & (chroma < 35)
    out[textish, :3] = [15, 118, 110]
    result = Image.fromarray(out, "RGBA")
    rgb = Image.new("RGB", result.size, (255, 255, 255))
    rgb.paste(result, mask=result.split()[3])
    rgb = ImageEnhance.Contrast(rgb).enhance(1.06)
    rgb = ImageEnhance.Color(rgb).enhance(1.15)
    rgb.save(out_path, "PNG", optimize=True)
    return True


def prepare_logo():
    im = Image.open(LOGO_SRC).convert("RGBA")
    arr = np.array(im, dtype=np.float32)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    lum = (r + g + b) / 3.0
    alpha = a.copy()
    alpha[lum < 18] = 0
    soft = (lum >= 18) & (lum < 42)
    alpha[soft] = np.minimum(alpha[soft], (lum[soft] - 18) / 24 * 255)
    alpha[lum >= 42] = np.maximum(alpha[lum >= 42], 210)
    arr[..., 3] = alpha
    logo = Image.fromarray(arr.astype(np.uint8), "RGBA")
    logo.save(LOGO_WM, "PNG", optimize=True)
    return logo


def ink_mask(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (r.astype(np.float32) + g + b) / 3.0
    chroma = np.maximum.reduce([np.abs(r - g), np.abs(g - b), np.abs(r - b)])
    return (~(lum > 248)) & (lum < 215) & (chroma > 8)


def watermark_image(fig_path: Path, logo: Image.Image):
    base = Image.open(fig_path).convert("RGB")
    mask = ink_mask(np.array(base))
    dense = mask.sum() / max(mask.size, 1) > 0.12
    opacity = FALLBACK_OPACITY if dense else LOGO_OPACITY
    w, h = base.size
    diag = (w * w + h * h) ** 0.5
    lw = max(84, int(diag * DIAG_COVERAGE * 0.46))
    lh = max(36, int(lw * logo.height / logo.width))
    mark = logo.resize((lw, lh), Image.LANCZOS).rotate(ROT_DEG, expand=True, resample=Image.BICUBIC)
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    x = int(w / 2 - mark.size[0] / 2)
    y = int(h / 2 - mark.size[1] / 2)
    alpha = mark.split()[3].point(lambda p: int(p * opacity))
    mark.putalpha(alpha)
    layer.paste(mark, (x, y), mark)
    Image.alpha_composite(base.convert("RGBA"), layer).convert("RGB").save(fig_path, "PNG", optimize=True)


def is_aggressive(url: str) -> bool:
    return "jee_advanced_physics" in url or "AKCR" in url


def process_figure(url: str, logo, manifest_map):
    if url in manifest_map and local_path(url).exists():
        return manifest_map[url]
    stem = Path(normalize_url(url).split("?")[0]).name
    src_file = SRC / f"{url_hash(url)}_{stem}"
    if not download(url, src_file):
        return None
    out = local_path(url)
    recolor_image(src_file, out, aggressive_wm=is_aggressive(url))
    watermark_image(out, logo)
    local = "/assets/diagrams/" + local_name(url)
    manifest_map[url] = local
    return local


def patch_all_sources(url_map):
    changed = 0
    targets = []
    for root in SCAN_ROOTS:
        if root.exists():
            targets.extend(root.rglob("*.json"))
            targets.extend(root.rglob("*.js"))
    targets.extend(SCAN_FILES)
    for f in targets:
        if not f.exists():
            continue
        try:
            blob = f.read_text(encoding="utf-8")
        except Exception:
            continue
        new_blob = blob
        for url, local in url_map.items():
            new_blob = new_blob.replace(url, local)
        if new_blob != blob:
            f.write_text(new_blob, encoding="utf-8")
            changed += 1
    return changed


def update_overrides(url_map):
    data = json.loads(OVERRIDES.read_text(encoding="utf-8")) if OVERRIDES.exists() else {"version": 1, "rules": []}
    rules = data.get("rules", [])
    seen = {r.get("url", "") + r.get("urlRx", "") for r in rules}
    for url, local in url_map.items():
        key = re.escape(Path(url.split("/")[-1]).stem)
        if key in seen:
            continue
        rules.append({"urlRx": key, "clean": local})
        seen.add(key)
    data["rules"] = rules
    data["version"] = data.get("version", 1) + 1
    OVERRIDES.write_text(json.dumps(data, indent=2), encoding="utf-8")


def main():
    manifest = load_manifest()
    url_map = dict(manifest.get("map", {}))
    urls = collect_urls()
    # skip already-local book figures (qx-book-* handled by book manifest)
    pending = [u for u in urls if u not in url_map or not local_path(u).exists()]
    print("site total", len(urls), "pending", len(pending), "done", len(urls) - len(pending))
    logo = prepare_logo()
    ok = 0
    for i, url in enumerate(pending, 1):
        local = process_figure(url, logo, url_map)
        if local:
            ok += 1
            url_map[url] = local
        if i % 50 == 0:
            manifest["map"] = url_map
            save_manifest(manifest)
            print(f"progress {i}/{len(pending)} ok={ok}")
    manifest["map"] = url_map
    save_manifest(manifest)
    patched = patch_all_sources(url_map)
    update_overrides(url_map)
    print("processed", ok, "patched_files", patched, "total_map", len(url_map))


if __name__ == "__main__":
    main()
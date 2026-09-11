"""Rewrite Organic book chapter JSON to local clean figures. Fetch unmapped Quizrr URLs."""
import hashlib
import json
import re
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CH_DIR = ROOT / "data" / "books" / "chapters" / "6a4ce383c59a7b462185330f"
MAN_PATH = ROOT / "data" / "qx_organic_figure_manifest.json"
DIAG = ROOT / "assets" / "diagrams"
SRC_RX = re.compile(r"""src=(["'])([^"']+)\1""", re.I)
CTX = ssl.create_default_context()


def load_man():
    man = json.loads(MAN_PATH.read_text(encoding="utf-8"))
    mp = man.get("map") or {}
    by_base = {}
    for k, v in mp.items():
        by_base[k] = v
        by_base[k.split("?")[0]] = v
        by_base[k.split("/")[-1].split("?")[0]] = v
    return man, mp, by_base


def local_for(url, by_base):
    if not url:
        return None
    if "/assets/diagrams/qx-org-" in url:
        return url.split("?")[0]
    return (
        by_base.get(url)
        or by_base.get(url.split("?")[0])
        or by_base.get(url.split("/")[-1].split("?")[0])
    )


def fetch_bytes(url):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0",
            "Referer": "https://web.getmarks.app/",
            "Accept": "image/*,*/*",
        },
    )
    with urllib.request.urlopen(req, context=CTX, timeout=25) as r:
        return r.read()


def save_unmapped(url, mp, by_base):
    raw = fetch_bytes(url)
    if not raw or len(raw) < 80:
        raise RuntimeError("empty")
    h = hashlib.md5(url.encode("utf-8")).hexdigest()[:16]
    name = f"qx-org-{h}.png"
    dest = DIAG / name
    dest.write_bytes(raw)
    rel = f"/assets/diagrams/{name}"
    mp[url] = rel
    mp[url.split("?")[0]] = rel
    by_base[url] = rel
    by_base[url.split("?")[0]] = rel
    by_base[url.split("/")[-1].split("?")[0]] = rel
    return rel


def rewrite_blob(blob, by_base, stats):
    def repl(m):
        q, src = m.group(1), m.group(2)
        loc = local_for(src, by_base)
        if loc:
            stats["mapped"] += 1
            return f"src={q}{loc}{q}"
        if "quizrr" in src or "watermarked" in src:
            stats["unmapped"].add(src)
        stats["left"] += 1
        return m.group(0)

    return SRC_RX.sub(repl, blob)


def walk_q(q, by_base, stats):
    for k in ("q", "solution"):
        if isinstance(q.get(k), str) and "src=" in q[k]:
            q[k] = rewrite_blob(q[k], by_base, stats)
    if isinstance(q.get("options"), list):
        q["options"] = [
            rewrite_blob(o, by_base, stats) if isinstance(o, str) and "src=" in o else o
            for o in q["options"]
        ]
    return q


def main():
    man, mp, by_base = load_man()
    stats = {"mapped": 0, "left": 0, "unmapped": set()}
    files = list(CH_DIR.glob("*.json"))
    packs = []
    for f in files:
        d = json.loads(f.read_text(encoding="utf-8"))
        for q in d.get("questions") or []:
            walk_q(q, by_base, stats)
        packs.append((f, d))

    fetched = failed = 0
    leftover = list(stats["unmapped"])
    print("first pass mapped", stats["mapped"], "unmapped urls", len(leftover))
    for url in leftover:
        try:
            save_unmapped(url, mp, by_base)
            fetched += 1
            print(" fetched", fetched, url[-70:])
        except Exception as e:
            failed += 1
            print(" fail", type(e).__name__, str(e)[:80], url[-60:])

    stats2 = {"mapped": 0, "left": 0, "unmapped": set()}
    for f, d in packs:
        for q in d.get("questions") or []:
            walk_q(q, by_base, stats2)
        f.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    man["map"] = mp
    man["version"] = int(man.get("version") or 1) + 1
    MAN_PATH.write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("second mapped", stats2["mapped"], "left", stats2["left"], "unmapped", len(stats2["unmapped"]))
    print("fetched", fetched, "failed", failed, "manifest", len(mp))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Current Marks/Quizrr/Examgoal CDN leftover vs Firebase/local (disk + a few live files)."""
from __future__ import annotations
import re
import ssl
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CDN_RX = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net|web\.getmarks\.app)[^\"'\\>\s]+""",
    re.I,
)
FB_RX = re.compile(r"firebasestorage\.googleapis\.com", re.I)
LOCAL_RX = re.compile(r"/assets/diagrams/", re.I)
AREAS = [
    ("banks", ROOT / "data" / "banks"),
    ("books", ROOT / "data" / "books" / "chapters"),
    ("quizrr_pyq", ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter"),
    ("examgoal", ROOT / "data" / "tests" / "jee_main_examgoal_2027"),
    ("formulas", ROOT / "data" / "formulas.json"),
    ("ncert", ROOT / "data" / "ncert_offline"),
    ("board", ROOT / "data" / "board_offline"),
    ("hsc", ROOT / "data" / "board_hsc_offline"),
]


def walk(p: Path):
    if p.is_file():
        yield p
        return
    if not p.exists():
        return
    for fp in p.rglob("*.json"):
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        yield fp


def scan_text(s: str):
    cdn = CDN_RX.findall(s)
    hosts = Counter()
    uniq = set()
    for u in cdn:
        u2 = u.replace("\\/", "/").split("?")[0]
        uniq.add(u2)
        if "://" in u2:
            hosts[u2.split("/")[2]] += 1
    return {
        "cdn_mentions": len(cdn),
        "cdn_unique": len(uniq),
        "fb": len(FB_RX.findall(s)),
        "local": len(LOCAL_RX.findall(s)),
        "hosts": hosts,
        "uniq": uniq,
    }


out = {}
all_uniq = set()
all_hosts = Counter()
for label, area in AREAS:
    c = Counter()
    files_hit = 0
    uniq = set()
    fb = loc = 0
    for fp in walk(area):
        try:
            s = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        r = scan_text(s)
        fb += r["fb"]
        loc += r["local"]
        if r["cdn_mentions"]:
            files_hit += 1
            uniq |= r["uniq"]
            all_uniq |= r["uniq"]
            all_hosts.update(r["hosts"])
            c.update(r["hosts"])
    out[label] = {
        "files_with_cdn": files_hit,
        "cdn_unique": len(uniq),
        "cdn_hosts": dict(c),
        "firebase_mentions": fb,
        "local_diagrams": loc,
    }

marks = (ROOT / "marks-live.js").read_text(encoding="utf-8", errors="ignore")
out["runtime"] = {
    "student_marks_off": "STUDENT_MARKS_RUNTIME = false" in marks.replace("  ", " ")
    or re.search(r"STUDENT_MARKS_RUNTIME\s*=\s*false", marks) is not None
}

print("DISK", flush=True)
for k, v in out.items():
    if k == "runtime":
        print(" runtime", v)
        continue
    print(k, v)

print("TOTAL_UNIQUE_CDN", len(all_uniq))
print("TOTAL_HOSTS", dict(all_hosts))
print("LEFTOVER_SAMPLES")
for u in sorted(all_uniq)[:20]:
    print(" ", u[:140])

# live
ctx = ssl.create_default_context()
print("LIVE")
try:
    html = urllib.request.urlopen("https://www.quantrexacademy.com/app.html", timeout=30, context=ctx).read().decode("utf-8", "replace")
    m = re.search(r'QX_BUILD\s*=\s*"([^"]+)"', html)
    print(" build", m.group(1) if m else "?")
except Exception as e:
    print(" app.html", e)

for slug in ("nda.json", "iat_iiser.json", "jee_main.json"):
    url = "https://www.quantrexacademy.com/data/banks/" + slug
    try:
        t = urllib.request.urlopen(url, timeout=90, context=ctx).read().decode("utf-8", "replace")
        r = scan_text(t)
        print(" live", slug, "fb", r["fb"], "gm_pool", r["hosts"].get("cdn-question-pool.getmarks.app", 0),
              "gm_assets", r["hosts"].get("cdn-assets.getmarks.app", 0), "quizrr", r["hosts"].get("cdn.quizrr.in", 0),
              "local", r["local"])
    except Exception as e:
        print(" live", slug, "ERR", e)

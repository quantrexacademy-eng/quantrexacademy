#!/usr/bin/env python3
"""Count unique leftover CDN figure URLs (fast regex, no JSON parse)."""
from __future__ import annotations
import re
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CDN_RX = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'\\>\s]+""",
    re.I,
)
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027",
    ROOT / "data" / "formulas.json",
    ROOT / "data" / "ncert_offline",
    ROOT / "data" / "board_offline",
    ROOT / "data" / "board_hsc_offline",
    ROOT / "data" / "quick_concepts",
]


def walk(p: Path):
    if p.is_file() and p.suffix == ".json":
        yield p
        return
    if not p.exists():
        return
    for fp in p.rglob("*.json"):
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        yield fp


def main():
    uniq = set()
    hosts = Counter()
    files_hit = 0
    for area in AREAS:
        for fp in walk(area):
            try:
                s = fp.read_text(encoding="utf-8", errors="ignore")
            except Exception:
                continue
            found = CDN_RX.findall(s)
            if not found:
                continue
            files_hit += 1
            for u in found:
                u2 = u.replace("\\/", "/").split("?")[0].rstrip("\\")
                uniq.add(u2)
                host = u2.split("/")[2] if "://" in u2 else "?"
                hosts[host] += 1
    print("files_hit", files_hit, "unique", len(uniq), "mentions", sum(hosts.values()))
    for h, n in hosts.most_common():
        print(" ", h, n)
    (ROOT / "data" / "_migration").mkdir(exist_ok=True)
    out = ROOT / "data" / "_migration" / "unique_cdn_urls.txt"
    out.write_text("\n".join(sorted(uniq)), encoding="utf-8")
    print("wrote", out, "lines", len(uniq))


if __name__ == "__main__":
    main()

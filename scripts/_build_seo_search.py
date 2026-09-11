#!/usr/bin/env python3
"""Build compact public search index from existing SEO shards (no bank reload)."""
from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
SHARDS = ROOT / "data" / "seo" / "shards"
OUT = ROOT / "data" / "seo" / "qsearch"
STOP = {
    "the", "and", "for", "with", "that", "this", "from", "which", "what", "when",
    "then", "each", "into", "onto", "over", "after", "before", "following",
    "given", "find", "then", "than", "also", "only", "have", "has", "were",
    "was", "are", "not", "but", "its", "their", "them", "they", "you", "your",
}


def key2(s: str) -> str:
    t = re.sub(r"[^a-z0-9]+", "", (s or "").lower())
    if len(t) < 2:
        return (t + "z")[:2] or "zz"
    return t[:2]


def words(text: str):
    return [w for w in re.split(r"[^a-z0-9]+", (text or "").lower()) if len(w) >= 4 and w not in STOP]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    buckets = defaultdict(dict)
    n = 0
    for fp in sorted(SHARDS.glob("*.json")):
        data = json.loads(fp.read_text(encoding="utf-8"))
        for rec in data.values():
            item = {
                "id": rec.get("id"),
                "slug": rec.get("slug") or "question",
                "t": (rec.get("text") or "")[:180],
                "exam": rec.get("exam") or "",
                "year": rec.get("year") or "",
            }
            if not item["id"] or len(item["t"]) < 18:
                continue
            keys = {key2(item["slug"])}
            for w in words(item["t"])[:8]:
                keys.add(key2(w))
            for k in keys:
                buckets[k][str(item["id"])] = item
            n += 1
        print("shard", fp.name, "qs", n, flush=True)

    for k, obj in buckets.items():
        (OUT / f"{k}.json").write_text(
            json.dumps(list(obj.values()), ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
    print("files", len(buckets), "questions", n, flush=True)


if __name__ == "__main__":
    main()

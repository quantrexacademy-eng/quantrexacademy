#!/usr/bin/env python3
"""List every display-broken JEE Main PYQ mock question (compact)."""
from __future__ import annotations
import json, re
from pathlib import Path
from collections import defaultdict

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
DOLLAR_BLOCK = re.compile(r"(?<!\\)\$(.+?)(?<!\\)\$", re.S)
HTML_IN = re.compile(r"<br\s*/?>|</?p>|</?div>|</?span>", re.I)
DOLLAR = re.compile(r"(?<!\\)\$")


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(DOLLAR.findall(t)) % 2 == 1


def opt_plain(o):
    return o if isinstance(o, str) else str((o or {}).get("text") or "")


rows = defaultdict(list)
for q in BANK["questions"]:
    if not isinstance(q, dict):
        continue
    raw = str(q.get("q") or "")
    opts = q.get("options") or []
    blob = raw + " " + " ".join(opt_plain(o) for o in opts)
    kinds = []
    if any(HTML_IN.search(m) for m in DOLLAR_BLOCK.findall(raw)):
        kinds.append("stem_hidden_html_in_math")
    if odd(raw):
        kinds.append("stem_bikhra_unbalanced_$")
    miss = False
    for src in IMG.findall(blob):
        path = src.split("?")[0]
        if path.startswith("/assets/") and not (ROOT / path.lstrip("/")).is_file():
            miss = True
    if miss:
        kinds.append("figure_missing")
    plains = [strip(opt_plain(o)) for o in opts]
    has_fig = any("<img" in opt_plain(o).lower() for o in opts)
    emptyish = plains and all(p in ("", "A", "B", "C", "D") for p in plains) and not has_fig
    if emptyish and "numerical" not in str(q.get("questionType") or q.get("type") or "").lower():
        if q.get("correctValue") in (None, "") and q.get("answer") not in (None, "", []):
            # MCQ with letter stubs
            kinds.append("options_A-D_only")
    if not kinds:
        continue
    src = q.get("source") or "?"
    rows[src].append({
        "id": q.get("id"),
        "sub": q.get("subject"),
        "ch": q.get("chapter"),
        "kinds": kinds,
    })

print("PAPERS_DISPLAY", len(rows))
print("QS_DISPLAY", sum(len(v) for v in rows.values()))
# print each
for paper, items in sorted(rows.items()):
    print(f"\n## {paper}  ({len(items)} wrong on screen)")
    for it in items:
        print(f"  id {it['id']}  {it['sub']} / {it['ch']}  → {', '.join(it['kinds'])}")

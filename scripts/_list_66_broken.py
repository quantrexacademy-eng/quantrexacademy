#!/usr/bin/env python3
"""Dump the 66 real broken questions for official mechanical repair."""
from __future__ import annotations
import json, re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
]


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return []


def kinds(raw, allb):
    out = []
    if re.search(r"\$\$\\mathrm\{[A-Za-z0-9]", raw) and not re.search(r"\$\$\\int", raw):
        out.append("shattered_mathrm")
    dollars = len(re.findall(r"(?<!\\)\$", raw.replace("$$", "")))
    if dollars % 2 == 1 and dollars > 0:
        out.append("unbalanced_dollar")
    return out


rows = []
for area in AREAS:
    if not area.exists():
        continue
    files = [area] if area.is_file() else list(area.rglob("*.json"))
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = qs_of(data)
        if qs is None:
            continue
        for q in qs:
            if not isinstance(q, dict):
                continue
            raw = str(q.get("q") or q.get("question") or "")
            opts = " ".join(o if isinstance(o, str) else str((o or {}).get("text") or "") for o in (q.get("options") or []))
            ks = kinds(raw, raw + opts)
            if not ks:
                continue
            rows.append({
                "file": str(fp.relative_to(ROOT)),
                "id": q.get("id"),
                "kinds": ks,
                "q": raw[:500],
                "dollars": len(re.findall(r"(?<!\\)\$", raw.replace("$$", ""))),
            })

print("n", len(rows))
for r in rows:
    print("====", r["file"][-70:], "ID", r["id"], r["kinds"], "dollars", r["dollars"])
    print(repr(r["q"][:420]))
    print("---")
(ROOT / "data/_migration/broken66.json").write_text(json.dumps(rows, indent=2, ensure_ascii=False), encoding="utf-8")

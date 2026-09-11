#!/usr/bin/env python3
"""Audit jee_main (+ optional all) chapter shards for missing figures/opts/sols."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
CH = ROOT / "data" / "banks" / "chapters"
OUT = ROOT / "data" / "_migration" / "missing_figs_audit.json"
IMG = re.compile(r"<img\b", re.I)
SRC = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
FIGTALK = re.compile(
    r"shown in (the )?(figure|diagram|graph)|see (the )?(figure|diagram)|"
    r"as shown( in the figure)?|the following (figure|diagram|graph)|"
    r"figure (shows|given)|given (figure|diagram)|refer (to )?(the )?(figure|diagram)",
    re.I,
)
FOREIGN = re.compile(
    r"cdn-question-pool\.getmarks|cdn-assets\.getmarks|cdn\.quizrr|examgoal\.net|watermarked_images",
    re.I,
)
OWNED = re.compile(r"firebasestorage|quantrexacademy-app|/assets/diagrams/|qx-org-|qx-self-|qx-book-|/api/proxy-image", re.I)


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def blob(q):
    opts = q.get("options") or []
    ot = []
    for o in opts:
        if isinstance(o, dict):
            ot.append(str(o.get("text") or o.get("html") or ""))
        else:
            ot.append(str(o or ""))
    return str(q.get("q") or q.get("question") or "") + "\n" + "\n".join(ot) + "\n" + str(q.get("solution") or "")


def is_nat(q):
    t = str(q.get("questionType") or q.get("type") or "")
    if re.search(r"numerical|integer|nat|subjective|fill|written", t, re.I):
        return True
    opts = q.get("options") or []
    return q.get("correctValue") is not None and not opts


def opt_ok(q):
    if is_nat(q):
        return True
    opts = q.get("options") or []
    n = 0
    for o in opts:
        raw = o if isinstance(o, str) else str((o or {}).get("text") or (o or {}).get("html") or "")
        t = strip(raw)
        if IMG.search(raw) or (t and not re.fullmatch(r"[A-Da-d]", t or "")):
            n += 1
    return n >= 2


def main():
    files = [p for p in CH.rglob("*.json") if p.name != "index.json" and "bak" not in p.name.lower() and not p.name.startswith("_")]
    # prioritize jee_main
    files.sort(key=lambda p: (0 if "jee_main" in str(p) else 1, str(p)))
    stats = Counter()
    miss_fig = []
    miss_opt = []
    miss_sol = []
    foreign = []
    for fp in files:
        try:
            d = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = d.get("questions") if isinstance(d, dict) else d
        if not isinstance(qs, list):
            continue
        rel = str(fp.relative_to(CH)).replace("\\", "/")
        exam = rel.split("/")[0]
        for q in qs:
            if not q:
                continue
            stats["q"] += 1
            if exam == "jee_main":
                stats["jee_main"] += 1
            b = blob(q)
            srcs = SRC.findall(b)
            has_img = bool(IMG.search(b))
            stem = strip(q.get("q") or "")
            talks = bool(FIGTALK.search(stem))
            if talks:
                stats["figtalk"] += 1
            if talks and not has_img:
                stats["figtalk_noimg"] += 1
                if len(miss_fig) < 400:
                    miss_fig.append({
                        "file": rel,
                        "id": q.get("id"),
                        "marksId": q.get("_marksId"),
                        "stem": stem[:90],
                    })
            if has_img:
                stats["has_img"] += 1
            for u in srcs:
                if FOREIGN.search(u) and not OWNED.search(u):
                    stats["foreign_src"] += 1
                    if len(foreign) < 200:
                        foreign.append({"file": rel, "id": q.get("id"), "url": u[:160]})
                elif OWNED.search(u):
                    stats["owned_src"] += 1
            if not opt_ok(q):
                stats["miss_opt"] += 1
                if len(miss_opt) < 250:
                    miss_opt.append({"file": rel, "id": q.get("id"), "marksId": q.get("_marksId"), "nopts": len(q.get("options") or [])})
            sol = strip(q.get("solution") or "")
            if len(sol) < 25 and not IMG.search(str(q.get("solution") or "")):
                stats["miss_sol"] += 1
                if exam == "jee_main" and len(miss_sol) < 250:
                    miss_sol.append({"file": rel, "id": q.get("id"), "marksId": q.get("_marksId")})
    out = {
        "stats": dict(stats),
        "miss_fig_n": len(miss_fig),
        "miss_fig": miss_fig[:80],
        "miss_opt_n": stats["miss_opt"],
        "miss_opt": miss_opt[:40],
        "miss_sol_jee_sample": miss_sol[:40],
        "foreign_sample": foreign[:20],
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("stats", json.dumps(dict(stats), indent=2))
    print("wrote", OUT)


if __name__ == "__main__":
    main()

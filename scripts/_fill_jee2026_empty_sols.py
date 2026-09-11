#!/usr/bin/env python3
"""Fill empty JEE Main 2026 official solutions from Marks v4. Never invents."""
from __future__ import annotations

import json
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG.get("token") or ""
CTX = ssl.create_default_context()


def plain(s):
    import re
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def get_v4(qid):
    req = urllib.request.Request(
        "https://web.getmarks.app/api/v4/questions/" + str(qid),
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "User-Agent": "Mozilla/5.0",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception:
        return None


def combine(text, image):
    t = str(text or "")
    if image:
        u = str(image)
        if u and u.lower() not in t.lower():
            t = (t + "\n" + f'<img src="{u}" alt="">').strip() if t else f'<img src="{u}" alt="">'
    return t


def main():
    raw = json.loads(BANK.read_text(encoding="utf-8"))
    qs = raw["questions"]
    extra = {k: v for k, v in raw.items() if k != "questions"}
    targets = []
    for q in qs:
        if not q:
            continue
        if "2026" not in str(q.get("source") or ""):
            continue
        if len(plain(q.get("solution") or "")) >= 12:
            continue
        targets.append(q)
    print("empty 2026 sols", len(targets))
    ok = 0
    for q in targets:
        qid = q.get("_marksId") or q.get("id")
        j = get_v4(qid)
        time.sleep(0.03)
        if not j:
            print("fail", qid)
            continue
        d = (j.get("data") or {}).get("question") or (j.get("data") or {})
        if not isinstance(d, dict):
            continue
        solb = d.get("solution") or {}
        sol = combine(solb.get("text") if isinstance(solb, dict) else solb, solb.get("image") if isinstance(solb, dict) else None)
        if sol and len(plain(sol)) >= 12:
            q["solution"] = sol
            ok += 1
            print("filled", q.get("id"), q.get("source"), len(plain(sol)))
        opts = d.get("options") or []
        if opts and (not q.get("options") or all(len(plain(o if not isinstance(o, dict) else o.get("text"))) <= 2 for o in (q.get("options") or []))):
            q["options"] = [combine(o.get("text"), o.get("image")) if isinstance(o, dict) else str(o) for o in opts]
            ans = next((i for i, o in enumerate(opts) if isinstance(o, dict) and o.get("isCorrect")), None)
            if ans is not None:
                q["answer"] = ans
        stem = d.get("question") or {}
        st = combine(stem.get("text") if isinstance(stem, dict) else "", stem.get("image") if isinstance(stem, dict) else None)
        if st and len(plain(st)) > len(plain(q.get("q") or "")) + 10:
            q["q"] = st
    extra["questions"] = qs
    BANK.write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("DONE filled", ok, "/", len(targets))


if __name__ == "__main__":
    main()

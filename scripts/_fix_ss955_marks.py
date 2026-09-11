#!/usr/bin/env python3
"""Find screenshot 955-963 questions and refill from Marks v4. Never invents."""
from __future__ import annotations
import json, re, ssl, urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data/banks/jee_main.json"
cfg = json.loads((ROOT / "data/marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()

NEEDLES = [
    "sum of all the elements of",
    "B^{100}",
    "hyperconjugation",
    "spin-only magnetic moment",
    "angle of minimum deviation",
    "acidic strength of the major products",
    "0.1 moles of A is added",
    "g'(x) changes",
    "Statement I is true but Statement II",
]


def plain(s):
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
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        print("fail", qid, e)
        return None


def parse(j):
    d = j.get("data") if isinstance(j, dict) else None
    if isinstance(d, dict) and isinstance(d.get("question"), dict) and (
        d["question"].get("options") is not None or isinstance(d["question"].get("question"), dict)
    ):
        d = d["question"]
    if not isinstance(d, dict):
        return None
    qq = d.get("question") or {}
    stem = str(qq.get("text") or "") if isinstance(qq, dict) else str(qq or "")
    opts, ans = [], None
    for i, o in enumerate(d.get("options") or []):
        if isinstance(o, dict):
            t = str(o.get("text") or "")
            im = o.get("image")
            if im:
                u = im if isinstance(im, str) else (im.get("url") or im.get("src") or "")
                if u and "<img" not in t.lower():
                    t = (t + f'\n<img src="{u}">').strip()
            opts.append(t)
            if o.get("isCorrect") and ans is None:
                ans = i
        else:
            opts.append(str(o or ""))
    solb = d.get("solution") or {}
    sol = str(solb.get("text") or "") if isinstance(solb, dict) else str(solb or "")
    if isinstance(solb, dict) and solb.get("image"):
        im = solb["image"]
        u = im if isinstance(im, str) else (im.get("url") or "")
        if u and "<img" not in sol.lower():
            sol += f'\n<img src="{u}">'
    return {"q": stem, "options": opts, "answer": ans, "solution": sol, "correctValue": d.get("correctValue")}


def main():
    raw = json.loads(BANK.read_text(encoding="utf-8"))
    qs = raw["questions"]
    hits = []
    for i, q in enumerate(qs):
        blob = (str(q.get("q") or "") + " " + str(q.get("solution") or "")).lower()
        if "2026" not in str(q.get("source") or ""):
            continue
        if any(n.lower() in blob or n.lower() in str(q.get("q") or "").lower() for n in NEEDLES):
            hits.append((i, q))
    print("hits", len(hits))
    n = 0
    for i, q in hits:
        print("Q", q.get("id"), q.get("source"), q.get("_marksId"), plain(q.get("q"))[:90])
        mid = q.get("_marksId")
        if not mid:
            continue
        j = get_v4(mid)
        rec = parse(j) if j else None
        if not rec:
            print("  no rec")
            continue
        ch = []
        if rec["q"] and len(plain(rec["q"])) > 8:
            q["q"] = rec["q"]
            ch.append("stem")
        if rec["options"] and any(len(plain(o)) > 1 for o in rec["options"]):
            q["options"] = rec["options"]
            ch.append("opts")
        if rec["answer"] is not None:
            q["answer"] = rec["answer"]
            ch.append("key")
        if rec.get("correctValue") is not None:
            q["correctValue"] = rec["correctValue"]
        if rec["solution"] and len(plain(rec["solution"])) > 12:
            q["solution"] = rec["solution"]
            ch.append("sol")
        print("  applied", ch, "sol", len(plain(rec.get("solution") or "")))
        n += 1
    extra = {k: v for k, v in raw.items() if k != "questions"}
    extra["questions"] = qs
    BANK.write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("wrote", n)


if __name__ == "__main__":
    main()

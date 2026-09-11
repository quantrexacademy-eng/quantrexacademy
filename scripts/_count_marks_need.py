#!/usr/bin/env python3
import json, re, base64, time
from pathlib import Path
from collections import Counter

ROOT = Path(r"C:\Users\Admin\qx-hosting")
cfg = json.loads((ROOT / "data/marks_config.json").read_text(encoding="utf-8"))
tok = cfg["token"]
payload = json.loads(base64.b64decode(tok.split(".")[1] + "=="))
print("token exp", payload.get("exp"), "alive", payload.get("exp", 0) * 1000 > time.time() * 1000)
print("email", cfg.get("email"))

def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()

def opt_plain(o):
    if isinstance(o, dict):
        return plain(o.get("text") or o.get("html") or "")
    return plain(o)

def need(q):
    reasons = []
    p = plain(q.get("q") or q.get("question") or "")
    sol = plain(q.get("solution") or "")
    opts = q.get("options") or []
    op = [opt_plain(o) for o in opts]
    if len(p) < 8 and not re.search(r"<img", str(q.get("q") or ""), re.I):
        reasons.append("empty_stem")
    if not sol or sol.lower() in ("no solution", "no solution.", "&nbsp;") or len(sol) < 12:
        reasons.append("empty_sol")
    if op and all(re.fullmatch(r"[A-Da-d]?", x or "") for x in op):
        reasons.append("letter_opts")
    if q.get("answer") is None and q.get("correctValue") is None and q.get("correctAnswer") is None:
        if not re.search(r"numerical|integer|fill", str(q.get("questionType") or q.get("type") or ""), re.I):
            reasons.append("no_key")
    return reasons

banks = sorted((ROOT / "data/banks").glob("*.json"))
tot = Counter()
n_need = 0
n_all = 0
n_mid = 0
for p in banks:
    if "bak" in p.name:
        continue
    raw = json.loads(p.read_text(encoding="utf-8"))
    qs = raw.get("questions") if isinstance(raw, dict) else raw
    bank_need = 0
    bank_mid = 0
    for q in qs or []:
        if not q:
            continue
        n_all += 1
        r = need(q)
        if not r:
            continue
        n_need += 1
        bank_need += 1
        for x in r:
            tot[x] += 1
        mid = str(q.get("_marksId") or "")
        if re.fullmatch(r"[a-f0-9]{24}", mid) or re.fullmatch(r"[a-f0-9]{24}", str(q.get("id") or "")):
            n_mid += 1
            bank_mid += 1
    if bank_need:
        print(f"{p.name:28s} need={bank_need:5d} with_marksId={bank_mid:5d}")
print("ALL", n_all, "NEED", n_need, "with mongo id", n_mid)
print("reasons", dict(tot))

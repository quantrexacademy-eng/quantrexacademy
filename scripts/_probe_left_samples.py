#!/usr/bin/env python3
import json, ssl, urllib.request, urllib.error
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
cfg = json.loads((ROOT / "data/marks_config.json").read_text(encoding="utf-8"))
TOK = cfg["token"]
CTX = ssl.create_default_context()
HDR = {
    "Authorization": "Bearer " + TOK,
    "Accept": "application/json",
    "Origin": "https://web.getmarks.app",
    "User-Agent": "Mozilla/5.0",
}


def get(path):
    req = urllib.request.Request("https://web.getmarks.app" + path, headers=HDR)
    try:
        with urllib.request.urlopen(req, timeout=30, context=CTX) as r:
            return r.status, json.loads(r.read().decode("utf-8", "ignore"))
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", "ignore")[:300]
        return e.code, raw


# Quizrr-looking fail id
print("QUIZRR_ID", get("/api/v4/questions/69de21e87e39d99b57bc5a88")[0])
print("QUIZRR_V1", get("/api/v1/questions/69de21e87e39d99b57bc5a88")[0])

# JEE 2026 leftover
code, body = get("/api/v4/questions/6983c1ab8bfdbb24356397a2")
print("JEE2026", code)
if isinstance(body, dict):
    d = (body.get("data") or {}).get("question") or body.get("data") or {}
    sol = d.get("solution") if isinstance(d, dict) else None
    print("  type", d.get("type") if isinstance(d, dict) else None)
    print("  sol", json.dumps(sol)[:400] if sol is not None else None)
    print("  source", d.get("source") if isinstance(d, dict) else None)

# AP EAMCET leftover from report
code, body = get("/api/v4/questions/68e65ba870ce2b999c44da2a")
print("APEAMCET", code)
if isinstance(body, dict):
    d = (body.get("data") or {}).get("question") or body.get("data") or {}
    sol = d.get("solution") if isinstance(d, dict) else None
    print("  sol", json.dumps(sol)[:400] if sol is not None else None)
    print("  source", d.get("source") if isinstance(d, dict) else None)

# cache peek of a fetched EAMCET that didn't apply sol
qid = Path(r"C:\Users\Admin\qx-hosting\data\qid_marks")
# pick a recently written file around the hydrate time
cands = sorted(qid.glob("68e65b*.json"))[:3]
print("eamcet cache files", len(list(qid.glob("68e65b*.json"))), "sample", [p.name for p in cands])
for p in cands:
    j = json.loads(p.read_text(encoding="utf-8"))
    d = j.get("data") or {}
    if isinstance(d.get("question"), dict) and d["question"].get("options") is not None:
        d = d["question"]
    sol = d.get("solution") if isinstance(d, dict) else None
    print(" CACHE", p.stem, "sol", json.dumps(sol)[:250] if sol is not None else None)

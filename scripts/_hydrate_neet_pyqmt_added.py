#!/usr/bin/env python3
"""Fill answer+solution for imported Marks PYQ-MT questions from /api/v4/questions. Never invents."""
from __future__ import annotations

import json
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "neet.json"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG["token"]
OUT = ROOT / "data" / "_migration" / "neet_pyqmt_hydrate.json"
CTX = ssl.create_default_context()
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"


def get(qid):
    req = urllib.request.Request(
        "https://web.getmarks.app/api/v4/questions/" + str(qid),
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/pyq-mt",
            "User-Agent": UA,
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            return r.status, json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception:
        return None, None


def html_img(url):
    u = str(url or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        u = "https:" + u
    return f'<img src="{u}" alt="">'


def combine(text, image, base=""):
    t = str(text or "")
    if image:
        u = str(image)
        if base and not u.startswith("http"):
            u = str(base).rstrip("/") + "/" + u.lstrip("/")
        if u and u.lower() not in t.lower():
            t = (t + "\n" + html_img(u)).strip() if t else html_img(u)
    return t


def main():
    raw = json.loads(BANK.read_text(encoding="utf-8"))
    qs = raw["questions"]
    extra = {k: v for k, v in raw.items() if k != "questions"}
    targets = [q for q in qs if q and q.get("_from") == "marks_pyqmt" and q.get("answer") is None]
    print("targets", len(targets))
    ok = fail = sol = ans = 0
    for i, q in enumerate(targets):
        qid = q.get("_marksId") or q.get("id")
        st, j = get(qid)
        if st != 200 or not j:
            fail += 1
            if fail <= 8:
                print("fail", qid, st)
            continue
        d = (j.get("data") or {}).get("question") or (j.get("data") or {})
        if not isinstance(d, dict) or not (d.get("options") or d.get("question")):
            fail += 1
            continue
        qq = d.get("question") or {}
        base = d.get("imageBaseUrl") or ""
        stem = combine(qq.get("text") if isinstance(qq, dict) else "", qq.get("image") if isinstance(qq, dict) else None, base)
        if stem and (not q.get("q") or len(stem) > len(str(q.get("q") or "")) + 8):
            q["q"] = stem
        opts_in = d.get("options") or []
        opts = []
        answer = None
        for oi, o in enumerate(opts_in):
            if not isinstance(o, dict):
                opts.append(str(o or ""))
                continue
            t = combine(o.get("text"), o.get("image"), base)
            opts.append(t)
            if o.get("isCorrect") and answer is None:
                answer = oi
        if opts and (not q.get("options") or len(opts) >= len(q.get("options") or [])):
            q["options"] = opts
        if answer is not None:
            q["answer"] = answer
            ans += 1
        solb = d.get("solution") or {}
        sol_text = ""
        if isinstance(solb, dict):
            sol_text = combine(solb.get("text"), solb.get("image"), base)
        elif solb:
            sol_text = str(solb)
        if sol_text:
            q["solution"] = sol_text
            sol += 1
        if d.get("type"):
            q["questionType"] = d.get("type")
            q["type"] = d.get("type")
        ok += 1
        if i % 40 == 0:
            print(f"  {i+1}/{len(targets)} ok={ok} ans={ans} sol={sol} fail={fail}")
        time.sleep(0.02)
    raw_out = extra
    raw_out["questions"] = qs
    BANK.write_text(json.dumps(raw_out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    OUT.write_text(json.dumps({"ok": ok, "fail": fail, "ans": ans, "sol": sol, "targets": len(targets)}, indent=2), encoding="utf-8")
    print("DONE", "ok", ok, "ans", ans, "sol", sol, "fail", fail)


if __name__ == "__main__":
    main()

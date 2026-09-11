#!/usr/bin/env python3
"""Scan banks + test-series + books for solution quality. Never invents."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANKS = ROOT / "data" / "banks"
SKIP = {".bak", "bak_"}


def load_qs(p: Path):
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
    except Exception as e:
        return [], str(e)
    if isinstance(raw, dict):
        qs = raw.get("questions") or raw.get("data") or []
        if isinstance(qs, dict):
            qs = list(qs.values())
    elif isinstance(raw, list):
        qs = raw
    else:
        qs = []
    return qs if isinstance(qs, list) else [], None


def plain(s):
    t = re.sub(r"<[^>]+>", " ", str(s or ""))
    t = re.sub(r"\s+", " ", t).strip()
    return t


def opt_plain(o):
    if isinstance(o, dict):
        return plain(o.get("text") or o.get("html") or "")
    return plain(o)


def classify(q):
    sol = q.get("solution") or q.get("sol") or q.get("explanation") or ""
    p = plain(sol)
    opts = q.get("options") or []
    letters = [opt_plain(o) for o in opts]
    letter_only = letters and all(re.fullmatch(r"[A-Da-d]", x or "") for x in letters if x)
    flags = []
    if not p or p.lower() in ("no solution", "no solution.", "n/a", "-"):
        flags.append("empty_sol")
    elif len(p) < 12:
        flags.append("stub_sol")
    if p and len(re.findall(r"(?<!\\)\$", str(sol).replace("$$", ""))) % 2:
        flags.append("unbalanced_dollar_sol")
    if p and re.search(r"(fig(?:ure)?\.?\s*\d|see figure|as shown)", p, re.I) and not re.search(r"<img\b", str(sol), re.I):
        flags.append("sol_mentions_fig_no_img")
    if letter_only:
        flags.append("letter_stub_opts")
    ans = q.get("answer")
    if ans is None and q.get("correctValue") is None and q.get("correctAnswer") is None:
        if not re.search(r"numerical|integer|fill", str(q.get("questionType") or q.get("type") or ""), re.I):
            flags.append("no_answer_key")
    return flags, p


def scan_bank(p: Path):
    qs, err = load_qs(p)
    if err:
        return {"file": p.name, "error": err}
    n = 0
    flags = Counter()
    with_sol = 0
    with_img = 0
    samples = defaultdict(list)
    for q in qs:
        if not q or not isinstance(q, dict):
            continue
        n += 1
        fl, ptxt = classify(q)
        if ptxt and len(ptxt) >= 12:
            with_sol += 1
        if re.search(r"<img\b", str(q.get("solution") or ""), re.I):
            with_img += 1
        for f in fl:
            flags[f] += 1
            if len(samples[f]) < 2:
                samples[f].append({
                    "id": q.get("id"),
                    "src": str(q.get("source") or "")[:60],
                    "sub": str(q.get("subject") or "")[:30],
                    "sol": ptxt[:90],
                })
    return {
        "file": p.name,
        "n": n,
        "with_sol": with_sol,
        "sol_pct": round(100 * with_sol / n, 1) if n else 0,
        "sol_img": with_img,
        "flags": dict(flags),
        "samples": {k: v for k, v in samples.items()},
    }


def walk_json_qs(dirpath: Path, glob="*.json", limit_files=400):
    rows = []
    files = [p for p in dirpath.rglob(glob) if p.is_file() and "bak" not in p.name.lower() and "_migration" not in str(p)]
    for p in files[:limit_files]:
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = []
        if isinstance(raw, dict):
            if isinstance(raw.get("questions"), list):
                qs = raw["questions"]
            elif isinstance(raw.get("data"), list):
                qs = raw["data"]
        elif isinstance(raw, list):
            qs = raw
        if not qs or not isinstance(qs[0] if qs else None, dict):
            continue
        if not any("solution" in (q or {}) or "q" in (q or {}) for q in qs[:5] if isinstance(q, dict)):
            continue
        n = len(qs)
        with_sol = sum(1 for q in qs if isinstance(q, dict) and len(plain(q.get("solution") or q.get("explanation") or "")) >= 12)
        empty = n - with_sol
        if n >= 5:
            rows.append({"file": str(p.relative_to(ROOT))[:80], "n": n, "with_sol": with_sol, "empty": empty, "pct": round(100 * with_sol / n, 1)})
    return rows


def main():
    banks = []
    for p in sorted(BANKS.glob("*.json")):
        if any(x in p.name for x in (".bak", "bak_")):
            continue
        print("scan", p.name, flush=True)
        banks.append(scan_bank(p))

    tot_n = sum(b.get("n") or 0 for b in banks)
    tot_sol = sum(b.get("with_sol") or 0 for b in banks)
    flag_sum = Counter()
    for b in banks:
        for k, v in (b.get("flags") or {}).items():
            flag_sum[k] += v

    print("\n=== BANKS ===")
    print(f"{'file':28s} {'n':>7s} {'sol%':>6s} empty  stub  noKey  $odd  figMiss")
    for b in banks:
        if b.get("error"):
            print(b["file"], "ERR", b["error"][:80])
            continue
        f = b.get("flags") or {}
        print(f"{b['file']:28s} {b['n']:7d} {b['sol_pct']:5.1f}%  {f.get('empty_sol',0):5d} {f.get('stub_sol',0):5d} {f.get('no_answer_key',0):5d} {f.get('unbalanced_dollar_sol',0):5d} {f.get('sol_mentions_fig_no_img',0):5d}")

    print("\nTOTAL Q", tot_n, "with_sol", tot_sol, "pct", round(100 * tot_sol / tot_n, 1) if tot_n else 0)
    print("FLAGS", dict(flag_sum))

    ts = ROOT / "data" / "tests"
    ts_rows = walk_json_qs(ts) if ts.exists() else []
    print("\n=== TEST SERIES files with Qs (sample) ===")
    ts_rows.sort(key=lambda r: r["empty"], reverse=True)
    for r in ts_rows[:15]:
        print(r)
    if ts_rows:
        tn = sum(r["n"] for r in ts_rows)
        ts_ = sum(r["with_sol"] for r in ts_rows)
        print("test-json Q", tn, "sol%", round(100 * ts_ / tn, 1) if tn else 0)

    books = ROOT / "data" / "books"
    bk = walk_json_qs(books, limit_files=80) if books.exists() else []
    print("\n=== BOOKS sample ===")
    for r in sorted(bk, key=lambda x: x["empty"], reverse=True)[:10]:
        print(r)

    out = {"banks": banks, "flag_sum": dict(flag_sum), "tot_n": tot_n, "tot_sol": tot_sol, "tests_top_empty": ts_rows[:20], "books_top_empty": bk[:15]}
    dest = ROOT / "data" / "_migration" / "site_solution_scan.json"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, indent=2, default=str), encoding="utf-8")
    print("WROTE", dest)


if __name__ == "__main__":
    main()

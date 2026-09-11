#!/usr/bin/env python3
"""Full proofread counts: question quality, solution format, figures, arrangement."""
from __future__ import annotations

import json
import re
import urllib.parse
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANKS = ROOT / "data" / "banks"
FBSET = ROOT / "data" / "_migration" / "firebase_figs_set.txt"
DIAG = ROOT / "assets" / "diagrams"
OUT = ROOT / "data" / "_migration" / "full_proofread.json"

IMG = re.compile(r"<img\b", re.I)
SRC = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
FIG_TALK = re.compile(
    r"\b(shown in (the )?(figure|diagram|graph)|see (the )?figure|as shown in (the )?figure)\b",
    re.I,
)
TABLE = re.compile(r"<table\b", re.I)
GRID = re.compile(r"grid-template-columns|mk-sol-body", re.I)


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def opt_html(o):
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or "")
    return str(o or "")


def opt_plain(o):
    return plain(opt_html(o))


def is_nat(q):
    t = str(q.get("questionType") or q.get("type") or "")
    if re.search(r"numerical|integer|nat|subjective|fill|written", t, re.I):
        return True
    return (q.get("correctValue") is not None) and not (q.get("options") or [])


def letter_opts(opts):
    if not opts:
        return False
    op = [opt_plain(o) for o in opts]
    return all(re.fullmatch(r"[A-Da-d]?", x or "") for x in op) and not any(
        IMG.search(opt_html(o) or "") for o in opts
    )


def fb_path(u):
    m = re.search(r"/o/([^?]+)", u)
    if not m:
        return ""
    return urllib.parse.unquote(m.group(1))


def load_qs(p: Path):
    raw = json.loads(p.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        return raw.get("questions") or []
    return raw if isinstance(raw, list) else []


def main():
    have = set()
    if FBSET.exists():
        have = {x.strip() for x in FBSET.read_text(encoding="utf-8").splitlines() if x.strip()}
    man = ROOT / "data/_migration/wiped_upload_manifest.json"
    if man.exists():
        try:
            for r in json.loads(man.read_text(encoding="utf-8")).get("rows") or []:
                if r.get("storage"):
                    have.add(r["storage"])
        except Exception:
            pass
    # recently uploaded Irodov/org live on Firebase even if listing is stale
    if DIAG.exists():
        for p in DIAG.glob("qx-irodov-*.png"):
            have.add("questions/figs/irodov/" + p.name)
        for p in DIAG.glob("qx-org-*.png"):
            have.add("questions/figs/org/" + p.name)

    tot = Counter()
    by_bank = []
    samples = defaultdict(list)

    for fp in sorted(BANKS.glob("*.json")):
        if "bak" in fp.name:
            continue
        qs = load_qs(fp)
        b = Counter()
        b["file"] = 0
        n = 0
        for q in qs or []:
            if not q or not isinstance(q, dict):
                continue
            n += 1
            tot["qs"] += 1
            qh = str(q.get("q") or q.get("question") or "")
            sh = str(q.get("solution") or q.get("explanation") or "")
            opts = q.get("options") or []
            oh = " ".join(opt_html(o) for o in opts)
            qp, sp = plain(qh), plain(sh)

            # question
            if len(qp) < 8 and not IMG.search(qh):
                tot["empty_stem"] += 1
                b["empty_stem"] += 1
                if len(samples["empty_stem"]) < 6:
                    samples["empty_stem"].append({"bank": fp.name, "id": q.get("id"), "src": q.get("source")})
            if letter_opts(opts) and not is_nat(q):
                tot["letter_opts"] += 1
                b["letter_opts"] += 1
            has_key = (
                q.get("answer") is not None
                or q.get("correctValue") is not None
                or q.get("correctAnswer") is not None
                or q.get("answers")
            )
            if not has_key and not is_nat(q):
                tot["no_key"] += 1
                b["no_key"] += 1

            # solution
            if not sp or re.match(r"^(no solution\.?|&nbsp;)$", sp, re.I) or len(sp) < 12:
                tot["empty_sol"] += 1
                b["empty_sol"] += 1
            else:
                tot["ok_sol"] += 1
                b["ok_sol"] += 1
            if sp and 0 < len(sp) < 12:
                tot["stub_sol"] += 1
            if sp and len(re.findall(r"(?<!\\)\$", sh.replace("$$", ""))) % 2:
                tot["unbalanced_$"] += 1
                b["unbalanced_$"] += 1
            if TABLE.search(sh):
                tot["sol_table"] += 1
                b["sol_table"] += 1
            if GRID.search(sh):
                tot["sol_grid_class"] += 1

            # figures
            qi, si, oi = bool(IMG.search(qh)), bool(IMG.search(sh)), bool(IMG.search(oh))
            if qi:
                tot["q_img"] += 1
                b["q_img"] += 1
            if si:
                tot["sol_img"] += 1
                b["sol_img"] += 1
            if oi:
                tot["opt_img"] += 1
                b["opt_img"] += 1
            if FIG_TALK.search(qp) and not qi:
                tot["q_fig_missing"] += 1
                b["q_fig_missing"] += 1
                if len(samples["q_fig_missing"]) < 8:
                    samples["q_fig_missing"].append(
                        {"bank": fp.name, "id": q.get("id"), "src": q.get("source"), "stem": qp[:110]}
                    )
            if FIG_TALK.search(sp) and not si:
                tot["sol_fig_missing"] += 1
                b["sol_fig_missing"] += 1
                if len(samples["sol_fig_missing"]) < 6:
                    samples["sol_fig_missing"].append(
                        {"bank": fp.name, "id": q.get("id"), "src": q.get("source"), "sol": sp[:110]}
                    )

            for u in SRC.findall(qh + " " + sh + " " + oh):
                tot["img_tags"] += 1
                if "firebasestorage" in u:
                    tot["url_firebase"] += 1
                    pth = fb_path(u)
                    if have and pth and pth not in have:
                        tot["fb_not_listed"] += 1
                        b["fb_not_listed"] += 1
                elif "proxy-image" in u:
                    tot["url_proxy"] += 1
                elif "getmarks" in u:
                    tot["url_marks"] += 1
                    b["url_marks"] += 1
                elif "quizrr" in u:
                    tot["url_quizrr"] += 1
                elif "/assets/diagrams/" in u:
                    tot["url_local"] += 1
                    name = u.split("/")[-1].split("?")[0].replace("\\", "")
                    if name and not (DIAG / name).exists():
                        tot["local_file_missing"] += 1
                        b["local_file_missing"] += 1
                elif "https://.app/" in u:
                    tot["url_broken_host"] += 1
                else:
                    tot["url_other"] += 1

            if "2026" in str(q.get("source") or "") and fp.name == "jee_main.json":
                tot["jee2026"] += 1
                if qi or si or oi:
                    tot["jee2026_with_fig"] += 1
                if not sp or len(sp) < 12:
                    tot["jee2026_empty_sol"] += 1
                if FIG_TALK.search(qp) and not qi:
                    tot["jee2026_q_fig_missing"] += 1
                if FIG_TALK.search(sp) and not si:
                    tot["jee2026_sol_fig_missing"] += 1

        by_bank.append({"file": fp.name, "n": n, **{k: int(v) for k, v in b.items() if k != "file"}})
        print(f"{fp.name:28s} n={n:5d} emptySol={b['empty_sol']:5d} letter={b['letter_opts']:4d} qMissFig={b['q_fig_missing']:3d} solMissFig={b['sol_fig_missing']:3d} marksCDN={b['url_marks']:3d} fbMiss={b['fb_not_listed']:3d}", flush=True)

    pct = round(100.0 * tot["ok_sol"] / tot["qs"], 1) if tot["qs"] else 0
    tot["sol_pct"] = pct
    OUT.write_text(json.dumps({"totals": dict(tot), "banks": by_bank, "samples": dict(samples)}, indent=2), encoding="utf-8")
    print("TOTALS", dict(tot), flush=True)
    print("WROTE", OUT, flush=True)


if __name__ == "__main__":
    main()

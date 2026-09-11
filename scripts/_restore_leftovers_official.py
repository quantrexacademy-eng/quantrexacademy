#!/usr/bin/env python3
"""Restore leftover options/sols/figs from official qid_marks only. Never invent."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
QID = ROOT / "data" / "qid_marks"
MAPF = ROOT / "data" / "_migration" / "selfdep_url_map.json"
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
]

CDN_RX = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'\\>\s]+""",
    re.I,
)
IMG_RX = re.compile(r"<img\b", re.I)
HEX24 = re.compile(r"^[a-f0-9]{24}$", re.I)


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def load_map():
    if not MAPF.exists():
        return {}
    j = json.loads(MAPF.read_text(encoding="utf-8"))
    return j.get("map") or {}


def rewrite_cdn(html, mapping):
    s = str(html or "").replace("\\/", "/")

    def repl(m):
        u = m.group(0).replace("\\/", "/").split("?")[0]
        return mapping.get(u, mapping.get(m.group(0), m.group(0)))

    return CDN_RX.sub(repl, s)


def proof_tex(s):
    out = str(s or "")
    out = re.sub(r"\$([^$\n]{0,160})\$\$(\\mathrm\{)", r"$\1 \2", out)
    out = re.sub(r"\$\$\s*(\\mathrm\s*\{[A-Za-z0-9]+\})\s*\$\$", r"$\1$", out)
    out = re.sub(
        r"\$([A-Za-z])\s*[–—−-]\s*(axis|axes|coordinate|intercept|th)s?\b\$?",
        lambda m: "$" + m.group(1) + "$-" + m.group(2),
        out,
        flags=re.I,
    )
    out = re.sub(r"\[\s*[\d.]+\s*pt\s*\]", "", out, flags=re.I)
    out = re.sub(r"\bm\s+L\b", "mL", out)
    return out


def opt_list(opts):
    out = []
    for o in opts or []:
        if isinstance(o, str):
            out.append(o)
        elif isinstance(o, dict):
            out.append(str(o.get("text") or o.get("html") or o.get("image") or ""))
        else:
            out.append(str(o or ""))
    return out


def opt_score(opts):
    n = 0
    for s in opt_list(opts):
        t = strip(s)
        if IMG_RX.search(s):
            n += 8
        elif t and not re.match(r"^[\(\[]?[A-Da-d][\)\].:]?$", t):
            n += min(8, 1 + len(t) // 8)
    return n


def has_img(html):
    return bool(IMG_RX.search(str(html or "")))


def official_pack(rec):
    if not rec:
        return None
    data = rec.get("data") if isinstance(rec, dict) and "data" in rec else rec
    if not isinstance(data, dict):
        return None
    qobj = data.get("question") or {}
    stem = qobj.get("text") if isinstance(qobj, dict) else ""
    if not stem:
        stem = data.get("q") or data.get("questionText") or ""
    opts = []
    for o in data.get("options") or []:
        if isinstance(o, dict):
            t = str(o.get("text") or "")
            img = o.get("image")
            if isinstance(img, dict):
                img = img.get("url") or img.get("src")
            if img and not IMG_RX.search(t):
                t = (t + f' <img src="{img}">').strip()
            opts.append(t)
        else:
            opts.append(str(o or ""))
    solobj = data.get("solution") or {}
    sol = solobj.get("text") if isinstance(solobj, dict) else str(solobj or "")
    if not sol:
        sol = data.get("explanation") or ""
    ans = None
    for i, o in enumerate(data.get("options") or []):
        if isinstance(o, dict) and o.get("isCorrect"):
            ans = i
            break
    if ans is None:
        ans = data.get("answer")
    cv = data.get("correctValue") or data.get("numericalLowerLimit")
    return {"q": stem, "options": opts, "solution": sol, "answer": ans, "correctValue": cv}


def marks_id(q):
    mid = str(q.get("_marksId") or "")
    if HEX24.match(mid):
        return mid
    sid = str(q.get("id") or "")
    if HEX24.match(sid):
        return sid
    if sid.startswith("m_") and HEX24.match(sid[2:]):
        return sid[2:]
    if sid.startswith("ncert_") and HEX24.match(sid[6:]):
        return sid[6:]
    if sid.startswith("board_") and HEX24.match(sid[6:]):
        return sid[6:]
    return ""


def leftover_kind(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = q.get("options") or []
    sol = str(q.get("solution") or q.get("explanation") or "")
    stem = strip(raw)
    kinds = []
    img = has_img(raw + " ".join(opt_list(opts)) + sol)
    if (not stem or re.match(r"^(figure|fig\.?|diagram)$", stem, re.I)) and not img:
        kinds.append("empty")
    if opts and opt_score(opts) < 2:
        kinds.append("letter")
    if not strip(sol) and not has_img(sol):
        kinds.append("nosol")
    if re.search(r"\b(the figure|shown in (the )?(figure|diagram|graph)|shown below)\b", stem, re.I) and not img:
        if not re.search(r"figure formed by|figure 5\.|figure\s+\d", stem, re.I):
            kinds.append("fig")
    if re.search(r"\$\$\\mathrm\{[A-Za-z]\}", raw):
        kinds.append("tex")
    return kinds


def apply_official(q, pack, mapping):
    changed = []
    oq = rewrite_cdn(proof_tex(pack["q"]), mapping)
    oopts = [rewrite_cdn(proof_tex(x), mapping) for x in (pack["options"] or [])]
    osol = rewrite_cdn(proof_tex(pack["solution"]), mapping)
    kinds = leftover_kind(q)
    cur_q = str(q.get("q") or "")
    if "empty" in kinds or "fig" in kinds or "tex" in kinds:
        if has_img(oq) and not has_img(cur_q):
            q["q"] = oq
            changed.append("stem_fig")
        elif len(strip(oq)) > len(strip(cur_q)) + 8:
            q["q"] = oq
            changed.append("stem")
        else:
            tq = proof_tex(cur_q)
            if tq != cur_q:
                q["q"] = tq
                changed.append("tex")
    if "letter" in kinds and opt_score(oopts) > opt_score(q.get("options")):
        q["options"] = oopts
        changed.append("opts")
    elif "letter" in kinds and has_img(oq) and not has_img(cur_q):
        q["q"] = oq
        changed.append("letter_is_fig")
    if "nosol" in kinds and (strip(osol) or has_img(osol)):
        q["solution"] = osol
        changed.append("sol")
    if q.get("answer") is None and pack.get("answer") is not None:
        q["answer"] = pack["answer"]
        changed.append("ans")
    if q.get("correctValue") is None and pack.get("correctValue") not in (None, ""):
        q["correctValue"] = pack["correctValue"]
        changed.append("nat")
    return changed


def walk_json(dirp: Path):
    if not dirp.exists():
        return
    if dirp.is_file():
        yield dirp
        return
    for fp in dirp.rglob("*.json"):
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        yield fp


def qs_of(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and isinstance(data.get("questions"), list):
        return data["questions"]
    return None


def main():
    mapping = load_map()
    stats = {
        "qs": 0,
        "leftover": 0,
        "had_qid": 0,
        "applied": 0,
        "fields": {},
        "still": {},
        "no_qid": 0,
    }
    for area in AREAS:
        for fp in walk_json(area):
            try:
                data = json.loads(fp.read_text(encoding="utf-8"))
            except Exception:
                continue
            qs = qs_of(data)
            if qs is None:
                continue
            dirty = False
            for q in qs:
                if not isinstance(q, dict):
                    continue
                stats["qs"] += 1
                kinds = leftover_kind(q)
                if not kinds:
                    continue
                stats["leftover"] += 1
                mid = marks_id(q)
                rec = None
                if mid:
                    p = QID / f"{mid}.json"
                    if p.exists():
                        try:
                            rec = json.loads(p.read_text(encoding="utf-8"))
                        except Exception:
                            rec = None
                pack = official_pack(rec) if rec else None
                if pack:
                    stats["had_qid"] += 1
                    ch = apply_official(q, pack, mapping)
                    if ch:
                        dirty = True
                        stats["applied"] += 1
                        for c in ch:
                            stats["fields"][c] = stats["fields"].get(c, 0) + 1
                else:
                    # mechanical tex even without qid
                    raw = str(q.get("q") or "")
                    tq = proof_tex(raw)
                    if tq != raw:
                        q["q"] = tq
                        dirty = True
                        stats["applied"] += 1
                        stats["fields"]["tex"] = stats["fields"].get("tex", 0) + 1
                    if not pack:
                        stats["no_qid"] += 1
                still = leftover_kind(q)
                for k in still:
                    stats["still"][k] = stats["still"].get(k, 0) + 1
            if dirty:
                fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(stats, indent=2), flush=True)
    (ROOT / "data/_migration/restore_leftovers_now.json").write_text(json.dumps(stats, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()

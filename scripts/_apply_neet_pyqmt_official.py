#!/usr/bin/env python3
"""Pin Medical NEET PYQ mocks to Marks official papers (counts, order, Re-NEET 2026 mocks).

Never invents stems/options/solutions. Unmatched Marks Qs are imported as-is without fake keys.
"""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK_PATH = ROOT / "data" / "banks" / "neet.json"
PAPERS_DIR = ROOT / "data" / "_migration" / "marks_pyqmt_probe" / "papers"
INDEX_PATH = ROOT / "data" / "nav" / "pyq_paper_index" / "neet.json"
IDS_PATH = ROOT / "data" / "nav" / "pyq_paper_ids" / "neet.json"
MOD_PATH = ROOT / "data" / "nav" / "pyq_paper_index" / "neet_modules.json"
OUT_REP = ROOT / "data" / "_migration" / "neet_pyqmt_apply.json"

SUBJ_MAP = {
    "physics": "Physics",
    "chemistry": "Chemistry",
    "biology": "Biology",
    "botany": "Botany",
    "zoology": "Zoology",
}


def norm_stem(s: str) -> str:
    t = re.sub(r"<[^>]+>", " ", str(s or ""))
    t = t.replace("&nbsp;", " ").replace("&amp;", "&")
    t = re.sub(r"\\mathrm\{([A-Za-z]+)\}", r"\1", t)
    t = re.sub(r"\\text\{([^}]*)\}", r"\1", t)
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def opt_text(o) -> str:
    if o is None:
        return ""
    if isinstance(o, str):
        return o
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or o.get("q") or "")
    return str(o)


def html_img(url) -> str:
    u = str(url or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        u = "https:" + u
    return f'<img src="{u}" alt="">'


def marks_q_html(mq: dict) -> str:
    qq = mq.get("question") or {}
    text = str(qq.get("text") or "")
    img = qq.get("image")
    base = mq.get("imageBaseUrl") or ""
    if img:
        u = str(img)
        if base and not u.startswith("http"):
            u = str(base).rstrip("/") + "/" + u.lstrip("/")
        if u and u.lower() not in text.lower():
            text = (text + "\n" + html_img(u)).strip()
    return text


def marks_opts(mq: dict) -> list[str]:
    out = []
    base = mq.get("imageBaseUrl") or ""
    for o in mq.get("options") or []:
        if not isinstance(o, dict):
            out.append(opt_text(o))
            continue
        t = str(o.get("text") or "")
        img = o.get("image")
        if img:
            u = str(img)
            if base and not u.startswith("http"):
                u = str(base).rstrip("/") + "/" + u.lstrip("/")
            if u and u.lower() not in t.lower():
                t = (t + "\n" + html_img(u)).strip() if t else html_img(u)
        out.append(t)
    return out


def section_subject(title: str) -> str:
    t = str(title or "").lower()
    for k, v in SUBJ_MAP.items():
        if k in t:
            return v
    return str(title or "").split("-")[0].strip() or "Biology"


def usable_bank(q: dict) -> bool:
    t = norm_stem(q.get("q") or q.get("question") or "")
    opts = q.get("options") or []
    n = sum(1 for o in opts if str(opt_text(o)).strip())
    return bool(t) or any("<img" in str(opt_text(o)).lower() for o in opts) or n >= 2


def total_marks(official_n: int, duration: int, year: int, title: str) -> int:
    if "Re-NEET 2026 Mock" in title or year >= 2025:
        return 720
    if 2021 <= year <= 2024:
        return 720
    if official_n == 180:
        return 720
    if official_n == 120:
        return 480
    if official_n == 200:
        return 800
    return official_n * 4


def main():
    print("loading bank")
    raw = json.loads(BANK_PATH.read_text(encoding="utf-8"))
    qs = raw["questions"] if isinstance(raw, dict) else raw
    extra_keys = {k: v for k, v in raw.items() if k != "questions"} if isinstance(raw, dict) else {}
    by_id = {}
    by_mid = {}
    by_stem = defaultdict(list)
    by_src = defaultdict(list)
    for q in qs:
        if not q:
            continue
        i = str(q.get("id") or "")
        if i:
            by_id[i] = q
        m = str(q.get("_marksId") or "")
        if m:
            by_mid[m] = q
        st = norm_stem(q.get("q") or "")
        if len(st) >= 20:
            by_stem[st].append(q)
        by_src[str(q.get("source") or "").strip()].append(q)
    print("bank", len(qs), "stems", len(by_stem))

    files = sorted(p for p in PAPERS_DIR.glob("*.json") if p.name != "sample.json")
    papers_out = []
    id_lists = {}
    added = []
    used_ids_global = set()

    def match_bank(mq: dict, prefer_src: str):
        text = marks_q_html(mq)
        st = norm_stem(text)
        qid = str(mq.get("questionId") or mq.get("_id") or "")
        if qid and qid in by_mid:
            return by_mid[qid]
        if qid and qid in by_id:
            return by_id[qid]
        # prefer same source
        if st and prefer_src:
            for cand in by_src.get(prefer_src) or []:
                if norm_stem(cand.get("q") or "") == st:
                    return cand
        if st and st in by_stem:
            return by_stem[st][0]
        if len(st) >= 36:
            pre = st[:36]
            for k, arr in by_stem.items():
                if k.startswith(pre) or pre.startswith(k[:36]):
                    return arr[0]
        return None

    def ensure_q(mq: dict, title: str, sec_title: str, order: int, group: str):
        prefer = title if group == "neet" else ""
        hit = match_bank(mq, prefer)
        subj = section_subject(sec_title)
        if hit:
            # pin source for official NEET papers only; mocks use paper-id lists
            if group == "neet" and str(hit.get("source") or "").strip() != title:
                # don't steal a different official paper
                src = str(hit.get("source") or "")
                if src.startswith("NEET ") and src != title:
                    pass
                elif not src or src in ("MOG", "EM", "NTA", "NTAS1", "1", "Quizrr", "NET", "Marks"):
                    hit["source"] = title
            if not hit.get("subject") or hit.get("subject") in ("", "Biology") and subj in ("Botany", "Zoology", "Physics", "Chemistry"):
                if subj:
                    hit["subject"] = subj
            hit["_pyqOrder"] = order
            hit["_pyqSection"] = sec_title
            return hit
        # import Marks Q without inventing answer/solution
        qid = str(mq.get("questionId") or mq.get("_id") or f"pyqmt_{order}")
        nid = qid if qid not in by_id else f"pyqmt_{qid}"
        opts = marks_opts(mq)
        nq = {
            "id": nid,
            "subject": subj,
            "chapter": "",
            "exam": "Medical",
            "examName": "NEET",
            "q": marks_q_html(mq),
            "options": opts,
            "answer": None,
            "solution": "",
            "difficulty": "",
            "source": title,
            "_marksId": qid,
            "questionType": mq.get("type") or "singleCorrect",
            "type": mq.get("type") or "singleCorrect",
            "_pyqOrder": order,
            "_pyqSection": sec_title,
            "_from": "marks_pyqmt",
        }
        qs.append(nq)
        by_id[nid] = nq
        by_mid[qid] = nq
        st = norm_stem(nq["q"])
        if len(st) >= 20:
            by_stem[st].append(nq)
        by_src[title].append(nq)
        added.append({"id": nid, "source": title, "subject": subj})
        return nq

    for fp in files:
        j = json.loads(fp.read_text(encoding="utf-8"))
        td = (j.get("data") or {}).get("testData") or {}
        title = str(td.get("title") or "").strip()
        if not title:
            continue
        official_n = int(td.get("totalQuestions") or 0)
        duration = int(td.get("totalTime") or 180)
        group = "reneet" if title.startswith("Re-NEET 2026 Mock") else "neet"
        year_m = re.search(r"(20\d{2})", title)
        year = int(year_m.group(1)) if year_m else None
        order = 0
        ids = []
        subj_c = Counter()
        sections_meta = []
        for sec in td.get("sections") or []:
            sec_title = sec.get("title") or ""
            sec_qs = sec.get("questions") or []
            ms = sec.get("markingScheme") or {}
            sections_meta.append({
                "title": sec_title,
                "count": len(sec_qs),
                "maxAttempt": sec.get("maxAttemptLimit"),
                "correct": ms.get("positive", 4),
                "wrong": ms.get("negative", -1),
            })
            for mq in sec_qs:
                order += 1
                bq = ensure_q(mq, title, sec_title, order, group)
                bid = str(bq.get("id"))
                ids.append(bid)
                used_ids_global.add(bid)
                subj_c[bq.get("subject") or section_subject(sec_title)] += 1
        # trim/pad not done — Marks list is the paper
        if official_n and len(ids) > official_n:
            ids = ids[:official_n]
        rec = {
            "source": title,
            "count": len(ids),
            "officialCount": official_n or len(ids),
            "subjects": dict(subj_c),
            "year": year,
            "durationMin": duration,
            "totalMarks": total_marks(official_n or len(ids), duration, year or 0, title),
            "group": group,
            "testId": td.get("testId") or td.get("_id"),
            "sections": sections_meta,
            "scoring": {"correct": 4, "wrong": -1, "unattempted": 0},
        }
        papers_out.append(rec)
        id_lists[title] = ids
        print(f"{title}: official={official_n} got={len(ids)} added_now={sum(1 for a in added if a['source']==title)} time={duration}")

    # rebuild year index — Marks NEET module excludes Re-NEET 2026 mocks and 2026 cancelled
    by_year = defaultdict(list)
    for rec in papers_out:
        y = rec.get("year")
        if rec.get("group") == "reneet":
            by_year["2026-reneet"].append(rec)
        elif y:
            by_year[str(y)].append(rec)

    index = {}
    for y, arr in by_year.items():
        if y == "2026-reneet":
            continue
        # NEET module 2002-2025 only
        if not str(y).isdigit():
            continue
        yi = int(y)
        if yi < 2002 or yi > 2025:
            continue
        index[str(yi)] = arr
    # also keep 2026 reneet papers in index under 2026 for fallback year UI
    reneet = [r for r in papers_out if r.get("group") == "reneet"]
    if reneet:
        index["2026"] = reneet

    INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
    INDEX_PATH.write_text(json.dumps(index, ensure_ascii=False, indent=None, separators=(",", ":")), encoding="utf-8")
    IDS_PATH.parent.mkdir(parents=True, exist_ok=True)
    IDS_PATH.write_text(json.dumps(id_lists, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    modules = {
        "exam": "neet",
        "title": "PYQ Mock Tests",
        "modules": [
            {
                "id": "re-neet-2026",
                "title": "Re-NEET 2026 Special Mocks",
                "yearRange": [2026, 2026],
                "group": "reneet",
                "count": len(reneet),
                "qs": sum(p["officialCount"] for p in reneet),
                "durationMin": 180,
                "totalMarks": 720,
            },
            {
                "id": "neet",
                "title": "NEET",
                "yearRange": [2002, 2025],
                "group": "neet",
                "count": sum(1 for p in papers_out if p.get("group") == "neet" and 2002 <= (p.get("year") or 0) <= 2025),
                "qs": sum(p["officialCount"] for p in papers_out if p.get("group") == "neet" and 2002 <= (p.get("year") or 0) <= 2025),
            },
        ],
    }
    MOD_PATH.write_text(json.dumps(modules, ensure_ascii=False, indent=2), encoding="utf-8")

    out_obj = extra_keys if extra_keys else {}
    out_obj["questions"] = qs
    print("writing bank", len(qs), "added", len(added))
    BANK_PATH.write_text(json.dumps(out_obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    report = {
        "papers": [{"source": p["source"], "official": p["officialCount"], "count": p["count"], "year": p["year"], "group": p["group"], "durationMin": p["durationMin"], "totalMarks": p["totalMarks"]} for p in papers_out],
        "added": len(added),
        "added_sources": Counter(a["source"] for a in added).most_common(),
        "index_years": sorted(index.keys(), reverse=True),
        "modules": modules,
    }
    OUT_REP.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print("DONE papers", len(papers_out), "added", len(added))
    for p in papers_out:
        print(f"  {p['officialCount']:3d}Q {p['durationMin']:3d}min {p['totalMarks']:3d}m  {p['source']}")


if __name__ == "__main__":
    main()

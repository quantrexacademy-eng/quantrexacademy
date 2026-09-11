#!/usr/bin/env python3
"""Fill every Marks PYQ-MT paper to official N with unique IDs. Exact stem only. Never invents sols."""
from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "neet.json"
PAPERS = ROOT / "data" / "_migration" / "marks_pyqmt_probe" / "papers"
IDS_PATH = ROOT / "data" / "nav" / "pyq_paper_ids" / "neet.json"
INDEX_PATH = ROOT / "data" / "nav" / "pyq_paper_index" / "neet.json"


def norm(s):
    t = re.sub(r"<[^>]+>", " ", str(s or ""))
    t = re.sub(r"[^a-z0-9]+", " ", t.lower())
    return re.sub(r"\s+", " ", t).strip()


def html_img(url):
    u = str(url or "").strip()
    if not u:
        return ""
    if u.startswith("//"):
        u = "https:" + u
    return f'<img src="{u}" alt="">'


def combine_q(mq):
    qq = mq.get("question") or {}
    text = str(qq.get("text") or "")
    img = qq.get("image")
    base = mq.get("imageBaseUrl") or ""
    if img:
        u = str(img)
        if base and not str(u).startswith("http"):
            u = str(base).rstrip("/") + "/" + str(u).lstrip("/")
        if u and u.lower() not in text.lower():
            text = (text + "\n" + html_img(u)).strip() if text else html_img(u)
    return text


def combine_opts(mq):
    out = []
    base = mq.get("imageBaseUrl") or ""
    for o in mq.get("options") or []:
        if not isinstance(o, dict):
            out.append(str(o or ""))
            continue
        t = str(o.get("text") or "")
        img = o.get("image")
        if img:
            u = str(img)
            if base and not str(u).startswith("http"):
                u = str(base).rstrip("/") + "/" + str(u).lstrip("/")
            if u and u.lower() not in t.lower():
                t = (t + "\n" + html_img(u)).strip() if t else html_img(u)
        out.append(t)
    return out


def sec_subj(title):
    t = str(title or "").lower()
    for k, v in (("physics", "Physics"), ("chemistry", "Chemistry"), ("botany", "Botany"), ("zoology", "Zoology"), ("biology", "Biology")):
        if k in t:
            return v
    return "Biology"


def main():
    raw = json.loads(BANK.read_text(encoding="utf-8"))
    qs = raw["questions"]
    extra = {k: v for k, v in raw.items() if k != "questions"}
    by_id = {}
    by_mid = {}
    by_stem = defaultdict(list)
    for q in qs:
        if not q:
            continue
        i = str(q.get("id") or "")
        if i:
            by_id[i] = q
        m = str(q.get("_marksId") or "")
        if m:
            by_mid[m] = q
        st = norm(q.get("q") or "")
        if len(st) >= 20:
            by_stem[st].append(q)

    added = 0
    new_ids = {}
    for fp in sorted(p for p in PAPERS.glob("*.json") if p.name != "sample.json"):
        j = json.loads(fp.read_text(encoding="utf-8"))
        td = (j.get("data") or {}).get("testData") or {}
        title = str(td.get("title") or "").strip()
        official = int(td.get("totalQuestions") or 0)
        used = set()
        ids = []
        order = 0
        for sec in td.get("sections") or []:
            subj = sec_subj(sec.get("title"))
            for mq in sec.get("questions") or []:
                order += 1
                qid = str(mq.get("questionId") or mq.get("_id") or "")
                hit = None
                if qid and qid in by_mid and str(by_mid[qid].get("id")) not in used:
                    hit = by_mid[qid]
                if not hit:
                    st = norm(combine_q(mq))
                    for cand in by_stem.get(st) or []:
                        if str(cand.get("id")) not in used:
                            hit = cand
                            break
                if not hit:
                    nid = qid if qid and qid not in by_id else f"pyqmt_{qid}_{order}"
                    nq = {
                        "id": nid,
                        "subject": subj,
                        "chapter": "",
                        "exam": "Medical",
                        "examName": "NEET",
                        "q": combine_q(mq),
                        "options": combine_opts(mq),
                        "answer": None,
                        "solution": "",
                        "difficulty": "",
                        "source": title,
                        "_marksId": qid,
                        "questionType": mq.get("type") or "singleCorrect",
                        "type": mq.get("type") or "singleCorrect",
                        "_pyqOrder": order,
                        "_pyqSection": sec.get("title") or "",
                        "_from": "marks_pyqmt",
                    }
                    qs.append(nq)
                    by_id[nid] = nq
                    if qid:
                        by_mid[qid] = nq
                    st = norm(nq["q"])
                    if len(st) >= 20:
                        by_stem[st].append(nq)
                    hit = nq
                    added += 1
                bid = str(hit.get("id"))
                ids.append(bid)
                used.add(bid)
        new_ids[title] = ids
        print(f"{title}: official={official} got={len(ids)} unique={len(used)}")

    extra["questions"] = qs
    BANK.write_text(json.dumps(extra, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    IDS_PATH.write_text(json.dumps(new_ids, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    idx = json.loads(INDEX_PATH.read_text(encoding="utf-8"))
    subj_cache = {}
    for title, idlist in new_ids.items():
        c = Counter()
        for i in idlist:
            q = by_id.get(i)
            if q and q.get("subject"):
                c[q["subject"]] += 1
        subj_cache[title] = dict(c)
    for y, papers in idx.items():
        for p in papers:
            src = p["source"]
            n = len(new_ids.get(src) or [])
            p["count"] = p.get("officialCount") or n
            if subj_cache.get(src):
                p["subjects"] = subj_cache[src]
    INDEX_PATH.write_text(json.dumps(idx, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("added", added, "bank", len(qs))


if __name__ == "__main__":
    main()

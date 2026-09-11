"""Build offline NCERT pack from extracted allQsBank (exclude PYQ + similar-bundle)."""
import json
import re
from pathlib import Path

SRC = Path(r"E:\quantrexacademy\marks_data\medical_live\allQsBank")
OUT = Path(r"C:\Users\Admin\qx-hosting\data\ncert_offline")
OUT.mkdir(parents=True, exist_ok=True)


def qtext(d):
    q = d.get("question") or {}
    if isinstance(q, dict):
        return str(q.get("text") or "")
    return str(q or "")


def norm_q(d, subject, chapter):
    opts = d.get("options") or []
    texts = []
    ans = 0
    for i, o in enumerate(opts):
        if isinstance(o, dict):
            texts.append(str(o.get("text") or ""))
            if o.get("isCorrect"):
                ans = i
        else:
            texts.append(str(o))
    sol = d.get("solution") or {}
    sol_t = sol.get("text") if isinstance(sol, dict) else str(sol or "")
    qid = d.get("_id") or d.get("id")
    return {
        "id": "ncert_" + str(qid),
        "_marksId": str(qid),
        "q": qtext(d),
        "options": texts,
        "answer": ans,
        "solution": sol_t or "",
        "subject": subject,
        "chapter": chapter,
        "exam": "NCERT",
        "examName": "NCERT",
        "_bank": "ncert",
        "questionType": d.get("type") or "mcq",
    }


def is_ncert(path: Path, d: dict) -> bool:
    if d.get("previousYearPapers"):
        return False
    if path.stem.startswith("6a7ebea3"):
        return False
    return True


def classify(d):
    t = qtext(d).lower()
    if re.search(r"assertion|reason", t):
        return "Assertion Reason Qs"
    if re.search(r"match the|column|list[\s\-]*i", t):
        return "Matrix Match Qs"
    if re.search(r"which of the following statements|incorrect statement|correct statements", t):
        return "Multi Statement Qs"
    if "<img" in t or "diagram-based" in t:
        return "Diagram Based Qs"
    if re.search(r"exemplar", t):
        return "NCERT Exemplar Qs"
    return "NCERT Exercises Qs"


index = {"subjects": []}
total = 0

for subj_dir in sorted(SRC.iterdir()):
    if not subj_dir.is_dir() or subj_dir.name.startswith("."):
        continue
    ch_root = subj_dir / "chapters"
    if not ch_root.exists():
        continue
    subj = {"name": subj_dir.name, "chapters": []}
    for ch_dir in sorted(ch_root.iterdir()):
        if not ch_dir.is_dir():
            continue
        cache = ch_dir / "questions_cache"
        detail_p = ch_dir / "detail.json"
        qs = []
        by_set = {}
        if cache.exists():
            for f in cache.glob("*.json"):
                try:
                    j = json.loads(f.read_text(encoding="utf-8"))
                except Exception:
                    continue
                d = j.get("data") if isinstance(j, dict) and "data" in j else j
                if not isinstance(d, dict) or not is_ncert(f, d):
                    continue
                nq = norm_q(d, subj_dir.name, ch_dir.name)
                qs.append(nq)
                key = classify(d)
                by_set.setdefault(key, []).append(nq["id"])
        set_names = []
        if detail_p.exists():
            try:
                det = json.loads(detail_p.read_text(encoding="utf-8"))
                mods = ((det.get("data") or {}).get("modules") or [])
                for m in mods:
                    if m.get("moduleType") != "ncertBasedQs":
                        continue
                    for s in m.get("questionSets") or []:
                        title = s.get("title") or "NCERT"
                        set_names.append({"title": title, "count": s.get("questionCount") or 0})
            except Exception:
                pass
        if not qs:
            continue
        if not set_names:
            set_names = [{"title": k, "count": len(v)} for k, v in by_set.items()]
        # attach ids: prefer classified; if empty for a named set, leave empty and client uses all
        sets_out = []
        for s in set_names:
            ids = by_set.get(s["title"]) or []
            sets_out.append({"title": s["title"], "count": len(ids) or s["count"], "ids": ids})
        sets_out.insert(0, {"title": "All NCERT", "count": len(qs), "ids": [q["id"] for q in qs]})
        slug = re.sub(r"[^a-z0-9]+", "_", (subj_dir.name + "__" + ch_dir.name).lower()).strip("_")
        ch_file = OUT / "chapters" / (slug + ".json")
        ch_file.parent.mkdir(parents=True, exist_ok=True)
        ch_file.write_text(json.dumps({"questions": qs}, ensure_ascii=False), encoding="utf-8")
        subj["chapters"].append({
            "name": ch_dir.name,
            "count": len(qs),
            "file": "data/ncert_offline/chapters/" + slug + ".json",
            "sets": [{"title": s["title"], "count": s["count"]} for s in sets_out],
        })
        total += len(qs)
    if subj["chapters"]:
        index["subjects"].append(subj)

(OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
print("subjects", [(s["name"], len(s["chapters"])) for s in index["subjects"]])
print("ncert_questions", total)

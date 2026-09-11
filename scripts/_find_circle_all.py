from pathlib import Path
import json
need = "point of intersection of AQ and BP"
root = Path(r"C:\Users\Admin\qx-hosting\data")
areas = [
    root / "banks",
    root / "tests" / "jee_main_examgoal_2027" / "questions",
    root / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
    root / "books" / "chapters",
]
for area in areas:
    files = [area] if area.is_file() else list(area.rglob("*.json"))
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        try:
            t = fp.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        if need not in t and "AQ and BP" not in t:
            continue
        try:
            data = json.loads(t)
        except Exception:
            print("PARSE", fp)
            continue
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        for q in qs:
            raw = str(q.get("q") or "")
            if "AQ and BP" not in raw and "AQ and BP" not in str(q.get("options")):
                continue
            print("====", fp.relative_to(root), "ID", q.get("id"))
            for i, o in enumerate(q.get("options") or []):
                print(" ", i, repr(str(o)[:180]))

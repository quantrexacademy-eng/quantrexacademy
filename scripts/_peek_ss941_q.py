from pathlib import Path
import json
files = [
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_quizrr_pyq_chapter\questions\qz-69de22007e39d99b57bc5c02.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_quizrr_pyq_chapter\questions\qz-69de22007e39d99b57bc5c03.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_quizrr_pyq_chapter\questions\qz-69de22007e39d99b57bc5c04.json"),
    Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_examgoal_2027\questions\tst-19g61mo679g17.json"),
]
for fp in files:
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    print("====", fp.name, "n", len(qs) if isinstance(qs, list) else "?")
    for q in (qs or []):
        raw = str(q.get("q") or "")
        if "discontinuous" in raw or "spin-only" in raw or "lim_" in raw.replace("\\", "") or r"\lim" in raw:
            print("ID", q.get("id"))
            print(repr(raw[:700]))
            print("OPTS", q.get("options"))
            print("---")

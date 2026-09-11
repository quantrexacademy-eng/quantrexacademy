#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
FIX = {
    "qz_69de4f312ee0e063d924daf5": {
        "q": (
            "The moment of inertia of a solid disc rotating along its diameter is 2.5 times higher than the moment of inertia of a ring rotating in similar way. "
            "The moment of inertia of a solid sphere which has same radius as the disc and rotating in similar way, is $n$ times higher than the moment of inertia of the given ring. "
            "Here, $\\mathrm{n}=$ _________.\nConsider all the bodies have equal masses."
        )
    },
    "qz_69de4ef9c677dc36a88f5be8": {
        "append_sol_dollar": True
    },
    "qz_69de4f232ee0e063d9241cc1": {
        "solution_replace": (
            "LiAlH _{4}$ is a nucleophilic reducing agent",
            "$\\mathrm{LiAlH}_{4}$ is a nucleophilic reducing agent",
        )
    },
}
n = 0
for fp in (ROOT / "data/tests/jee_main_quizrr_pyq_chapter/questions").glob("qz-*.json"):
    data = json.loads(fp.read_text(encoding="utf-8"))
    dirty = False
    for q in data.get("questions") or []:
        spec = FIX.get(q.get("id"))
        if not spec:
            continue
        if "q" in spec:
            q["q"] = spec["q"]
            dirty = True
        if spec.get("append_sol_dollar"):
            sol = str(q.get("solution") or "")
            if not sol.rstrip().endswith("$"):
                q["solution"] = sol.rstrip() + "$"
                dirty = True
        if "solution_replace" in spec:
            a, b = spec["solution_replace"]
            q["solution"] = str(q.get("solution") or "").replace(a, b)
            dirty = True
        n += 1
    if dirty:
        fp.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("fixed", n)

#!/usr/bin/env python3
"""Fill Quizrr PYQ empty solutions from official Marks cache/API when _marksId exists."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
sys.path.insert(0, str(ROOT / "scripts"))
import hydrate_books_from_marks as H  # noqa: E402

QDIR = ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions"


def main():
    stats = {"qs": 0, "noSol": 0, "withMarks": 0, "applied": 0, "files": 0, "api": 0, "miss": 0}
    for fp in sorted(QDIR.glob("qz-*.json")):
        data = json.loads(fp.read_text(encoding="utf-8"))
        qs = data.get("questions") or []
        chg = False
        for q in qs:
            stats["qs"] += 1
            sol = H.strip(q.get("solution") or q.get("explanation") or "")
            if sol or ("<img" in str(q.get("solution") or "").lower()):
                continue
            stats["noSol"] += 1
            mid = q.get("_marksId")
            if not mid:
                continue
            stats["withMarks"] += 1
            rec, src = H.fetch_full(mid)
            if src == "api":
                stats["api"] += 1
                time.sleep(H.SLEEP)
            if rec and rec.get("solution") and len(H.strip(rec["solution"])) > 8:
                q["solution"] = rec["solution"]
                q["explanation"] = rec["solution"]
                q["_resolvedFrom"] = "marks_official_sol"
                stats["applied"] += 1
                chg = True
            elif not rec:
                stats["miss"] += 1
        if chg:
            data["questions"] = qs
            fp.write_text(json.dumps(data), encoding="utf-8")
            stats["files"] += 1
    print(json.dumps(stats, indent=2), flush=True)


if __name__ == "__main__":
    main()

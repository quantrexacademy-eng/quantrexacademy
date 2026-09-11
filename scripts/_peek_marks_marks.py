#!/usr/bin/env python3
import json
from pathlib import Path

papers = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\papers")
for name in [
    "neet_2002_67efe2de5c97f0fe143c9913.json",
    "neet_2012_67efde3d5c97f0fe143c8e05.json",
    "neet_2013_67efdda25c97f0fe143c8c94.json",
    "neet_2021_67efd9e85c97f0fe143c83cd.json",
    "neet_2025_682f09e63c12124fd1b20ddd.json",
    "reneet_2026_6a0e2790f57283eedd1bd049.json",
]:
    j = json.loads((papers / name).read_text(encoding="utf-8"))
    td = j["data"]["testData"]
    print("\n==", td.get("title"), "Q", td.get("totalQuestions"), "T", td.get("totalTime"))
    print(" keys extra", [k for k in td.keys() if "mark" in k.lower() or "score" in k.lower() or "limit" in k.lower()])
    for sec in td.get("sections") or []:
        print(" ", sec.get("title"), "n", len(sec.get("questions") or []), "ms", sec.get("markingScheme"), "maxAttempt", sec.get("maxAttemptLimit"))

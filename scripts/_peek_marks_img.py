#!/usr/bin/env python3
import json
from pathlib import Path

fp = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\papers\neet_2025_682f09e63c12124fd1b20ddd.json")
j = json.loads(fp.read_text(encoding="utf-8"))
n_img = 0
n_opt_img = 0
n_q = 0
sample = None
for sec in j["data"]["testData"]["sections"]:
    for q in sec["questions"]:
        n_q += 1
        qq = q.get("question") or {}
        if qq.get("image"):
            n_img += 1
            if not sample:
                sample = {"sec": sec["title"], "image": qq.get("image"), "imageBaseUrl": q.get("imageBaseUrl"), "text": (qq.get("text") or "")[:120], "opts": q.get("options")[:1], "masterId": q.get("masterId"), "qid": q.get("questionId")}
        for o in q.get("options") or []:
            if isinstance(o, dict) and o.get("image"):
                n_opt_img += 1
print("n", n_q, "stem_img", n_img, "opt_img", n_opt_img)
print("SAMPLE", json.dumps(sample, indent=2)[:1500])

# also reneet mock 1
fp2 = Path(r"C:\Users\Admin\qx-hosting\data\_migration\marks_pyqmt_probe\papers\reneet_2026_6a0e2790f57283eedd1bd049.json")
j2 = json.loads(fp2.read_text(encoding="utf-8"))
print("RENEET title", j2["data"]["testData"]["title"], "n", j2["data"]["testData"]["totalQuestions"], "time", j2["data"]["testData"]["totalTime"])
q0 = j2["data"]["testData"]["sections"][0]["questions"][0]
print("R0", q0.get("masterId"), (q0.get("question") or {}).get("text","")[:160], "src", q0.get("source"))

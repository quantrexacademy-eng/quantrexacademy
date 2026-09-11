#!/usr/bin/env python3
import json
from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting")
QDIR = ROOT / "data/tests/jee_main_quizrr_pyq_chapter/questions"
rep = json.loads((ROOT/"data/_migration/pyq_mock_proof.json").read_text(encoding="utf-8"))

def find_q(qid):
    for fp in QDIR.glob("qz-*.json"):
        data = json.loads(fp.read_text(encoding="utf-8"))
        for q in data.get("questions") or []:
            if q.get("id") == qid:
                return data.get("title"), q
    return None, None

print("=== LETTER STUB sample options ===")
qid = rep["samples"]["letter_stub_options"][0]["id"]
t, q = find_q(qid)
print("title", t, "id", qid)
print("type", q.get("questionType"), q.get("type"))
print("opts", json.dumps(q.get("options"), ensure_ascii=False)[:800])
print("answer", q.get("answer"), "answers", q.get("answers"))

print("\n=== NAT sample ===")
qid = rep["samples"]["nat_no_answer"][0]["id"]
t, q = find_q(qid)
print("title", t, "id", qid)
print("type", q.get("questionType"), q.get("type"))
print("keys", sorted(q.keys()))
print("answer", q.get("answer"), "answers", q.get("answers"), "correct", q.get("correct"), "nat", q.get("natAnswer"), q.get("numericalAnswer"), q.get("integerAnswer"))
print("opts", q.get("options"))
print("q", str(q.get("q"))[:400])

print("\n=== UNBALANCED STEM full ===")
qid = "qz_69de4f1f2ee0e063d923dcdd"
t, q = find_q(qid)
print(repr(q.get("q")[-200:] if q else None))

print("\n=== MISSING FIG samples ===")
for s in rep["samples"].get("missing_local_fig", []):
    print(s["id"], s.get("miss"), s["q"][:120])

print("\n=== REMOTE CDN ===")
for s in rep["samples"].get("remote_cdn_fig", []):
    print(s["id"], s.get("remote"), s["q"][:120])

print("\n=== QCOUNT not 25 ===")
print(json.dumps(rep["qcount_not_25_samples"], indent=2)[:1500])

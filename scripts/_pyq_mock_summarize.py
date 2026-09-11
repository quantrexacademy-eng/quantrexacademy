#!/usr/bin/env python3
import json
from pathlib import Path
p = Path(r"C:\Users\Admin\qx-hosting\data\_migration\pyq_mock_all_papers_proof.json")
r = json.loads(p.read_text(encoding="utf-8"))
print("=== TOP PAPERS BY WRONG ===")
papers = r["papers_with_issues"]
papers_sorted = sorted(papers, key=lambda x: -x["n_wrong"])
for x in papers_sorted[:20]:
    print(f"{x['n_wrong']:3} / {x['n']:3}  {x['paper']}  {x['flags']}")
print("\n=== HTML_IN_MATH samples ===")
for s in r["samples"].get("html_in_math", []):
    print(s)
print("\n=== LETTER STUBS ===")
for s in r["samples"].get("letter_stubs", []):
    print(s)
print("\n=== STEM ONLY DEAD ===")
for s in r["samples"].get("stem_only_dead_fig", []):
    print(s)
print("\n=== missing fig samples ===")
for s in r["samples"].get("missing_local_fig", []):
    print(s)
print("papers_with_issues", len(papers), "of", r["papers"])
# display-critical only
crit = ("html_in_math", "unbalanced_dollar_stem", "missing_local_fig", "stem_only_dead_fig", "empty_stem", "letter_stubs", "dead_alcohol_prep")
n_papers_crit = 0
for x in papers:
    if any(k in crit for k in x.get("flags", {})):
        n_papers_crit += 1
print("papers with display-critical flags", n_papers_crit)

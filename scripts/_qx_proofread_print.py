import json
p = r"E:\QUANTREX\website\data\_migration\qx_proofread_qsol_fig.json"
r = json.load(open(p, encoding="utf-8"))
print("QUESTIONS", r["questions"], "FILES", r["files"])
print("COUNTS", json.dumps(r["issue_counts"], indent=2))
sr = r["sets_and_relations"]
print("SETS_REL", json.dumps(sr["by_kind"], indent=2), "n", sr["n_issues"])
for it in sr["issues"]:
    print("SR", it["kind"], "id="+str(it["id"]), "nat="+str(it["nat"]), (it.get("detail") or "")[:100])
print("---SAMPLES---")
for k, v in r["samples"].items():
    print("KIND", k, "n", r["issue_counts"].get(k))
    for it in v[:5]:
        print(" ", it["exam"]+"/"+it["chapter"], "id="+str(it["id"]), (it.get("detail") or "")[:110])
print("---EXAM---")
rows = []
for ex, c in r["by_exam"].items():
    rows.append((
        c.get("sol_missing_placeholder", 0) + c.get("sol_too_short", 0),
        ex,
        c.get("sol_missing_placeholder", 0),
        c.get("sol_too_short", 0),
        c.get("fig_talk_no_image", 0),
        c.get("mcq_empty_or_letter_opts", 0),
        c.get("stem_empty_or_stub", 0),
        c.get("nat_no_correct_value", 0),
    ))
for row in sorted(rows, reverse=True)[:20]:
    print(row)

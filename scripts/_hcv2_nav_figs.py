#!/usr/bin/env python3
"""Classify HCV Vol 2 figure srcs by nav-key chapters students actually open."""
from pathlib import Path
import json, re, collections
ROOT = Path(r"C:\Users\Admin\qx-hosting")
d = ROOT / "data/books/chapters/6a0addba4b032b031e049a36"
SRC = re.compile(r"""<img\b[^>]*src\s*=\s*['\"]([^'\"]+)['\"]""", re.I)
nav = json.loads((ROOT / "data/nav/books/6a0addba4b032b031e049a36.json").read_text(encoding="utf-8"))
keys = []
for mod in nav.get("modules") or []:
    for sub in mod.get("subjects") or []:
        for ch in sub.get("chapters") or []:
            keys.append((mod.get("title"), ch.get("name"), ch.get("key"), ch.get("count")))
            for ex in ch.get("exercises") or []:
                keys.append((mod.get("title") + "/" + (ex.get("name") or "ex"), ch.get("name"), ex.get("key"), ex.get("count")))

hosts = collections.Counter()
by_mod = collections.Counter()
empty_fig_ch = []
samples = []
for title, name, key, count in keys:
    fp = d / f"{key}.json"
    if not fp.exists():
        print("NOFILE", title, name, key)
        continue
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    nq = len(qs) if isinstance(qs, list) else 0
    nfig = 0
    for q in (qs or []):
        blob = str(q.get("q") or "") + " " + " ".join(str(o) for o in (q.get("options") or []))
        urls = SRC.findall(blob)
        if urls:
            nfig += 1
            for u in urls:
                u2 = u.split("?")[0]
                if "qx-book-" in u2:
                    hosts["qx-book"] += 1
                elif "hcv-v2-" in u2:
                    hosts["hcv-v2"] += 1
                elif "getmarks" in u2 or "cdn-question" in u2:
                    hosts["getmarks"] += 1
                elif "quizrr" in u2:
                    hosts["quizrr"] += 1
                elif "/assets/diagrams/" in u2:
                    hosts["other-diagrams"] += 1
                    if len(samples) < 8:
                        samples.append((title, name, q.get("id"), u2[-80:]))
                else:
                    hosts["other"] += 1
                    if len(samples) < 8:
                        samples.append((title, name, q.get("id"), u2[:100]))
    by_mod[title.split("/")[0]] += nfig
    if nfig == 0 and nq:
        empty_fig_ch.append((title, name, nq, key[-20:]))

print("HOSTS", dict(hosts))
print("FIGS_BY_MODULE", dict(by_mod))
print("NAV_CHAPTERS", len(keys), "NO_FIG_CHAPTERS", len(empty_fig_ch))
for row in empty_fig_ch[:15]:
    print(" empty", row)
print("SAMPLES", samples)

# first figure question in Objective I Capacitors + Exercises Capacitors
for want in (
    "6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18427d__6a2fdc56afb6d6932c184280__6a2fdc56afb6d6932c184281",
    "6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c18272f",
):
    fp = d / f"{want}.json"
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data["questions"]
    figs = [(q["id"], SRC.findall(str(q.get("q") or ""))) for q in qs]
    with_fig = [(i, u) for i, u in figs if u]
    print("FILE", want[-20:], "nq", len(qs), "withFig", len(with_fig), "first", with_fig[:3])

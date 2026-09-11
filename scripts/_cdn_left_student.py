from pathlib import Path
import re, json, urllib.request, urllib.parse
ROOT = Path(r"C:\Users\Admin\qx-hosting")
CDN = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)""",
    re.I,
)
AREAS = [
    ROOT / "data" / "banks",
    ROOT / "data" / "books" / "chapters",
    ROOT / "data" / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
    ROOT / "data" / "tests" / "jee_main_examgoal_2027" / "questions",
    ROOT / "data" / "formulas.json",
    ROOT / "data" / "ncert_offline" / "chapters",
    ROOT / "data" / "board_offline" / "chapters",
    ROOT / "data" / "board_hsc_offline" / "chapters",
]
hits = []
uniq = set()
CDN_FULL = re.compile(
    r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'<>\\]+""",
    re.I,
)
for area in AREAS:
    files = [area] if area.is_file() else list(area.rglob("*.json") if area.exists() else [])
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        t = fp.read_text(encoding="utf-8", errors="ignore")
        n = len(CDN.findall(t))
        if n:
            hits.append((str(fp.relative_to(ROOT)), n))
            for u in CDN_FULL.findall(t.replace("\\/", "/")):
                uniq.add(u.split("?")[0])
hits.sort(key=lambda x: -x[1])
print("files", len(hits), "mentions", sum(x[1] for x in hits), "unique", len(uniq))
for h in hits[:15]:
    print(" ", h)
print("uniq_sample")
for u in sorted(uniq)[:12]:
    print(" ", u[:160])

# HEAD a formula firebase url from mapping
MAP = json.loads((ROOT / "data/_migration/selfdep_url_map.json").read_text(encoding="utf-8"))
formula = next((v for k, v in (MAP.get("map") or {}).items() if "formula_card" in k and "Centre of mass" in k), None)
print("formula_src", formula)
if formula:
    req = urllib.request.Request(formula, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print("formula_HEAD", r.status, r.headers.get("Content-Type"), r.headers.get("Content-Length"))
    except Exception as e:
        print("formula_HEAD_ERR", type(e).__name__, e)

ap = next((v for k, v in (MAP.get("map") or {}).items() if "AP EAMCET" in k), None)
print("ap_src", (ap or "")[:120])
if ap:
    req = urllib.request.Request(ap, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print("ap_HEAD", r.status, r.headers.get("Content-Type"), r.headers.get("Content-Length"))
    except Exception as e:
        print("ap_HEAD_ERR", type(e).__name__, e)

# glue leftover
for name in ("dpp.json", "kvpy.json", "mht_cet.json"):
    t = (ROOT / "data/banks" / name).read_text(encoding="utf-8", errors="ignore")
    print(name, "glue", t.count("$$\\mathrm{"), "gm", t.count("cdn-question-pool.getmarks.app"))

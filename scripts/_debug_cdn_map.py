from pathlib import Path
import json, re, urllib.parse
ROOT = Path(r"C:\Users\Admin\qx-hosting")
MAP = json.loads((ROOT / "data/_migration/selfdep_url_map.json").read_text(encoding="utf-8"))
NEED = (ROOT / "data/_migration/selfdep_need_download.txt").read_text(encoding="utf-8").splitlines()
mapping = MAP.get("map") or {}
print("map", len(mapping), "need", len(NEED), "have", MAP.get("have"), "skip", MAP.get("skip_non_image"))
print("map_sample", list(mapping.keys())[:5])
print("need_sample", NEED[:8])
print("need_formula", sum(1 for u in NEED if "formula" in u.lower()))
print("need_ap", sum(1 for u in NEED if "EAMCET" in u or "eamcet" in u.lower()))
print("need_pool", sum(1 for u in NEED if "cdn-question-pool" in u))
print("need_assets", sum(1 for u in NEED if "cdn-assets" in u))
print("map_pool", sum(1 for u in mapping if "cdn-question-pool" in u))
print("map_assets", sum(1 for u in mapping if "cdn-assets" in u))

# remaining CDN in banks after rewrite
CDN = re.compile(r"""https?://(?:cdn-question-pool\.getmarks\.app|cdn-assets\.getmarks\.app|cdn\.quizrr\.in|app-content\.cdn\.examgoal\.net)[^\"'<>\\]+""", re.I)
left = {}
for fp in [
    ROOT / "data/banks/ap_eamcet.json",
    ROOT / "data/formulas.json",
    ROOT / "data/banks/dpp.json",
]:
    if not fp.exists():
        continue
    t = fp.read_text(encoding="utf-8", errors="ignore").replace("\\/", "/")
    found = [CDN.search(t[m.start():m.start()+200]).group(0) if False else None for m in []]
    urls = [CDN.findall(t)]
    u = CDN.findall(t)
    print(fp.name, "mentions", len(u), "uniq", len(set(map(lambda x: x.split('?')[0], u))))
    if u:
        print("  first", u[0][:140])

# is a space AP url in map?
ap = [k for k in mapping if "AP EAMCET" in k][:3]
print("mapped AP EAMCET", len([k for k in mapping if "AP EAMCET" in k]), ap[:1])
need_ap_s = [u for u in NEED if "AP EAMCET" in u][:3]
print("need AP EAMCET", len([u for u in NEED if "AP EAMCET" in u]), need_ap_s[:1])

# check one expected firebase rel
rel = "questions/figs/without_watermark/AP EAMCET/2025_questions/n0engxu_6AB-enuiC3qWQtJWMOLP9e6yBvRxoVGEp8Q.original.fullsize.png"
lst = (ROOT / "data/_migration/firebase_figs_list.txt").read_bytes()
text = lst.decode("utf-16") if lst[:2] == b"\xff\xfe" else lst.decode("utf-8", "ignore")
print("list_has_n0engxu", "n0engxu_6AB" in text)
print("list_has_AP_EAMCET", "AP EAMCET" in text)

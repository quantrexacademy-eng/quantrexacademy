import json
import re
from pathlib import Path

ROOT = Path(r"E:\quantrexacademy")
CHAPTER = ROOT / (
    "data/books/chapters/6a0addba4b032b031e049a36/"
    "6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__"
    "6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c183850.json"
)
OVERRIDES = ROOT / "data/qx_figure_overrides.json"
MANIFEST = ROOT / "data/hcv-em-induction-figures-manifest.json"

manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
url_to_local = {}
rules = []

for fig in manifest["figures"]:
    fid = fig["id"]
    local = f"/assets/diagrams/hcv-v2-em-induction-{fid}.png"
    old = fig["src"]
    url_to_local[old] = local
    rules.append({
        "urlRx": re.escape(old.rsplit("/", 1)[-1]),
        "clean": local,
    })

# legacy two-boys path -> e3
rules.append({
    "urlRx": "hcv-v2-em-induction-ex23-24-two-boys-rhombus\\.png",
    "clean": "/assets/diagrams/hcv-v2-em-induction-e3.png",
})

with CHAPTER.open(encoding="utf-8") as f:
    data = json.load(f)

img_tag_tpl = '<img style="width: 605px" src="{src}" alt="HC Verma EM Induction figure" class="qx-pool-fig" />'
replaced = [0]

def repl_img(m):
    src = m.group(1)
    key = None
    for old_url, local in url_to_local.items():
        if src == old_url or old_url.rsplit("/", 1)[-1] in src:
            key = local
            break
    if not key:
        m2 = re.search(r"figure_38_(e\d+)", src)
        if m2:
            key = f"/assets/diagrams/hcv-v2-em-induction-{m2.group(1)}.png"
    if not key and "hcv-v2-em-induction" in src:
        return m.group(0)
    if key:
        replaced[0] += 1
        return img_tag_tpl.format(src=key)
    return m.group(0)

for q in data.get("questions", []):
    for field in ("q", "solution"):
        text = q.get(field) or ""
        if not text:
            continue
        q[field] = re.sub(r'<img[^>]*src=["\']([^"\']+)["\'][^>]*>', repl_img, text)

with CHAPTER.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

overrides = {
    "version": 3,
    "rules": rules,
}

OVERRIDES.write_text(json.dumps(overrides, indent=2, ensure_ascii=False), encoding="utf-8")
print("patched chapter, replacements:", replaced[0])
print("override rules:", len(rules))
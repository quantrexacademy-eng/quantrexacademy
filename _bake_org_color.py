"""Point Organic book JSON at local multi-color qx-org figures."""
import json
import re
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CH_DIR = ROOT / "data" / "books" / "chapters" / "6a4ce383c59a7b462185330f"
MAN = json.loads((ROOT / "data" / "qx_organic_figure_manifest.json").read_text(encoding="utf-8"))
MP = MAN.get("map") or {}
BY = {}
for k, v in MP.items():
    if not v:
        continue
    path = v if str(v).startswith("/") else "/" + str(v)
    BY[k] = path
    BY[k.split("?")[0]] = path
    BY[k.split("/")[-1].split("?")[0]] = path

SRC_RX = re.compile(r"""src=(["'])([^"']+)\1""", re.I)
mapped = left = 0


def loc(src):
    if "/assets/diagrams/qx-org-" in src:
        return src.split("?")[0]
    return BY.get(src) or BY.get(src.split("?")[0]) or BY.get(src.split("/")[-1].split("?")[0])


def rewrite(blob):
    global mapped, left

    def repl(m):
        global mapped, left
        q, src = m.group(1), m.group(2)
        p = loc(src)
        if p:
            mapped += 1
            return f"src={q}{p}{q}"
        if "quizrr" in src or "watermarked" in src or "organic_book" in src:
            left += 1
        return m.group(0)

    return SRC_RX.sub(repl, blob)


def walk(q):
    for k in ("q", "solution"):
        if isinstance(q.get(k), str) and "src=" in q[k]:
            q[k] = rewrite(q[k])
    if isinstance(q.get("options"), list):
        q["options"] = [
            rewrite(o) if isinstance(o, str) and "src=" in o else o for o in q["options"]
        ]


for f in CH_DIR.glob("*.json"):
    d = json.loads(f.read_text(encoding="utf-8"))
    for q in d.get("questions") or []:
        walk(q)
    f.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("wrote", f.name)

print("mapped", mapped, "left_quizrr", left)

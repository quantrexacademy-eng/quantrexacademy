import json
import re
from pathlib import Path

ROOT = Path(r"E:\quantrexacademy")
NEW_SRC = "/assets/diagrams/hcv-v2-em-induction-ex23-24-two-boys-rhombus.png"
OLD_FRAGMENT = "chapter_38_electromagnetic_induction_figure_38_e3.png"
IMG_TAG = (
    f'<img style="width: 605px" src="{NEW_SRC}" '
    'alt="Two boys pulling square metallic frame in magnetic field" class="qx-pool-fig" />'
)
TARGET_IDS = {304170, 304171, 304172}

chapter_file = ROOT / "data/books/chapters/6a0addba4b032b031e049a36" / (
    "6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__"
    "6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c183850.json"
)

with chapter_file.open(encoding="utf-8") as f:
    data = json.load(f)

updated = []
for q in data.get("questions", []):
    if q.get("id") not in TARGET_IDS and OLD_FRAGMENT not in ((q.get("q") or "") + (q.get("solution") or "")):
        continue
    if q.get("id") in TARGET_IDS or OLD_FRAGMENT in (q.get("q") or ""):
        q["q"] = re.sub(r"<img[^>]*" + re.escape(OLD_FRAGMENT) + r"[^>]*>", IMG_TAG, q.get("q") or "")
        if OLD_FRAGMENT not in q["q"] and q.get("id") in TARGET_IDS and IMG_TAG not in q["q"]:
            q["q"] = (q.get("q") or "").rstrip() + "<br>" + IMG_TAG
    q["solution"] = re.sub(r"<img[^>]*" + re.escape(OLD_FRAGMENT) + r"[^>]*>", "", q.get("solution") or "")
    updated.append(q.get("id"))

with chapter_file.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False)

overrides_path = ROOT / "data/qx_figure_overrides.json"
overrides = {
    "version": 2,
    "rules": [
        {
            "urlRx": "chapter_38_electromagnetic_induction_figure_38_e3\\.png",
            "clean": NEW_SRC,
        },
        {
            "matchAny": [
                "two boys pull the opposite corners of the square",
                "metallic square frame of edge",
            ],
            "matchMin": 2,
            "clean": NEW_SRC,
        },
        {
            "matchAny": ["304170", "304171"],
            "matchMin": 1,
            "clean": NEW_SRC,
        },
    ],
}

with overrides_path.open("w", encoding="utf-8") as f:
    json.dump(overrides, f, indent=2, ensure_ascii=False)

print("Updated question IDs:", updated)
print("Wrote overrides:", overrides_path)
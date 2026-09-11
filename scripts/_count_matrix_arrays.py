from pathlib import Path
import re
from collections import Counter
ROOT = Path(r"C:\Users\Admin\qx-hosting\data")
RX = re.compile(r"\\begin\{array\}\{([clr| ]{1,6})\}", re.I)
LEFT = re.compile(r"\\left\s*[\[(]\s*\\begin\{array\}", re.I)
AREAS = {
    "banks": ROOT / "banks",
    "examgoal": ROOT / "tests" / "jee_main_examgoal_2027" / "questions",
    "quizrr": ROOT / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
    "books": ROOT / "books" / "chapters",
}
for label, area in AREAS.items():
    cols = Counter()
    left = files = 0
    if not area.exists():
        continue
    flist = [area] if area.is_file() else list(area.rglob("*.json"))
    for fp in flist:
        if fp.name.startswith("_"):
            continue
        t = fp.read_text(encoding="utf-8", errors="ignore")
        ms = RX.findall(t)
        if ms:
            files += 1
            for m in ms:
                cols[m.replace("|", "").strip() or "?"] += 1
        left += len(LEFT.findall(t))
    print(label, "files_with_array", files, "left_matrix", left, "cols", dict(cols.most_common(8)))

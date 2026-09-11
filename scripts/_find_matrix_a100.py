from pathlib import Path
needles = [b"100B", b"A^{100}", b"A^100", b"sum of all the elements of B"]
root = Path(r"C:\Users\Admin\qx-hosting\data")
areas = [
    root / "banks",
    root / "tests" / "jee_main_examgoal_2027" / "questions",
    root / "tests" / "jee_main_quizrr_pyq_chapter" / "questions",
]
for area in areas:
    files = [area] if area.is_file() else list(area.glob("*.json"))
    for fp in files:
        if fp.name.startswith("_"):
            continue
        raw = fp.read_bytes()
        if any(n in raw for n in needles):
            print(fp.relative_to(root))

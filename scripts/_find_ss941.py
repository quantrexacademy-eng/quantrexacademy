from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting\data")
needles = [
    b"discontinuous at",
    b"spin-only magnetic",
    b"Sgn(sin",
    b"intersect $x",
    b"Only (II) is True",
]
areas = [
    ROOT / "tests" / "jee_main_examgoal_2027",
    ROOT / "tests" / "jee_main_quizrr_pyq_chapter",
    ROOT / "banks",
]
for area in areas:
    if not area.exists():
        continue
    files = [area] if area.is_file() else list(area.rglob("*.json"))
    for fp in files:
        if fp.name.startswith("_") or ".bak" in fp.name:
            continue
        try:
            raw = fp.read_bytes()
        except Exception:
            continue
        hits = [n.decode() for n in needles if n in raw]
        if hits:
            print(fp.relative_to(ROOT), hits)

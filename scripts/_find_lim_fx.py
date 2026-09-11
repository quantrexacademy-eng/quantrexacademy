from pathlib import Path
ROOT = Path(r"C:\Users\Admin\qx-hosting\data\tests\jee_main_examgoal_2027\questions")
needles = [b"mathbf{R}", b"rightarrow 0", b"\\lim_", b"Only (II) is True", b"Neither (I) nor"]
for fp in ROOT.glob("*.json"):
    raw = fp.read_bytes()
    hits = [n.decode() for n in needles if n in raw]
    if hits:
        print(fp.name, hits)

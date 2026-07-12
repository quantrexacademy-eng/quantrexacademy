import json
import re
from pathlib import Path
from collections import defaultdict

CHAPTER = Path(
    r"E:\quantrexacademy\data\books\chapters\6a0addba4b032b031e049a36"
    r"\6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__"
    r"6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c183850.json"
)

with CHAPTER.open(encoding="utf-8") as f:
    data = json.load(f)

fig_map = defaultdict(list)
for i, q in enumerate(data.get("questions", [])):
    text = (q.get("q") or "") + (q.get("solution") or "")
    imgs = re.findall(r'src=["\']([^"\']+)["\']', text)
    for src in imgs:
        if "hcv" in src.lower() or "chapter_38" in src.lower() or "electromagnetic" in src.lower() or src.startswith("/assets/diagrams/"):
            fig_map[src].append({
                "idx": i + 1,
                "id": q.get("id"),
                "q": re.sub(r"<[^>]+>", " ", q.get("q") or "")[:180],
            })

print(f"Unique figures: {len(fig_map)}")
print(f"Questions with figures: {sum(len(v) for v in fig_map.values())}")
for src, qs in sorted(fig_map.items(), key=lambda x: x[1][0]["idx"]):
    print(f"\n=== {src}")
    print(f"  used by {len(qs)} question(s): {[q['idx'] for q in qs[:8]]}{'...' if len(qs)>8 else ''}")
    print(f"  sample Q{qs[0]['idx']}: {qs[0]['q'][:120]}")
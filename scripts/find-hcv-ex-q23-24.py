import json, os, re

BASE = r"E:\quantrexacademy\data\books\chapters\6a0addba4b032b031e049a36"
EX_MOD = "6a2fdc56afb6d6932c18272b"

def imgs(text):
    return re.findall(r'src=["\']([^"\']+)["\']', text or "")

all_img_qs = []
for root, _, files in os.walk(BASE):
    for f in files:
        if not f.endswith(".json"):
            continue
        path = os.path.join(root, f)
        try:
            with open(path, encoding="utf-8") as fh:
                data = json.load(fh)
        except Exception:
            continue
        if data.get("moduleId") != EX_MOD:
            continue
        ch = data.get("chapter", "?")
        for i, q in enumerate(data.get("questions", [])):
            text = (q.get("q") or "") + (q.get("solution") or "")
            im = imgs(text)
            if im:
                all_img_qs.append({
                    "chapter": ch,
                    "idx": i,
                    "id": q.get("id"),
                    "imgs": im,
                    "q": (q.get("q") or "")[:200],
                })

print(f"Total exercise questions with images: {len(all_img_qs)}\n")

# Search for Q23/Q24 patterns in question text
for pat in [r"\bQ\.?\s*23\b", r"\bQuestion\s*23\b", r"\bEx\.?\s*23\b", r"\b23\.\s"]:
    hits = [x for x in all_img_qs if re.search(pat, x["q"], re.I)]
    if hits:
        print(f"Pattern {pat}: {len(hits)} hits")
        for h in hits[:5]:
            print(f"  id={h['id']} ch={h['chapter']} imgs={h['imgs']}")

# List all image questions - maybe user means chapter exercise Q23
for h in all_img_qs:
    if h["idx"] in (22, 23):  # 0-based Q23, Q24 in chapter list
        print(f"\nIDX {h['idx']+1} in chapter '{h['chapter']}' id={h['id']}")
        print(f"  imgs: {h['imgs']}")
        print(f"  q: {h['q'][:150]}")

# Also search two men / ladder / pulley type physics diagrams
keywords = ["man", "men", "ladder", "pulley", "rope", "platform", "elevator", "block"]
print("\n--- Keyword matches with images ---")
for h in all_img_qs:
    ql = h["q"].lower()
    if any(k in ql for k in keywords):
        print(f"id={h['id']} ch={h['chapter']} idx={h['idx']+1}")
        print(f"  imgs: {h['imgs'][0][:100]}")
        print(f"  q: {h['q'][:120]}")
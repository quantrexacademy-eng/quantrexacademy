import json, os, re

BASE = r"E:\quantrexacademy\data\books\chapters\6a0addba4b032b031e049a36"
EX_MOD = "6a2fdc56afb6d6932c18272b"

def imgs(text):
    return re.findall(r'src=["\']([^"\']+)["\']', text or "")

keywords = [
    "two men", "two man", "men ", " man ", "person", "boy", "pulling",
    "pushing", "standing", "ladder", "plank", "platform", "weighing",
    "spring balance", "trolley", "cart"
]

for root, _, files in os.walk(BASE):
    for f in files:
        if not f.endswith(".json"):
            continue
        path = os.path.join(root, f)
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("moduleId") != EX_MOD:
            continue
        ch = data.get("chapter", "?")
        for i, q in enumerate(data.get("questions", [])):
            text = (q.get("q") or "") + (q.get("solution") or "")
            im = imgs(text)
            if not im:
                continue
            ql = (q.get("q") or "").lower()
            if any(k in ql for k in keywords):
                print(f"CH={ch} Q#{i+1} id={q.get('id')}")
                print(f"  img: {im[0]}")
                print(f"  q: {(q.get('q') or '')[:250]}")
                print()

# Also print chapter list with Q23/Q24 ids across all chapters
print("=== All chapters Q23/Q24 with images ===")
for root, _, files in os.walk(BASE):
    for f in files:
        if not f.endswith(".json"):
            continue
        path = os.path.join(root, f)
        with open(path, encoding="utf-8") as fh:
            data = json.load(fh)
        if data.get("moduleId") != EX_MOD:
            continue
        ch = data.get("chapter", "?")
        qs = data.get("questions", [])
        for n in (23, 24):
            if len(qs) >= n:
                q = qs[n-1]
                text = (q.get("q") or "") + (q.get("solution") or "")
                im = imgs(text)
                if im:
                    print(f"{ch} Ex.{n} id={q.get('id')} -> {im[0]}")
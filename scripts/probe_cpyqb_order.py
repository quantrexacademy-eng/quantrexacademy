import json, ssl, urllib.request
from pathlib import Path

TOKEN = json.loads(Path("tools/marks_token.json").read_text())["token"]
H = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json"}
API = "https://web.getmarks.app"
CTX = ssl.create_default_context()

def get(path, params=""):
    url = API + path + (("?" + params) if params else "")
    req = urllib.request.Request(url, headers=H)
    with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
        return json.loads(r.read().decode())

cw = get("/api/v1/cpyqb/chapter-wise")
for block in cw.get("data") or []:
    cat = block.get("title") or block.get("category") or "?"
    print("\n===", cat, "===")
    for ex in block.get("exams") or block.get("records") or []:
        title = ex.get("title")
        eid = ex.get("_id")
        meta = ex.get("keyPointsMeta") or []
        years = next((m.get("description") for m in meta if "year" in (m.get("title") or "").lower() or "paper" in (m.get("title") or "").lower()), "")
        print(title, eid, years or meta[:2])
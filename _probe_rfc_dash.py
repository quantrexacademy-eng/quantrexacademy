#!/usr/bin/env python3
import json
import ssl
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TOKEN = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"
OUT = ROOT / "_tmp" / "flash_probe"


def get(path):
    req = urllib.request.Request(
        API + path,
        headers={
            "Accept": "application/json",
            "Authorization": "Bearer " + TOKEN,
            "User-Agent": "Mozilla/5.0",
            "Origin": API,
            "Referer": API + "/",
        },
    )
    with urllib.request.urlopen(req, context=CTX, timeout=45) as r:
        return json.loads(r.read().decode())


def walk_titles(o, acc):
    if isinstance(o, dict):
        t = o.get("componentTitle")
        if t:
            acc.append(t)
        for v in o.values():
            walk_titles(v, acc)
    elif isinstance(o, list):
        for x in o:
            walk_titles(x, acc)


def find_comp(o, name):
    found = []
    if isinstance(o, dict):
        if o.get("componentTitle") == name:
            found.append(o)
        for v in o.values():
            found.extend(find_comp(v, name))
    elif isinstance(o, list):
        for x in o:
            found.extend(find_comp(x, name))
    return found


def main():
    for p in [
        "/api/v3/dashboard/platform/web?examCategoryId=615d3e0cc52ffa3c944600db",
        "/api/v3/dashboard/platform/web?examCategoryId=615d3e29c52ffa3c944600dc",
        "/api/v3/dashboard/platform/app?examCategoryId=615d3e29c52ffa3c944600dc",
    ]:
        d = get(p)
        titles = []
        walk_titles(d, titles)
        print("====", p)
        print("titles", titles)
        print("items", type(d.get("data", {}).get("items")), len(d.get("data", {}).get("items") or []))
        comps = find_comp(d, "RevisionFlashCards")
        print("rfc comps", len(comps))
        for c in comps:
            out = OUT / ("rfc_" + p.split("=")[-1] + ".json")
            out.write_text(json.dumps(c, ensure_ascii=False, indent=2), encoding="utf-8")
            print(" saved", out, "keys", list(c)[:30])
            print(json.dumps(c, ensure_ascii=False)[:800])


if __name__ == "__main__":
    main()

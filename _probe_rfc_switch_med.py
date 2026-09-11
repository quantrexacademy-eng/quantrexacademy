#!/usr/bin/env python3
import json
import ssl
import urllib.request
from pathlib import Path

TOKEN = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text())["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"
ENG = "615d3e0cc52ffa3c944600db"
MED = "615d3e29c52ffa3c944600dc"


def req(method, path, body=None):
    data = None
    h = {
        "Accept": "application/json",
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Origin": API,
        "Referer": API + "/",
    }
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, data=data, headers=h, method=method)
    with urllib.request.urlopen(r, context=CTX, timeout=40) as resp:
        return json.loads(resp.read().decode())


def rfc_items(dash):
    found = []
    def walk(o):
        if isinstance(o, dict):
            if o.get("componentTitle") == "RevisionFlashCards":
                found.append(o)
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)
    walk(dash)
    return found


def main():
    print("switch to medical")
    r = req("PATCH", "/api/v1/user/examCategory", {"examCategory": MED})
    print("patch", str(r)[:200])
    dash = req("GET", "/api/v3/dashboard/platform/web")
    Path(r"C:\Users\Admin\qx-hosting\_tmp\flash_probe\dash_after_med.json").write_text(
        json.dumps(dash, ensure_ascii=False), encoding="utf-8"
    )
    comps = rfc_items(dash)
    print("rfc comps", len(comps))
    for c in comps:
        print(" items", [(i.get("title"), i.get("_id"), i.get("cardsCount")) for i in (c.get("items") or [])])
    s = json.dumps(dash)
    print("has Zoology", "Zoology" in s, "Botany", "Botany" in s)
    print("restore engineering")
    r2 = req("PATCH", "/api/v1/user/examCategory", {"examCategory": ENG})
    print("patch back", str(r2)[:160])
    me = req("GET", "/api/v1/user/me")
    u = me.get("data", {}).get("user") or {}
    print("now category", u.get("examCategory"))


if __name__ == "__main__":
    main()

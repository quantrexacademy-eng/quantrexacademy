#!/usr/bin/env python3
import json
import ssl
import urllib.error
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
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=45) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


def main():
    ids = [
        "6a7c67364a29d63ee45d4d53",
        "6a7c67374a29d63ee45d4d55",
        "6a7c67374a29d63ee45d4d57",
        "6a7c67384a29d63ee45d4d59",
        "6a7c67384a29d63ee45d4d5b",
        "6a7c67394a29d63ee45d4d59",
        "6a7c67394a29d63ee45d4d5b",
        "6a7c673a4a29d63ee45d4d59",
        "6a7c673a4a29d63ee45d4d5b",
        "6a7c673b4a29d63ee45d4d59",
        "6a7c673b4a29d63ee45d4d5b",
        "6a7c673c4a29d63ee45d4d59",
        "6a7c673d4a29d63ee45d4d5b",
    ]
    for sid in ids:
        st, data = get("/api/v4/rfc/subject/%s/chapters?platform=web" % sid)
        if st != 200:
            print("NO", sid, (data.get("error") or {}).get("message"))
            continue
        d = data.get("data") or {}
        sub = d.get("subject") or {}
        tabs = d.get("subjectTabs") or []
        print("OK", sid, sub.get("title"), "cards", sub.get("cardsCount"), "tabs", [(t.get("title"), t.get("_id")) for t in tabs])
        OUT.joinpath("sub_" + sid + ".json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    # sample chapter cards
    phy = json.loads((OUT / "ch_6a7c67364a29d63ee45d4d53.json").read_text(encoding="utf-8"))
    chs = (((phy.get("data") or {}).get("chapters") or {}).get("chapters") or [])
    print("phy chapters", len(chs))
    if chs:
        ch = chs[0]
        print("ch0 keys", ch.keys())
        print(json.dumps(ch, ensure_ascii=False)[:600])
        sid = "6a7c67364a29d63ee45d4d53"
        cid = ch["_id"]
        st, data = get("/api/v4/rfc/subject/%s/chapter/%s?platform=web" % (sid, cid))
        print("chapter detail", st, list((data.get("data") or data).keys()) if isinstance(data, dict) else type(data))
        OUT.joinpath("cardlist_sample.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        dd = data.get("data") or {}
        print(json.dumps(dd, ensure_ascii=False)[:1200])


if __name__ == "__main__":
    main()

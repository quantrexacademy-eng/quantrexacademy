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
    sid = "6a7c67364a29d63ee45d4d53"
    cid = "b74c797e441e7c788d1d7fc0"
    tid = "93e53933b8d850f3dca91b2b"
    paths = [
        "/api/v4/rfc/subject/%s/chapter/%s/topic/%s/category?category=allFormulae" % (sid, cid, tid),
        "/api/v4/rfc/subject/%s/chapter/%s/topic/%s/category?category=allTopics" % (sid, cid, tid),
        "/api/v4/rfc/subject/%s/chapter/%s/topic/allTopics/category?category=allFormulae" % (sid, cid),
        "/api/v4/rfc/subject/%s/chapter/%s/topic/%s/category" % (sid, cid, tid),
    ]
    for p in paths:
        st, data = get(p)
        print("====", st, p)
        dd = data.get("data") if isinstance(data, dict) else data
        if isinstance(dd, dict):
            print("keys", list(dd.keys()))
        print(json.dumps(dd if dd else data, ensure_ascii=False)[:900])
        OUT.joinpath("topic_try.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    # search medical dashboard dump for zoology
    st, dash = get("/api/v3/dashboard/platform/web?examCategoryId=615d3e29c52ffa3c944600dc")
    s = json.dumps(dash)
    print("medical dash zoology", "Zoology" in s, "Botany" in s, "673" in s, "471" in s)
    # save items titles
    items = (dash.get("data") or {}).get("items") or []
    for it in items:
        print("ITEM", it.get("componentTitle"), "n", len(it.get("items") or []), [x.get("title") for x in (it.get("items") or [])[:8]])


if __name__ == "__main__":
    main()

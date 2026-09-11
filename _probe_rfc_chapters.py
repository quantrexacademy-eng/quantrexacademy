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
    # probe nearby ids for bio subjects
    base = int("6a7c67364a29d63ee45d4d50", 16)
    for i in range(0, 16):
        sid = format(base + i, "x")
        st, data = get("/api/v4/rfc/subject/" + sid + "/chapters?platform=web")
        if st == 200:
            d = data.get("data") or data
            title = None
            ch = []
            if isinstance(d, dict):
                title = d.get("title") or d.get("name") or (d.get("subject") or {}).get("title")
                ch = d.get("chapters") or d.get("items") or []
                print("OK", sid, "keys", list(d.keys())[:20], "title", title, "nch", len(ch) if isinstance(ch, list) else type(ch))
                OUT.joinpath("ch_" + sid + ".json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
                if isinstance(ch, list) and ch:
                    print("  first", json.dumps(ch[0], ensure_ascii=False)[:250])
            else:
                print("OK", sid, type(d), str(d)[:200])
        else:
            err = (data.get("error") or {}).get("message") if isinstance(data, dict) else ""
            print("NO", st, sid, err)

    # also dump full user target exams from dashboard
    st, dash = get("/api/v3/dashboard/platform/web?examCategoryId=615d3e29c52ffa3c944600dc")
    user = (dash.get("data") or {}).get("user") or {}
    print("targetExams", user.get("targetExams"))
    print("targetSettings", user.get("targetSettings"))


if __name__ == "__main__":
    main()

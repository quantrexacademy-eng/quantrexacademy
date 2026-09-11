#!/usr/bin/env python3
import json
import ssl
import urllib.error
import urllib.request
from pathlib import Path

TOKEN = json.loads(Path(r"C:\Users\Admin\qx-hosting\data\marks_config.json").read_text())["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"


def req(method, path, body=None):
    data = None
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Origin": API,
        "Referer": API + "/",
    }
    if body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, context=CTX, timeout=40) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


def titles(d):
    out = []
    def walk(o):
        if isinstance(o, dict):
            if o.get("componentTitle"):
                items = o.get("items") or []
                out.append((o.get("componentTitle"), [x.get("title") for x in items[:8] if isinstance(x, dict)]))
            for v in o.values():
                walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)
    walk(d)
    return out


def main():
    for p in [
        "/api/v4/neet/dashboard?platform=web",
        "/api/v4/neet/dashboard?platform=app",
        "/api/v1/dashboard/items",
        "/api/v1/dashboard/items?platform=web",
        "/api/v3/user/me",
        "/api/v1/user/me",
    ]:
        st, d = req("GET", p)
        s = json.dumps(d)
        print("====", st, p, "zoo", "Zoology" in s, "bot", "Botany" in s, "rfc", "RevisionFlash" in s)
        print(" titles", titles(d)[:12])
        print(s[:180].replace("\n", " "))


if __name__ == "__main__":
    main()

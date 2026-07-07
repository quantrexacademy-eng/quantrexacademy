#!/usr/bin/env python3
"""Probe MARKS API for NCERT, board exams, assignments."""
import json
import re
import ssl
import urllib.request
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
TOKEN = json.loads((USB / "tools" / "marks_token.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
HEADERS = {"Authorization": f"Bearer {TOKEN}", "Accept": "application/json", "User-Agent": "Mozilla/5.0"}


def get(path):
    req = urllib.request.Request("https://web.getmarks.app" + path, headers=HEADERS)
    with urllib.request.urlopen(req, context=CTX, timeout=60) as resp:
        return json.loads(resp.read().decode("utf-8"))


def try_get(path):
    try:
        return get(path), None
    except Exception as e:
        return None, str(e)


def main():
    # Chapter API brute force for LBLQ
    sid = "68942eace8ab0dbd011ac238"
    mods = ["LBLQSubject", "NCOQSubject", "DBQSubject", "ncertBasedQs", "allQsBank"]
    templates = [
        "/api/v4/neet/subject/{sid}/chapters?module={mod}&platform=web",
        "/api/v4/neet/subjects/{sid}/chapters?module={mod}&platform=web",
        "/api/v4/neet/{mod}/subjects/{sid}/chapters?platform=web",
        "/api/v4/neet/modules/{mod}/subjects/{sid}/chapters?platform=web",
        "/api/v4/neet/subject/{sid}/module/{mod}/chapters?platform=web",
        "/api/v4/neet/chapters?subjectId={sid}&module={mod}&platform=web",
    ]
    print("=== Chapter APIs ===")
    for mod in mods:
        for tpl in templates:
            path = tpl.format(sid=sid, mod=mod)
            data, err = try_get(path)
            if data:
                block = data.get("data") or {}
                chs = block.get("chapters") or block.get("items") or []
                print("OK", path, "chapters", len(chs) if isinstance(chs, list) else type(chs))

    # Board exam APIs
    print("\n=== Board exam APIs ===")
    for eid, name in [("6943ebc753e4e1880190efca", "CBSE"), ("694ad7d4158e3395c5200f5a", "HSC")]:
        for tpl in [
            "/api/v4/content-exam/{eid}/subjects?platform=web",
            "/api/v4/content-exam/exam/{eid}?platform=web",
            "/api/v4/content-exam/exam/{eid}/subjects?platform=web",
            "/api/v4/board-exam/{eid}/subjects?platform=web",
            "/api/v4/pyq-board/{eid}/subjects?platform=web",
            "/api/v4/cpyqb/content-exam/{eid}/subjects?platform=web",
            "/api/v4/cpyqb/exam/{eid}/subjects?platform=web",
            "/api/v4/exam/{eid}/subjects?platform=web",
        ]:
            path = tpl.format(eid=eid)
            data, err = try_get(path)
            if data:
                print("BOARD OK", name, path, json.dumps(data)[:300])

    # Assignment APIs
    print("\n=== Assignment APIs ===")
    for path in [
        "/api/v1/assignment",
        "/api/v2/assignment",
        "/api/v3/assignment",
        "/api/v4/assignment",
        "/api/v1/assignments",
        "/api/v3/assignments",
        "/api/v4/assignments",
        "/api/v1/assignment/student/list",
        "/api/v3/assignment/student/list",
        "/api/v4/assignment/student/list",
        "/api/v3/assignment/teacher/list",
        "/api/v4/assignment/teacher/list",
        "/api/v3/assignments/student",
        "/api/v3/assignments/teacher",
        "/api/v1/user/me",
    ]:
        data, err = try_get(path)
        if data and not data.get("_error"):
            print("ASSIGN OK", path, json.dumps(data)[:400])
        elif err and "404" not in err:
            print("ASSIGN", path, err[:100])

    # Search frontend bundles
    print("\n=== Frontend API strings ===")
    req = urllib.request.Request("https://web.getmarks.app/", headers={"User-Agent": "Mozilla/5.0"})
    html = urllib.request.urlopen(req, context=CTX, timeout=30).read().decode("utf-8", "ignore")
    scripts = re.findall(r'src="([^"]+\.js)"', html)
    patterns = [r"/api/v[^\"']*LBLQ[^\"']*", r"/api/v[^\"']*assignment[^\"']*", r"/api/v[^\"']*content-exam[^\"']*", r"/api/v[^\"']*board[^\"']*"]
    found = set()
    for src in scripts[:15]:
        url = src if src.startswith("http") else "https://web.getmarks.app" + src
        try:
            js = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"}), context=CTX, timeout=30).read().decode("utf-8", "ignore")
            for pat in patterns:
                for m in re.findall(pat, js, re.I):
                    found.add(m)
        except Exception:
            pass
    for f in sorted(found)[:40]:
        print(f)


if __name__ == "__main__":
    main()
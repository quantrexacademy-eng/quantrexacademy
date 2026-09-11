#!/usr/bin/env python3
import json
import re
import ssl
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
TOKEN = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))["token"]
CTX = ssl.create_default_context()
API = "https://web.getmarks.app"


def get(path, auth=True):
    h = {"User-Agent": "Mozilla/5.0", "Accept": "*/*"}
    if auth:
        h["Authorization"] = "Bearer " + TOKEN
        h["Origin"] = API
        h["Referer"] = API + "/"
        h["Accept"] = "application/json"
    req = urllib.request.Request(API + path if path.startswith("/") else path, headers=h)
    try:
        with urllib.request.urlopen(req, context=CTX, timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()


def main():
    # CDN subject art
    for name in ["zoology", "botany", "biology", "maths", "mathematics", "physics", "chemistry"]:
        url = "https://cdn-assets.getmarks.app/app_assets/img/revision_flash_cards/subjects/%s_light.webp" % name
        try:
            req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, context=CTX, timeout=15) as r:
                print("CDN", r.status, name, r.headers.get("Content-Length"))
        except urllib.error.HTTPError as e:
            print("CDN", e.code, name)
        except Exception as e:
            print("CDN ERR", name, e)

    # landing + chapter viewer JS for objectids
    for rel in [
        "/_next/static/chunks/pages/revision-flash-cards-d58304d256176c91.js",
        "/_next/static/chunks/pages/revision-flash-cards/[subjectId]/[chapterId]-0b5bfbe5946f1d59.js",
        "/_next/static/chunks/pages/index-8a5337e3c2930583.js",
    ]:
        st, body = get(rel, auth=False)
        t = body.decode("utf-8", "replace")
        ids = sorted(set(re.findall(r"6a7c67[0-9a-f]{18}", t)))
        zoo = "zoology" in t.lower()
        bot = "botany" in t.lower()
        print("JS", rel.split("/")[-1][:40], "len", len(t), "ids", ids, "zoo", zoo, "bot", bot)

    # try dashboard with more params
    for p in [
        "/api/v3/dashboard/platform/web?examCategoryId=615d3e29c52ffa3c944600dc&exam=neet",
        "/api/v3/dashboard/platform/web?selectedExamCategory=615d3e29c52ffa3c944600dc",
        "/api/v3/dashboard/platform/web?category=Medical",
        "/api/v3/dashboard/platform/app?examCategory=Medical",
        "/api/v3/dashboard/platform/web?targetExam=neet",
        "/api/v4/rfc/subject/6a7c67364a29d63ee45d4d53/chapters?platform=web&examCategoryId=615d3e29c52ffa3c944600dc",
    ]:
        st, body = get(p)
        t = body.decode("utf-8", "replace")
        print("TRY", st, p[:80], "Zoo" in t, "Botany" in t, "RevisionFlash" in t)


if __name__ == "__main__":
    main()

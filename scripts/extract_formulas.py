#!/usr/bin/env python3
"""Extract Formula Cards (image-based) from MARKS API."""
import json
import re
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
API = "https://web.getmarks.app"
OUT = USB / "marks_data" / "formula_cards"
TOKEN_FILE = USB / "tools" / "marks_token.json"
ctx = ssl.create_default_context()


def api(path, token, retries=5):
    headers = {"Accept": "application/json", "Authorization": f"Bearer {token}"}
    for i in range(retries):
        try:
            req = urllib.request.Request(API + path, headers=headers)
            with urllib.request.urlopen(req, context=ctx, timeout=90) as r:
                return json.loads(r.read().decode())
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503) and i < retries - 1:
                time.sleep(2 ** (i + 1))
                continue
            return {"_error": True, "status": e.code}
        except Exception as ex:
            if i < retries - 1:
                time.sleep(2)
                continue
            return {"_error": True, "message": str(ex)}
    return None


def safe_name(s):
    return re.sub(r'[<>:"/\\|?*]', "_", str(s)).strip()[:100] or "untitled"


def chapter_list(subj, analysis):
    data = analysis.get("data") or {}
    chapters = (data.get("subject") or {}).get("chapters") or data.get("chapters") or []
    if chapters:
        return chapters
    return (subj.get("subject") or {}).get("chapters") or []


def main():
    token = json.loads(TOKEN_FILE.read_text(encoding="utf-8")).get("token")
    if not token:
        print("No token in tools/marks_token.json")
        return 1
    landing = api("/api/v2/fc/landing", token)
    (OUT / "landing.json").write_text(json.dumps(landing, ensure_ascii=False, indent=2), encoding="utf-8")
    subjects = (landing.get("data") or {}).get("subjects") or []
    ok, fail, cards_total = 0, 0, 0
    for subj in subjects:
        stitle = subj.get("title", "subject")
        subj_obj = subj.get("subject") or {}
        sid = subj_obj.get("_id") or subj.get("_id")
        sdir = OUT / safe_name(stitle)
        sdir.mkdir(parents=True, exist_ok=True)
        analysis = api(f"/api/v2/fc/subject/{sid}/analysis", token)
        (sdir / "analysis.json").write_text(json.dumps(analysis, ensure_ascii=False, indent=2), encoding="utf-8")
        for ch in chapter_list(subj, analysis):
            cid = ch.get("_id")
            ctitle = ch.get("title", cid)
            cdir = sdir / safe_name(ctitle)
            cdir.mkdir(parents=True, exist_ok=True)
            cards_path = cdir / "cards_all.json"
            if cards_path.exists():
                try:
                    existing = json.loads(cards_path.read_text(encoding="utf-8"))
                    n = len((existing.get("data") or {}).get("cards") or [])
                    if n:
                        ok += 1
                        cards_total += n
                        print(f"  SKIP {stitle}/{ctitle}: {n} cards")
                        continue
                except Exception:
                    pass
            ch_data = api(f"/api/v2/fc/subject/{sid}/chapter/{cid}", token)
            (cdir / "chapter.json").write_text(json.dumps(ch_data, ensure_ascii=False, indent=2), encoding="utf-8")
            topics = (ch_data.get("data") or {}).get("topics") or []
            topic_id = "allTopics"
            for t in topics:
                if t.get("_id") == "allTopics":
                    topic_id = "allTopics"
                    break
            cat = api(
                f"/api/v2/fc/subject/{sid}/chapter/{cid}/topic/{topic_id}/category?category=allFormulae",
                token,
            )
            if cat.get("_error"):
                fail += 1
                print(f"  FAIL {stitle}/{ctitle}: {cat.get('status')}")
                continue
            cards = (cat.get("data") or {}).get("cards") or []
            (cdir / "cards_all.json").write_text(json.dumps(cat, ensure_ascii=False, indent=2), encoding="utf-8")
            ok += 1
            cards_total += len(cards)
            print(f"  OK {stitle}/{ctitle}: {len(cards)} cards")
            time.sleep(0.12)
    print(f"Done: {ok} chapters, {cards_total} cards, {fail} failed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
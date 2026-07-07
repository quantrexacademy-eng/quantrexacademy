#!/usr/bin/env python3
"""Build NCERT toolbox nav JSON from MARKS API (LBLQ / NCOQ / DBQ / ncertBasedQs)."""
import json
import ssl
import time
import urllib.request
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
OUT = USB / "data" / "nav"
TOKEN_FILE = USB / "tools" / "marks_token.json"
API = "https://web.getmarks.app"
CTX = ssl.create_default_context()

MODULES = {
    "cbse_lblq": ("LBLQSubject", "NCERT Line by Line Qs", "CBSE"),
    "cbse_ncoq": ("NCOQSubject", "NCERT & Exemplar Qs", "CBSE"),
    "cbse_dbq": ("DBQSubject", "Diagram Based Qs", "CBSE"),
    "cbse_ncert": ("ncertBasedQs", "NCERT Based Qs Bank", "CBSE"),
}

ENG_SUBJECTS = {"Physics", "Chemistry", "Mathematics"}
MED_SUBJECTS = {"Physics", "Chemistry", "Botany", "Zoology", "Biology"}


def load_token():
    return json.loads(TOKEN_FILE.read_text(encoding="utf-8")).get("token")


def api_get(path, token):
    req = urllib.request.Request(
        API + path,
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, context=CTX, timeout=90) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_chapters(token, sid, mod):
    offset, chapters = 0, []
    while True:
        data = api_get(
            f"/api/v4/neet/subject/{sid}?module={mod}&platform=web&offset={offset}&limit=50",
            token,
        )
        block = (data.get("data") or {}).get("chapters") or {}
        batch = block.get("data") or []
        chapters.extend(batch)
        total = block.get("total") or 0
        offset += block.get("showing") or len(batch)
        if offset >= total or not batch:
            break
        time.sleep(0.08)
    return chapters


def chapter_topics(token, sid, cid, mod, ctitle, exam_slug="neet"):
    meta_path = USB / "data" / "nav" / "chapter_meta" / exam_slug / sid / f"{ctitle.replace(' ', '_').lower()[:80]}.json"
    # try slugified chapter file
    import re
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", ctitle).strip("_").lower()[:80]
    meta_path = USB / "data" / "nav" / "chapter_meta" / exam_slug / sid / f"{slug}.json"
    if not meta_path.exists():
        meta_path = USB / "data" / "nav" / "chapter_meta" / exam_slug / sid / f"{slug}.json"
    # subject is folder name not id — use subject name folder
    return []


def build_module(token, key, mod, title, board):
    subjects_out = []
    subj_data = api_get(f"/api/v4/neet/subjects?module={mod}&platform=web", token)
    subjects = (subj_data.get("data") or {}).get("subjects") or []
    mod_info = (subj_data.get("data") or {}).get("module") or {}

    for subj in subjects:
        name = subj.get("title") or ""
        sid = subj.get("_id")
        if not sid or not name:
            continue
        chapters_out = []
        for ch in fetch_chapters(token, sid, mod):
            cid = ch.get("_id")
            ctitle = ch.get("title") or ""
            if not cid or not ctitle:
                continue
            mc = ch.get("moduleCount") or {}
            count = mc.get(mod) if isinstance(mc, dict) else ch.get("questionCount") or 0
            if not count:
                count = ch.get("questionCount") or 0
            topics = chapter_topics(token, sid, cid, mod)
            time.sleep(0.05)
            entry = {
                "id": cid,
                "name": ctitle,
                "count": count or (sum(t["count"] for t in topics) if topics else 0),
                "topics": topics,
                "buckets": [],
                "topicCount": len(topics),
            }
            chapters_out.append(entry)
        if chapters_out:
            subjects_out.append({
                "id": sid,
                "name": name,
                "count": sum(c["count"] for c in chapters_out),
                "chapters": chapters_out,
            })
        time.sleep(0.1)

    return {
        "module": mod,
        "board": board,
        "title": mod_info.get("title") or title,
        "examSlug": "neet",
        "filterSubjects": {
            "Engineering": sorted(ENG_SUBJECTS),
            "Medical": sorted(MED_SUBJECTS),
        },
        "subjects": subjects_out,
    }


def main():
    token = load_token()
    if not token:
        print("No token")
        return 1
    OUT.mkdir(parents=True, exist_ok=True)
    for key, (mod, title, board) in MODULES.items():
        print(f"Building {key} ({mod})…")
        payload = build_module(token, key, mod, title, board)
        path = OUT / f"{key}.json"
        path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  Wrote {path.name}: {len(payload['subjects'])} subjects")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
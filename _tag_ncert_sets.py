#!/usr/bin/env python3
"""Fetch Marks NCERT set membership and tag offline NCERT questions."""
from __future__ import annotations

import json
import re
import ssl
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
SRC = Path(r"E:\quantrexacademy\marks_data\medical_live\allQsBank")
OUT = ROOT / "data" / "ncert_offline"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOKEN = CFG["token"]
API = "https://web.getmarks.app"
CTX = ssl.create_default_context()


def api(path, retries=7):
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://web.getmarks.app",
        "Referer": "https://web.getmarks.app/",
    }
    for attempt in range(retries):
        try:
            req = urllib.request.Request(API + path, headers=headers)
            with urllib.request.urlopen(req, context=CTX, timeout=90) as r:
                return json.loads(r.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < retries - 1:
                time.sleep(min(30.0, 2.0 * (1.5 ** attempt)))
                continue
            return {"_error": True, "status": getattr(e, "code", 0)}
        except Exception:
            if attempt < retries - 1:
                time.sleep(1.3 ** attempt)
                continue
            return {"_error": True}
    return {"_error": True}


def list_set_ids(sid, cid, mid, set_id):
    ids, offset = [], 0
    while True:
        j = api(
            f"/api/v4/neet/subject/{sid}/chapter/{cid}/module/{mid}/questionSet/{set_id}"
            f"/questions?platform=web&offset={offset}&limit=100"
        )
        if j.get("_error"):
            break
        block = j.get("data") or {}
        batch = block.get("questions") or []
        for q in batch:
            qid = q.get("id") or q.get("_id")
            if qid:
                ids.append(str(qid))
        showing = block.get("showing") or len(batch)
        total = block.get("total") or 0
        offset += showing
        if not showing or (total and offset >= total):
            break
        time.sleep(0.08)
    return ids


def slug(subj, ch):
    return re.sub(r"[^a-z0-9]+", "_", (subj + "__" + ch).lower()).strip("_")


def load_subject_ids():
    p = SRC / "subjects.json"
    out = {}
    if not p.exists():
        return out
    raw = json.loads(p.read_text(encoding="utf-8"))
    for ss in ((raw.get("data") or {}).get("subjects") or []):
        if ss.get("title") and ss.get("_id"):
            out[ss["title"]] = ss["_id"]
    return out


def main():
    idx = json.loads((OUT / "index.json").read_text(encoding="utf-8"))
    subj_ids = load_subject_ids()
    tagged_ch = 0
    tagged_q = 0
    for subj_dir in sorted(p for p in SRC.iterdir() if p.is_dir()):
        chs_meta = subj_dir / "chapters.json"
        if not chs_meta.exists():
            continue
        raw = json.loads(chs_meta.read_text(encoding="utf-8"))
        chapters = raw if isinstance(raw, list) else (raw.get("data") or raw.get("chapters") or [])
        sid = subj_ids.get(subj_dir.name)
        off_subj = next((s for s in idx["subjects"] if s["name"] == subj_dir.name), None)
        if not off_subj or not sid:
            print("skip", subj_dir.name, "sid", sid)
            continue
        print("##", subj_dir.name, sid)
        for ch in chapters:
            cid = ch.get("_id")
            cname = ch.get("title") or ""
            if not cid:
                continue
            detp = subj_dir / "chapters" / cname / "detail.json"
            if not detp.exists():
                continue
            det = json.loads(detp.read_text(encoding="utf-8"))
            d = det.get("data") or {}
            sets = []
            for m in d.get("modules") or []:
                if m.get("moduleType") != "ncertBasedQs":
                    continue
                mid = m.get("_id")
                for s in m.get("questionSets") or []:
                    set_id = s.get("_id")
                    title = s.get("title") or "NCERT"
                    if not mid or not set_id:
                        continue
                    ids = list_set_ids(sid, cid, mid, set_id)
                    sets.append({"title": title, "ids": ids, "count": len(ids) or int(s.get("questionCount") or 0)})
                    print(f"  {cname} / {title}: {len(ids)}")
                    time.sleep(0.05)
            if not sets:
                continue
            off_ch = next((c for c in off_subj["chapters"] if c["name"] == cname), None)
            if not off_ch:
                continue
            pack_path = ROOT / off_ch["file"]
            if not pack_path.exists():
                continue
            pack = json.loads(pack_path.read_text(encoding="utf-8"))
            by_id = {}
            for st in sets:
                for qid in st["ids"]:
                    by_id.setdefault(qid, []).append(st["title"])
            n = 0
            for q in pack.get("questions") or []:
                mid = str(q.get("_marksId") or "")
                titles = by_id.get(mid)
                if titles:
                    q["ncertSets"] = titles
                    n += 1
            pack_path.write_text(json.dumps(pack, ensure_ascii=False), encoding="utf-8")
            off_ch["sets"] = [{"title": "All NCERT", "count": len(pack.get("questions") or [])}] + [
                {"title": st["title"], "count": st["count"]}
                for st in sets
            ]
            tagged_ch += 1
            tagged_q += n
            print(f"  tagged {cname}: {n}/{len(pack.get('questions') or [])}")

    (OUT / "index.json").write_text(json.dumps(idx, ensure_ascii=False, indent=2), encoding="utf-8")
    print("DONE chapters", tagged_ch, "questions_tagged", tagged_q)


if __name__ == "__main__":
    main()

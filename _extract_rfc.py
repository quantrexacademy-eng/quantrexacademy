#!/usr/bin/env python3
"""Extract Marks Revision Flash Cards (image cards) into data/rfc_offline."""
from __future__ import annotations

import json
import re
import ssl
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "data" / "rfc_offline"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOKEN = CFG["token"]
API = "https://web.getmarks.app"
CTX = ssl.create_default_context()
WORKERS = 3
_GAP = 0.08
_last = 0.0
_lock = threading.Lock()

# Dashboard RFC subjects (Engineering). Medical Phy/Chem reuse these IDs.
SUBJECTS = [
    {"id": "6a7c67364a29d63ee45d4d53", "name": "Physics", "count": 613, "tracks": ["Engineering"], "key": "physics"},
    {"id": "6a7c67374a29d63ee45d4d55", "name": "Chemistry", "count": 1201, "tracks": ["Engineering"], "key": "chemistry"},
    {"id": "6a7c67374a29d63ee45d4d57", "name": "Mathematics", "count": 1139, "tracks": ["Engineering"], "key": "mathematics"},
    {"id": "6a7c67364a29d63ee45d4d54", "name": "Physics", "count": 613, "tracks": ["Medical"], "key": "physics_med"},
    {"id": "6a7c67374a29d63ee45d4d56", "name": "Chemistry", "count": 1201, "tracks": ["Medical"], "key": "chemistry_med"},
    {"id": "6a7c67374a29d63ee45d4d58", "name": "Zoology", "count": 673, "tracks": ["Medical"], "key": "zoology"},
    {"id": "6a7c67374a29d63ee45d4d59", "name": "Botany", "count": 471, "tracks": ["Medical"], "key": "botany"},
]


def api(path: str, retries=6):
    global _last
    url = API + path
    headers = {
        "Accept": "application/json",
        "Authorization": "Bearer " + TOKEN,
        "User-Agent": "Mozilla/5.0",
        "Origin": API,
        "Referer": API + "/",
    }
    for attempt in range(retries):
        with _lock:
            now = time.time()
            wait = _GAP - (now - _last)
            if wait > 0:
                time.sleep(wait)
            _last = time.time()
        try:
            req = urllib.request.Request(url, headers=headers, method="GET")
            with urllib.request.urlopen(req, context=CTX, timeout=60) as r:
                return json.loads(r.read().decode() or "{}")
        except urllib.error.HTTPError as e:
            if e.code in (429, 502, 503, 504) and attempt < retries - 1:
                time.sleep(min(24.0, 1.8 * (1.5 ** attempt)))
                continue
            try:
                body = e.read().decode()[:160]
            except Exception:
                body = ""
            return {"_error": True, "status": e.code, "body": body}
        except Exception as ex:
            if attempt < retries - 1:
                time.sleep(1.2 ** attempt)
                continue
            return {"_error": True, "message": str(ex)}
    return {"_error": True}


def save(path: Path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", (s or "").lower()).strip("_")[:80] or "x"


def img_url(obj):
    if not obj:
        return ""
    if isinstance(obj, str):
        return obj
    if isinstance(obj, dict):
        return obj.get("light") or obj.get("dark") or obj.get("url") or obj.get("src") or ""
    return ""


def extract_subject(sub):
    sid = sub["id"]
    name = sub["name"]
    print("==", name, sid, flush=True)
    nav = api("/api/v4/rfc/subject/%s/chapters?platform=web" % sid)
    if nav.get("_error"):
        print("  FAIL nav", nav)
        return None
    data = nav.get("data") or {}
    subject = data.get("subject") or {}
    ch_wrap = data.get("chapters") or {}
    chapters = ch_wrap.get("chapters") if isinstance(ch_wrap, dict) else (ch_wrap or [])
    out_chs = []
    all_cards = []
    for ch in chapters:
        cid = ch.get("_id")
        ctitle = ch.get("title") or "Chapter"
        print("  ch", ctitle, "cardsHint", ch.get("cardsCount"), flush=True)
        topics_pack = api("/api/v4/rfc/subject/%s/chapter/%s?platform=web" % (sid, cid))
        tdata = (topics_pack.get("data") or {}) if not topics_pack.get("_error") else {}
        topics = ((tdata.get("topics") or {}).get("topics") or []) if isinstance(tdata.get("topics"), dict) else (tdata.get("topics") or [])
        cards_pack = api(
            "/api/v4/rfc/subject/%s/chapter/%s/topic/allTopics/category?category=allFormulae" % (sid, cid)
        )
        cdata = (cards_pack.get("data") or {}) if not cards_pack.get("_error") else {}
        cards = cdata.get("cards") or []
        # map cards to topics by walking each topic if chapter dump lacks topic ids
        topic_cards = {t.get("_id"): [] for t in topics}
        if not cards and topics:
            for t in topics:
                tid = t.get("_id")
                tp = api(
                    "/api/v4/rfc/subject/%s/chapter/%s/topic/%s/category?category=allFormulae" % (sid, cid, tid)
                )
                tcd = (tp.get("data") or {}) if not tp.get("_error") else {}
                for card in tcd.get("cards") or []:
                    cards.append(card)
                    topic_cards.setdefault(tid, []).append(card.get("_id"))
        out_topics = []
        for t in topics:
            out_topics.append({
                "id": t.get("_id"),
                "title": t.get("title"),
                "count": t.get("cardsCount") or 0,
                "preview": img_url(t.get("previewImage")),
            })
        out_ch_cards = []
        for i, card in enumerate(cards):
            src = img_url(card.get("cardImage"))
            rec = {
                "id": card.get("_id"),
                "n": card.get("position") or (i + 1),
                "title": card.get("title") or str(card.get("position") or i + 1),
                "src": src,
                "subject": name,
                "chapter": ctitle,
                "chapterId": cid,
            }
            out_ch_cards.append(rec)
            all_cards.append(rec)
        out_chs.append({
            "id": cid,
            "name": ctitle,
            "count": len(out_ch_cards) or ch.get("cardsCount") or 0,
            "importance": ch.get("importance") or "",
            "image": img_url(ch.get("chapterImage")),
            "topics": out_topics,
            "cards": out_ch_cards,
        })
        save(OUT / "chapters" / (slug(sub.get("key") or name) + "_" + slug(ctitle) + ".json"), {
            "subject": name,
            "subjectId": sid,
            "chapter": ctitle,
            "chapterId": cid,
            "topics": out_topics,
            "cards": out_ch_cards,
        })
    pack = {
        "id": sid,
        "name": name,
        "key": sub.get("key") or slug(name),
        "count": len(all_cards) or subject.get("cardsCount") or 0,
        "tracks": sub["tracks"],
        "image": img_url(subject.get("subjectImage")),
        "chapters": [{k: c[k] for k in ("id", "name", "count", "importance", "image", "topics") if k in c} for c in out_chs],
    }
    save(OUT / "subjects" / (slug(sub.get("key") or name) + ".json"), pack)
    print("  done", name, "chapters", len(out_chs), "cards", pack["count"], flush=True)
    return pack, all_cards


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "chapters").mkdir(exist_ok=True)
    (OUT / "subjects").mkdir(exist_ok=True)
    nav = []
    idmap = {}
    for sub in SUBJECTS:
        res = extract_subject(sub)
        if not res:
            continue
        pack, cards = res
        nav.append({
            "id": pack["id"],
            "name": pack["name"],
            "count": pack["count"],
            "tracks": pack["tracks"],
            "image": pack["image"],
            "chapters": pack["chapters"],
        })
        for c in cards:
            if c.get("id"):
                idmap[c["id"]] = {
                    "subject": c["subject"],
                    "chapter": c["chapter"],
                    "src": c["src"],
                    "n": c["n"],
                    "title": c["title"],
                }
    save(OUT / "index.json", {
        "title": "Revision Flash Cards",
        "subtitle": "Quick revision, anytime",
        "subjects": nav,
        "extracted": int(time.time()),
    })
    save(ROOT / "data" / "nav" / "rfc.json", nav)
    save(OUT / "idmap.json", idmap)
    print("TOTAL subjects", len(nav), "cards", len(idmap))
    for s in nav:
        print(" ", s["name"], s["count"], "chs", len(s.get("chapters") or []))


if __name__ == "__main__":
    main()

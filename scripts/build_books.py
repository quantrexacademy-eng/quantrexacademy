#!/usr/bin/env python3
"""Build Digital Books catalog from MARKS dashboard JSON."""
import json
import re
from pathlib import Path

USB = Path(r"E:\quantrexacademy")
DASH = USB / "marks_data" / "account" / "api_v3_dashboard_platform_web.json"
NEET_BOOKS = USB / "marks_data" / "neet" / "books.json"
OUT = USB / "data" / "books.json"

ENG_CAT = "615d3e0cc52ffa3c944600db"
MED_CAT = "615d3e29c52ffa3c944600dc"


def clean_title(t):
    return re.sub(r"\s+", " ", str(t or "").replace("\n", " ")).strip()


def parse_dashboard():
    if not DASH.exists():
        return {"engineering": [], "medical": [], "curated": [], "title": "", "subtitle": ""}
    data = json.loads(DASH.read_text(encoding="utf-8"))
    items = (data.get("data") or {}).get("items") or []
    eng_books, med_books, curated = [], [], []
    section_title, section_sub = "Digital Books", "Expert-picked PYQ collections & digital study material"

    for block in items:
        comp = block.get("componentTitle") or ""
        if comp == "MARKSSELECTED":
            for it in block.get("items") or []:
                mod = (it.get("module") or {}).get("module") or {}
                title = clean_title(mod.get("title"))
                if title:
                    curated.append({
                        "id": mod.get("id") or it.get("moduleId"),
                        "title": title,
                        "tag": (mod.get("tag") or {}).get("text", ""),
                        "bankSlug": "jee_main",
                    })
        if block.get("msExams") is not None or comp in ("MarksSelectedExams", "MARKSSELECTED"):
            settings = block.get("settings") or {}
            if settings.get("titles"):
                section_title = clean_title(settings["titles"][0])
            if settings.get("subtitles"):
                section_sub = clean_title(settings["subtitles"][0])
            cat = settings.get("examCategory") or block.get("examCategories", [None])[0]
            target = eng_books if cat == ENG_CAT else med_books if cat == MED_CAT else eng_books
            for ex in block.get("msExams") or []:
                titles = ex.get("titles") or []
                title = clean_title(titles[0] if titles else "")
                if not title:
                    continue
                banner = (ex.get("examBanner") or {}).get("light") or ""
                ri = ex.get("redirectInfo") or {}
                target.append({
                    "id": ex.get("_id"),
                    "title": title,
                    "banner": banner,
                    "exam": (ex.get("exam") or {}).get("title", "JEE Main"),
                    "isComingSoon": ex.get("isComingSoon", False),
                    "bankSlug": "jee_main" if cat == ENG_CAT else "neet",
                    "redirectType": ex.get("redirectType", "module"),
                    "moduleId": ri.get("moduleId"),
                })

    return {
        "title": section_title,
        "subtitle": section_sub,
        "engineering": eng_books,
        "medical": med_books,
        "curated": curated,
    }


def parse_neet_books():
    if not NEET_BOOKS.exists():
        return []
    data = json.loads(NEET_BOOKS.read_text(encoding="utf-8"))
    books = []
    for b in (data.get("data") or {}).get("books") or []:
        books.append({
            "id": b.get("_id"),
            "title": clean_title(b.get("title")),
            "banner": (b.get("banner") or {}).get("light") or "",
            "description": b.get("description", ""),
            "isComingSoon": b.get("isComingSoon", False),
            "exam": "NEET",
            "bankSlug": "neet",
        })
    return books


def main():
    catalog = parse_dashboard()
    neet_extra = parse_neet_books()
    for b in neet_extra:
        if not any(x.get("id") == b["id"] for x in catalog["medical"]):
            catalog["medical"].append(b)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT}: {len(catalog['engineering'])} eng, {len(catalog['medical'])} med, {len(catalog['curated'])} curated")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
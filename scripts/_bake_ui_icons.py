#!/usr/bin/env python3
"""Download official Marks UI icons (exam/subject/ncert toolbox) into assets/exam-logos."""
from __future__ import annotations

import urllib.request
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
OUT = ROOT / "assets" / "exam-logos"
OUT.mkdir(parents=True, exist_ok=True)

EXAM_BASE = "https://cdn-assets.getmarks.app/app_assets/img/exams/"
SUBJ_BASE = "https://cdn-assets.getmarks.app/app_assets/img/cpyqb/subjects/"
NCERT = "https://cdn-assets.getmarks.app/app_assets/img/ui/ncert_toolbox/"

FILES = []
for name in [
    "ic_content_exam_jee_main.png",
    "ic_content_exam_jee_advanced.png",
    "ic_content_exam_neet.png",
    "ic_content_exam_aiims.png",
    "ic_content_exam_bitsat.png",
    "ic_content_exam_mhtcet.png",
    "ic_content_exam_wbjee.png",
    "ic_content_exam_comedk.png",
    "ic_content_exam_kcet.png",
    "ic_content_exam_ap_eamcet.png",
    "ic_content_exam_nda.png",
    "ic_content_exam_kvpy.png",
    "ic_content_exam_manipal.png",
    "ic_content_exam_iat.png",
    "ic_content_exam_nest.png",
    "ic_content_exam_viteee.png",
    "ic_content_exam_ts_eamcet.png",
    "ic_content_exam_cbse.png",
    "ic_content_exam_hsc_boards.svg",
]:
    FILES.append((EXAM_BASE + name, name))

for name in [
    "ic_physics_icon.svg",
    "ic_chemistry_icon.svg",
    "ic_mathematics_icon.svg",
    "ic_biology_icon.svg",
    "ic_botany_icon.svg",
    "ic_zoology_icon.svg",
]:
    FILES.append((SUBJ_BASE + name, name))

for name in [
    "ic_ncert_line_by_line_light.svg",
    "ic_ncert_line_by_line_dark.svg",
    "ic_ncert_problems_light.svg",
    "ic_ncert_problems_dark.svg",
    "ic_diagram_based_qs_light.svg",
    "ic_diagram_based_qs_dark.svg",
]:
    FILES.append((NCERT + name, name))

ok = fail = skip = 0
for url, name in FILES:
    dest = OUT / name
    if dest.exists() and dest.stat().st_size > 40:
        skip += 1
        continue
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0", "Referer": "https://web.getmarks.app/"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            buf = r.read()
        if len(buf) < 40:
            fail += 1
            continue
        dest.write_bytes(buf)
        ok += 1
        print("ok", name, len(buf), flush=True)
    except Exception as e:
        fail += 1
        print("fail", name, e, flush=True)

print({"ok": ok, "fail": fail, "skip": skip, "total": len(FILES)})

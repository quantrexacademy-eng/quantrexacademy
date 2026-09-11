#!/usr/bin/env python3
"""Resume after disk-full: rebuild manifest from staged wiped PNGs, rewrite banks."""
from __future__ import annotations

import json
import re
import urllib.parse
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
STAGE = ROOT / "data" / "_migration" / "wiped_upload"
MANIFEST = ROOT / "data" / "_migration" / "wiped_upload_manifest.json"
BANKS = ROOT / "data" / "banks"
SRC_RX = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)


def storage_from_name(name: str) -> str:
    return name.replace("__", "/")


def firebase_public(storage_path: str) -> str:
    return (
        "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
        + urllib.parse.quote(storage_path, safe="")
        + "?alt=media"
    )


def marks_url(storage: str) -> str:
    p = storage
    if p.startswith("questions/figs/"):
        p = p[len("questions/figs/") :]
    if p.startswith("quizrr/"):
        return "https://cdn.quizrr.in/" + p[len("quizrr/") :]
    return "https://cdn-question-pool.getmarks.app/" + p


def rebuild_manifest():
    rows = []
    for p in sorted(STAGE.glob("*")):
        if not p.is_file() or p.stat().st_size < 40:
            continue
        st = storage_from_name(p.name)
        rows.append({"storage": st, "file": str(p), "marks": marks_url(st)})
    MANIFEST.write_text(json.dumps({"n": len(rows), "rows": rows}, indent=2), encoding="utf-8")
    print("manifest rows", len(rows), "bytes", MANIFEST.stat().st_size, flush=True)
    return rows


def rewrite_banks(rows):
    url_map = {}
    for r in rows:
        marks = (r.get("marks") or "").split("?")[0]
        st = r.get("storage") or ""
        if not marks or not st:
            continue
        pub = firebase_public(st)
        url_map[marks] = pub
        url_map[marks + "?"] = pub  # unused
    print("url_map", len(url_map), flush=True)

    def repl_html(html):
        s = str(html or "")
        if "getmarks.app" not in s and "quizrr.in" not in s:
            return s, False

        def repl(m):
            u = m.group(1)
            nu = url_map.get(u) or url_map.get(u.split("?")[0])
            return m.group(0).replace(u, nu) if nu else m.group(0)

        nw = SRC_RX.sub(repl, s)
        return nw, nw != s

    files_n = qs_n = 0
    for fp in sorted(BANKS.glob("*.json")):
        if "bak" in fp.name:
            continue
        raw = json.loads(fp.read_text(encoding="utf-8"))
        as_list = isinstance(raw, list)
        qs = raw if as_list else raw.get("questions")
        if not isinstance(qs, list):
            continue
        ch = 0
        for q in qs:
            if not q:
                continue
            hit = False
            for fld in ("q", "question", "solution", "explanation"):
                if not q.get(fld):
                    continue
                nw, changed = repl_html(q[fld])
                if changed:
                    q[fld] = nw
                    hit = True
            opts = q.get("options") or []
            new_opts = []
            opt_ch = False
            for o in opts:
                if isinstance(o, str):
                    nw, changed = repl_html(o)
                    new_opts.append(nw)
                    if changed:
                        opt_ch = True
                elif isinstance(o, dict):
                    t = o.get("text") or ""
                    nw, changed = repl_html(t)
                    if changed:
                        o = dict(o)
                        o["text"] = nw
                        opt_ch = True
                    new_opts.append(o)
                else:
                    new_opts.append(o)
            if opt_ch:
                q["options"] = new_opts
                hit = True
            if hit:
                ch += 1
        if ch:
            if as_list:
                fp.write_text(json.dumps(qs, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            else:
                raw["questions"] = qs
                fp.write_text(json.dumps(raw, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
            files_n += 1
            qs_n += ch
            print("rewrote", fp.name, "qs", ch, flush=True)
    print("rewrite files", files_n, "questions", qs_n, flush=True)


def main():
    rows = rebuild_manifest()
    rewrite_banks(rows)


if __name__ == "__main__":
    main()

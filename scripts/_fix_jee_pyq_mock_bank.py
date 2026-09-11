#!/usr/bin/env python3
"""Repair JEE Main PYQ mock bank: br-in-math, List-I/II $, alcohol-prep, CDN. Never invents."""
from __future__ import annotations
import json, re
from pathlib import Path
from urllib.parse import unquote, quote

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
QID = ROOT / "data" / "qid_marks"
FB = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"

ALC_IMG = re.compile(
    r'<img[^>]+src=["\']/assets/qx-figures/alcohol-prep/[^"\']+["\'][^>]*/?>',
    re.I,
)
CDN = re.compile(r'https?://cdn-question-pool\.getmarks\.app/([^"\'\s>]+)', re.I)
END_DOL = re.compile(r"(\\end\{array\})\$")
END_BARE = re.compile(r"(\\end\{array\})(?!\$)")
BR = re.compile(r"<br\s*/?>", re.I)


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t)) % 2 == 1


def to_fb(path):
    p = "questions/figs/" + unquote(path)
    return FB + quote(p, safe="") + "?alt=media"


def html_in_math(s):
    if not isinstance(s, str) or "$" not in s:
        return s

    def brtex(inner):
        return BR.sub(r" \\\\ ", inner)

    out = s
    out = re.sub(r"\$\$([\s\S]*?)\$\$", lambda m: "$$" + brtex(m.group(1)) + "$$", out)
    out = re.sub(
        r"\$(?!\$)([^$]*?)\$",
        lambda m: ("$" + brtex(m.group(1)) + "$") if BR.search(m.group(1)) or "<" in m.group(1) else m.group(0),
        out,
    )
    return out


def heal_array(s):
    if not isinstance(s, str) or "\\end{array}" not in s:
        return s
    out = s
    if odd(out) and END_DOL.search(out):
        cand = END_DOL.sub(r"\1", out, count=1)
        if not odd(cand):
            out = cand
    if odd(out) and END_BARE.search(out):
        cand = END_BARE.sub(r"\1$", out, count=1)
        if not odd(cand):
            out = cand
    return out


def rewrite_cdn(s):
    if not isinstance(s, str) or "getmarks.app" not in s:
        return s
    return CDN.sub(lambda m: to_fb(m.group(1)), s)


def strip_alc(s):
    if not isinstance(s, str) or "alcohol-prep" not in s:
        return s, False
    others = re.findall(r'<img[^>]+src=["\']([^"\']+)["\']', s, re.I)
    others = [u for u in others if "alcohol-prep" not in u]
    if others:
        return ALC_IMG.sub("", s), True
    return s, False


def marks_html(d, *keys):
    if not isinstance(d, dict):
        return ""
    for k in keys:
        v = d.get(k)
        if isinstance(v, str) and v.strip():
            return v
        if isinstance(v, dict):
            t = v.get("html") or v.get("text") or ""
            if t:
                return t
    return ""


def official(mid):
    if not mid:
        return None
    p = QID / f"{mid}.json"
    if not p.exists():
        return None
    try:
        return json.loads(p.read_text(encoding="utf-8")).get("data") or {}
    except Exception:
        return None


def repair_str(s):
    if not isinstance(s, str) or not s:
        return s, False
    orig = s
    s = html_in_math(s)
    s = heal_array(s)
    s = rewrite_cdn(s)
    s, _ = strip_alc(s)
    return s, s != orig


print("loading…")
data = json.loads(BANK.read_text(encoding="utf-8"))
qs = data.get("questions") or []
st = {
    "qs": 0,
    "changed": 0,
    "html_math": 0,
    "array": 0,
    "cdn": 0,
    "alc_strip": 0,
    "alc_restore": 0,
}

for q in qs:
    if not isinstance(q, dict):
        continue
    st["qs"] += 1
    dirty = False
    before = str(q.get("q") or "")
    for field in ("q", "question", "solution", "explanation"):
        raw = q.get(field)
        if not isinstance(raw, str):
            continue
        new, ch = repair_str(raw)
        if ch:
            if BR.search(raw) and "$" in raw:
                st["html_math"] += 1
            if "\\end{array}" in raw:
                st["array"] += 1
            if "getmarks.app" in raw:
                st["cdn"] += 1
            if "alcohol-prep" in raw and "alcohol-prep" not in new:
                st["alc_strip"] += 1
            q[field] = new
            dirty = True
    opts = q.get("options")
    if isinstance(opts, list):
        nopts, och = [], False
        for o in opts:
            if isinstance(o, str):
                no, ch = repair_str(o)
                nopts.append(no)
                och = och or ch
                if ch and "alcohol-prep" in o and "alcohol-prep" not in no:
                    st["alc_strip"] += 1
                if ch and "getmarks.app" in o:
                    st["cdn"] += 1
            else:
                nopts.append(o)
        if och:
            q["options"] = nopts
            dirty = True

    # stem-only dead alcohol-prep: restore official Marks HTML if cached
    stem = str(q.get("q") or "")
    if "alcohol-prep" in stem and not re.search(r'src=["\'](?!/assets/qx-figures/alcohol-prep)', stem):
        mid = q.get("_marksId")
        d = official(mid) if mid else None
        if d:
            rec_q = marks_html(d, "question", "q", "stem", "questionHtml")
            rec_opts = d.get("options") or d.get("choices")
            if rec_q and "<img" in rec_q.lower() and "alcohol-prep" not in rec_q:
                q["q"] = rec_q
                st["alc_restore"] += 1
                dirty = True
            if isinstance(rec_opts, list) and rec_opts:
                q["options"] = rec_opts
                dirty = True
            sol = marks_html(d, "solution", "explanation")
            if sol:
                q["solution"] = sol
                dirty = True

    if dirty:
        st["changed"] += 1

print("writing…")
BANK.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print(json.dumps(st, indent=2))

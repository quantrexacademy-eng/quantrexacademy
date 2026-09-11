#!/usr/bin/env python3
"""Second pass: leftover List nested-array $, fill-blanks, proxy CDN, shattered chem $."""
from __future__ import annotations
import json, re
from pathlib import Path
from urllib.parse import unquote, quote, parse_qs, urlparse

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
FB = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(re.findall(r"(?<!\\)\$", t)) % 2 == 1


def cdn_to_fb(url):
    u = unquote(str(url or ""))
    m = re.search(r"cdn-question-pool\.getmarks\.app/(.+?)(?:\?|#|$)", u, re.I)
    if not m:
        return url
    p = "questions/figs/" + m.group(1)
    return FB + quote(p, safe="") + "?alt=media"


def rewrite_urls(s):
    if not isinstance(s, str):
        return s
    out = s
    # raw CDN
    out = re.sub(
        r'https?://cdn-question-pool\.getmarks\.app/[^"\'\s<]+',
        lambda m: cdn_to_fb(m.group(0)),
        out,
        flags=re.I,
    )
    # /api/proxy-image?url=ENCODED_CDN
    def prox(m):
        raw = m.group(0)
        qm = re.search(r'url=([^&"\']+)', raw)
        if not qm:
            return raw
        inner = unquote(qm.group(1))
        if "getmarks.app" not in inner:
            return raw
        fb = cdn_to_fb(inner)
        return fb
    out = re.sub(r'/api/proxy-image\?url=[^"\'>\s]+', prox, out, flags=re.I)
    return out


def heal_text(s):
    if not isinstance(s, str) or not s:
        return s
    out = rewrite_urls(s)
    # nested inner \end{array}$ before & or \\  — that $ was a false closer
    out = re.sub(r"(\\end\{array\})\$(?=\s*&)", r"\1", out)
    out = re.sub(r"(\\end\{array\})\$(?=\s*\\\\)", r"\1", out)
    out = re.sub(r"(\\end\{array\})\$(?=\s*&amp;)", r"\1", out)
    # fill-blank NAT
    out = out.replace("$\\mathrm{n}=_________", "$\\mathrm{n}=$ _________")
    out = re.sub(r"\$\\mathrm\{n\}=_{5,}", r"$\\mathrm{n}=$ _________", out)
    out = re.sub(r"(Here,\s*)\$\\mathrm\{n\}=(_+)", r"\1$\\mathrm{n}=$ \2", out)
    # LiAlH _{4}$
    out = out.replace("LiAlH _{4}$", "$\\mathrm{LiAlH}_{4}$")
    # missing open before chem _n$
    out = re.sub(r"(?<![\\$])HNO_3\$", r"$\\mathrm{HNO}_3$", out)
    out = re.sub(r"(?<![\\$])C_8\$H_\{14\}", r"$\\mathrm{C}_8\\mathrm{H}_{14}$", out)
    out = re.sub(r"(?<![\\$])Br_2\$/KOH", r"$\\mathrm{Br}_2$/KOH", out)
    out = re.sub(r"(?<![\\$])I_2\$/NaOH", r"$\\mathrm{I}_2$/NaOH", out)
    # CH_3^- >$  shattered — wrap leftover closer after >
    out = re.sub(r"CH_3\^-\s*>\$", r"$\\mathrm{CH}_3^-$ $>", out)
    if odd(out) and "\\end{array}" in out:
        # close the LAST array
        parts = out.rsplit("\\end{array}", 1)
        if len(parts) == 2 and not parts[1].startswith("$"):
            cand = parts[0] + "\\end{array}$" + parts[1]
            if not odd(cand):
                out = cand
    if odd(out) and out.rstrip().endswith("_________"):
        cand = re.sub(r"=\s*_{3,}\s*$", r"=$ _________", out.rstrip())
        # if still odd, close before underscores
        if odd(cand):
            cand = re.sub(r"\$([^$]{1,40})=_{3,}\s*$", r"$\1=$ _________", out.rstrip())
        if not odd(cand):
            out = cand
    if odd(out) and "(Given" in out:
        # unclosed $ before (Given
        cand = re.sub(r"(\$\\frac\{[^}]+\}\{[^}]+\}\s*where\s*\$x=_{3,})\s*\\\\\s*\(Given", r"\1$ \\\\ (Given", out)
        if not odd(cand) and cand != out:
            out = cand
        elif odd(out) and out.rstrip().endswith(")") and "$" in out:
            cand2 = out.rstrip() + "$"
            if not odd(cand2):
                out = cand2
    if odd(out) and out.rstrip().endswith("$") is False and "\\end{aligned}" in out:
        if not re.search(r"\\end\{aligned\}\$", out):
            cand = re.sub(r"(\\end\{aligned\})", r"\1$", out, count=1)
            if not odd(cand):
                out = cand
    return out


print("loading")
data = json.loads(BANK.read_text(encoding="utf-8"))
n = 0
for q in data.get("questions") or []:
    if not isinstance(q, dict):
        continue
    dirty = False
    for field in ("q", "question", "solution", "explanation"):
        raw = q.get(field)
        if not isinstance(raw, str):
            continue
        new = heal_text(raw)
        if new != raw:
            q[field] = new
            dirty = True
    opts = q.get("options")
    if isinstance(opts, list):
        nopts = []
        och = False
        for o in opts:
            if isinstance(o, str):
                no = heal_text(o)
                nopts.append(no)
                och = och or no != o
            else:
                nopts.append(o)
        if och:
            q["options"] = nopts
            dirty = True
    if dirty:
        n += 1
print("changed", n)
print("writing")
BANK.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print("done")

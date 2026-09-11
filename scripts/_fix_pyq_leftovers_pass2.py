#!/usr/bin/env python3
"""Pass 2: re-apply official Marks HTML with correct CDN rewrite + local bake."""
from __future__ import annotations
import hashlib, json, re, ssl, urllib.request
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
QID = ROOT / "data" / "qid_marks"
PROOF = ROOT / "data" / "_migration" / "pyq_mock_all_papers_proof.json"
DIAG = ROOT / "assets" / "diagrams"
BAKE = ROOT / "data" / "_migration" / "bake_tmp"
DIAG.mkdir(parents=True, exist_ok=True)
CTX = ssl.create_default_context()
FB = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
CDN = re.compile(r'https?://cdn-question-pool\.getmarks\.app/([^"\'\s>]+)', re.I)
ALC = re.compile(r'<img[^>]+src=["\']/assets/qx-figures/alcohol-prep/[^"\']+["\'][^>]*/?>', re.I)
DOLLAR = re.compile(r"(?<!\\)\$")
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
# corrupted rewrite leftover: ?alt=mediaFILENAME
BROKEN_FB = re.compile(
    r'https://firebasestorage\.googleapis\.com/v0/b/quantrexacademy-app\.firebasestorage\.app/o/[^"\']+\?alt=media[A-Za-z0-9_.\-]+',
    re.I,
)


def odd(s):
    return len(DOLLAR.findall(str(s or "").replace("$$", ""))) % 2 == 1


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def leftover_ids():
    rep = json.loads(PROOF.read_text(encoding="utf-8"))
    ids = set()
    for p in rep.get("papers_with_issues") or []:
        for s in p.get("samples") or []:
            ids.add(s["id"])
    for arr in (rep.get("samples") or {}).values():
        for s in arr:
            ids.add(s["id"])
    return ids


def img_url(v):
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        return str(v.get("url") or v.get("src") or v.get("original") or "").strip()
    return ""


def marks_to_local(d):
    qb = d.get("question") if isinstance(d.get("question"), dict) else {}
    q = str(qb.get("text") or qb.get("html") or "")
    qimg = img_url(qb.get("image"))
    if qimg and not re.search(r"<img\b", q, re.I):
        q += ('<br><img src="%s">' % qimg)
    opts = []
    raw_opts = d.get("options") if isinstance(d.get("options"), list) else []
    ans = None
    for i, o in enumerate(raw_opts):
        if isinstance(o, dict):
            t = str(o.get("text") or o.get("html") or "").strip()
            im = img_url(o.get("image") or o.get("img"))
            if im and not re.search(r"<img\b", t, re.I):
                t += ('<br><img src="%s">' % im)
            opts.append(t)
            if o.get("isCorrect"):
                ans = i
        else:
            opts.append(str(o or ""))
    if ans is None and d.get("correctIndex") is not None:
        ans = d.get("correctIndex")
    sb = d.get("solution") if isinstance(d.get("solution"), dict) else {}
    sol = str(sb.get("text") or sb.get("html") or "")
    simg = img_url(sb.get("image"))
    if simg and not re.search(r"<img\b", sol, re.I):
        sol += ('<br><img src="%s">' % simg)
    return {"q": q, "options": opts, "solution": sol, "answer": ans, "correctValue": d.get("correctValue")}


def cdn_to_fb(path):
    p = unquote(path).split("?")[0].split("#")[0]
    return FB + quote("questions/figs/" + p, safe="") + "?alt=media"


def sha12(u):
    return hashlib.sha1(str(u).encode("utf-8", "ignore")).hexdigest()[:12]


def bake(url):
    u = str(url or "").strip()
    m = CDN.search(u)
    if m:
        raw_path = unquote(m.group(1)).split("?")[0]
        cdn_url = "https://cdn-question-pool.getmarks.app/" + raw_path
    elif u.startswith("http"):
        cdn_url = u.split("?")[0]
        raw_path = ""
    else:
        return u
    dest = DIAG / ("qx-self-" + sha12(cdn_url) + ".png")
    if dest.is_file() and dest.stat().st_size > 80:
        return "/assets/diagrams/" + dest.name
    bake_hit = None
    if raw_path:
        cand = BAKE / raw_path.replace("\\", "/")
        if cand.is_file() and cand.stat().st_size > 80:
            bake_hit = cand
        else:
            name = Path(raw_path).name
            hits = list(BAKE.rglob(name))
            if hits:
                bake_hit = hits[0]
    try:
        if bake_hit:
            dest.write_bytes(bake_hit.read_bytes())
            return "/assets/diagrams/" + dest.name
        req = urllib.request.Request(
            cdn_url,
            headers={"User-Agent": "Mozilla/5.0", "Referer": "https://web.getmarks.app/"},
        )
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            body = r.read()
        if len(body) > 80:
            dest.write_bytes(body)
            return "/assets/diagrams/" + dest.name
    except Exception as e:
        print("  bake fail", cdn_url[-60:], type(e).__name__)
        return cdn_to_fb(raw_path) if raw_path else u
    return cdn_to_fb(raw_path) if raw_path else u


def rewrite(s):
    if not isinstance(s, str) or not s:
        return s
    out = BROKEN_FB.sub("", s)  # drop corrupt leftovers; official rec will refill
    out = CDN.sub(lambda m: bake("https://cdn-question-pool.getmarks.app/" + m.group(1)), out)
    if "alcohol-prep" in out:
        live = [u for u in IMG.findall(out) if "alcohol-prep" not in u]
        if live:
            out = ALC.sub("", out)
    if odd(out):
        cand = out + "$"
        if not odd(cand):
            out = cand
    return out


def load_marks(mid):
    p = QID / f"{mid}.json"
    if not p.exists():
        return None
    try:
        raw = json.loads(p.read_text(encoding="utf-8"))
        d = raw.get("data") if isinstance(raw.get("data"), dict) else raw
        return d if isinstance(d, dict) else None
    except Exception:
        return None


print("loading bank")
data = json.loads(BANK.read_text(encoding="utf-8"))
need = leftover_ids()
st = {"qs": 0, "applied": 0, "baked": 0}

for q in data.get("questions") or []:
    if not isinstance(q, dict) or q.get("id") not in need:
        continue
    st["qs"] += 1
    mid = q.get("_marksId")
    d = load_marks(mid) if mid else None
    rec = marks_to_local(d) if d else None
    if rec and (strip(rec["q"]) or "<img" in rec["q"].lower()):
        q["q"] = rewrite(rec["q"])
        if rec["options"]:
            q["options"] = [rewrite(x) for x in rec["options"]]
        if rec["answer"] is not None:
            q["answer"] = rec["answer"]
        if rec.get("correctValue") is not None:
            q["correctValue"] = rec["correctValue"]
        if rec["solution"]:
            q["solution"] = rewrite(rec["solution"])
        st["applied"] += 1
    else:
        for field in ("q", "question", "solution", "explanation"):
            if isinstance(q.get(field), str):
                q[field] = rewrite(q[field])
        opts = q.get("options")
        if isinstance(opts, list):
            nopts = []
            for o in opts:
                if isinstance(o, str):
                    nopts.append(rewrite(o))
                elif isinstance(o, dict):
                    t = str(o.get("text") or o.get("html") or "")
                    nopts.append(rewrite(t))
                else:
                    nopts.append(o)
            q["options"] = nopts

print("writing")
BANK.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print(json.dumps(st, indent=2))

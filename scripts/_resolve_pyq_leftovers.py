#!/usr/bin/env python3
"""Restore leftover JEE Main PYQ mock issues from official Marks only. Never invents."""
from __future__ import annotations
import hashlib, json, re, ssl, time, urllib.error, urllib.request
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANK = ROOT / "data" / "banks" / "jee_main.json"
QID = ROOT / "data" / "qid_marks"
PROOF = ROOT / "data" / "_migration" / "pyq_mock_all_papers_proof.json"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG.get("token") or ""
DIAG = ROOT / "assets" / "diagrams"
DIAG.mkdir(parents=True, exist_ok=True)
QID.mkdir(parents=True, exist_ok=True)
BAKE = ROOT / "data" / "_migration" / "bake_tmp"
FB = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
CTX = ssl.create_default_context()
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
CDN = re.compile(r"https?://cdn-question-pool\.getmarks\.app/([^\"'\\s>]+)", re.I)
DOLLAR = re.compile(r"(?<!\\)\$")
ALC = re.compile(r'<img[^>]+src=["\']/assets/qx-figures/alcohol-prep/[^"\']+["\'][^>]*/?>', re.I)


def odd(s):
    t = str(s or "").replace("$$", "")
    return len(DOLLAR.findall(t)) % 2 == 1


def strip(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def opt_plain(o):
    if isinstance(o, str):
        return o
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or "")
    return str(o or "")


def img_url(v):
    if not v:
        return ""
    if isinstance(v, str):
        return v.strip()
    if isinstance(v, dict):
        return str(v.get("url") or v.get("src") or v.get("original") or "").strip()
    return ""


def cdn_to_fb(url):
    u = unquote(str(url or ""))
    m = re.search(r"cdn-question-pool\.getmarks\.app/(.+?)(?:\?|#|$)", u, re.I)
    if not m:
        return url
    return FB + quote("questions/figs/" + m.group(1), safe="") + "?alt=media"


def rewrite_cdn(s):
    if not isinstance(s, str) or "getmarks.app" not in s:
        return s
    out = CDN.sub(lambda m: cdn_to_fb("https://cdn-question-pool.getmarks.app/" + m.group(1)), s)

    def prox(m):
        raw = m.group(0)
        qm = re.search(r"url=([^&\"']+)", raw)
        if not qm:
            return raw
        inner = unquote(qm.group(1))
        if "getmarks.app" not in inner:
            return raw
        return cdn_to_fb(inner)

    return re.sub(r"/api/proxy-image\?url=[^\"'>\\s]+", prox, out, flags=re.I)


def sha12(u):
    return hashlib.sha1(str(u).encode("utf-8", "ignore")).hexdigest()[:12]


def local_for(url):
    """Bake official bytes to assets/diagrams. Returns local path if saved."""
    u = str(url or "").strip()
    if not u.startswith("http"):
        return ""
    # Prefer existing bake_tmp copy of Marks path
    m = re.search(r"cdn-question-pool\.getmarks\.app/(.+?)(?:\?|#|$)", unquote(u), re.I)
    rel = unquote(m.group(1)) if m else ""
    dest = DIAG / f"qx-self-{sha12(u)}.png"
    if dest.is_file() and dest.stat().st_size > 80:
        return "/assets/diagrams/" + dest.name
    bake_hit = None
    if rel:
        cand = BAKE / rel
        if cand.is_file() and cand.stat().st_size > 80:
            bake_hit = cand
        else:
            name = Path(rel.replace("\\", "/")).name
            for p in BAKE.rglob(name):
                if p.is_file() and p.stat().st_size > 80:
                    bake_hit = p
                    break
    try:
        if bake_hit:
            dest.write_bytes(bake_hit.read_bytes())
            return "/assets/diagrams/" + dest.name
        req = urllib.request.Request(
            u,
            headers={"User-Agent": "Mozilla/5.0", "Referer": "https://web.getmarks.app/"},
        )
        with urllib.request.urlopen(req, timeout=40, context=CTX) as r:
            body = r.read()
        if len(body) > 80:
            dest.write_bytes(body)
            return "/assets/diagrams/" + dest.name
    except Exception:
        return ""
    return ""


def rewrite_imgs_to_local(s):
    if not isinstance(s, str) or "<img" not in s.lower():
        return s

    def one(m):
        tag = m.group(0)
        srcm = re.search(r'src=["\']([^"\']+)["\']', tag, re.I)
        if not srcm:
            return tag
        src = srcm.group(1)
        if "alcohol-prep" in src:
            return tag
        if src.startswith("/assets/") and (ROOT / src.lstrip("/").split("?")[0]).is_file():
            return tag
        fb = cdn_to_fb(src) if "getmarks.app" in src else src
        loc = local_for(src if src.startswith("http") else fb)
        if loc:
            return re.sub(r'src=["\'][^"\']+["\']', f'src="{loc}"', tag, count=1, flags=re.I)
        if fb != src:
            return re.sub(r'src=["\'][^"\']+["\']', f'src="{fb}"', tag, count=1, flags=re.I)
        return tag

    return re.sub(r"<img[^>]*>", one, s, flags=re.I)


def marks_to_local(d):
    if not isinstance(d, dict):
        return None
    qb = d.get("question") if isinstance(d.get("question"), dict) else {}
    q = str(qb.get("text") or qb.get("html") or "")
    qimg = img_url(qb.get("image"))
    if qimg and not re.search(r"<img\b", q, re.I):
        q = (q + "<br><img src=\"" + qimg + "\">") if q else ("<img src=\"" + qimg + "\">")
    opts = []
    raw_opts = d.get("options") if isinstance(d.get("options"), list) else []
    for o in raw_opts:
        if isinstance(o, str):
            opts.append(o)
            continue
        if not isinstance(o, dict):
            opts.append("")
            continue
        t = str(o.get("text") or o.get("html") or "").strip()
        im = img_url(o.get("image") or o.get("img"))
        if im and not re.search(r"<img\b", t, re.I):
            t = (t + "<br><img src=\"" + im + "\">") if t else ("<img src=\"" + im + "\">")
        opts.append(t)
    sb = d.get("solution") if isinstance(d.get("solution"), dict) else {}
    sol = str(sb.get("text") or sb.get("html") or "")
    simg = img_url(sb.get("image"))
    if simg and not re.search(r"<img\b", sol, re.I):
        sol = (sol + "<br><img src=\"" + simg + "\">") if sol else ("<img src=\"" + simg + "\">")
    ans = None
    for i, o in enumerate(raw_opts):
        if isinstance(o, dict) and o.get("isCorrect"):
            ans = i
            break
    if ans is None and d.get("correctIndex") is not None:
        ans = d.get("correctIndex")
    return {
        "q": q,
        "options": opts,
        "solution": sol,
        "answer": ans,
        "correctValue": d.get("correctValue"),
        "type": d.get("type") or "",
    }


def fetch_marks(mid):
    dest = QID / f"{mid}.json"
    if dest.exists() and dest.stat().st_size > 80:
        try:
            raw = json.loads(dest.read_text(encoding="utf-8"))
            d = raw.get("data") if isinstance(raw.get("data"), dict) else raw
            return d if isinstance(d, dict) else None
        except Exception:
            pass
    url = "https://web.getmarks.app/api/v1/questions/" + mid
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": "Bearer " + TOK,
            "Accept": "application/json",
            "User-Agent": "Mozilla/5.0",
            "Origin": "https://web.getmarks.app",
            "Referer": "https://web.getmarks.app/",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=35, context=CTX) as r:
            body = r.read()
        dest.write_bytes(body)
        raw = json.loads(body.decode("utf-8", "ignore"))
        d = raw.get("data") if isinstance(raw.get("data"), dict) else raw
        return d if isinstance(d, dict) else None
    except urllib.error.HTTPError as e:
        print("  HTTP", e.code, mid)
        return None
    except Exception as e:
        print("  ERR", mid, type(e).__name__)
        return None


def heal_odd_sol(s):
    if not isinstance(s, str) or not s or not odd(s):
        return s
    out = s
    # $\mathrm{B.O}$=3$ → $\mathrm{B.O}=3$
    out = re.sub(r"\$([^$\n]{1,80})\$\s*=\s*([^$\n]{1,40})\$", r"$\1=\2$", out)
    # missing opener: CCl_4$ / _{12}^{24}Mg$
    out = re.sub(r"(?<![\\$])(CCl_4)\$", r"$\1$", out)
    out = re.sub(r"(?<![\\$])(_{\d+}\^{\d+}\s*\\mathrm\{[A-Za-z]+\})\$", r"$\1$", out)
    out = re.sub(r"(?<![\\$])(_\{\d+\}\^\{\d+\}\s*[A-Za-z]+)\$", r"$\1$", out)
    # CH_3$OH leftover
    out = re.sub(r"(?<![\\$])(CH_3)\$", r"$\1$", out)
    if odd(out):
        # last-resort: wrap a dangling closer after a word
        cand = re.sub(r"(?<![\\$])([A-Za-z][A-Za-z0-9_{}^\\]{0,24})\$", r"$\1$", out, count=1)
        if not odd(cand):
            out = cand
    return out if not odd(out) else s


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


def score_stem(html):
    s = str(html or "")
    n = len(strip(s))
    if re.search(r"<img\b", s, re.I) and "alcohol-prep" not in s:
        n += 80
    return n


def score_opts(opts):
    n = 0
    for o in opts or []:
        raw = opt_plain(o)
        t = strip(raw)
        if re.search(r"<img\b", raw, re.I) and "alcohol-prep" not in raw:
            n += 8
        elif t and not re.fullmatch(r"[A-D]", t):
            n += min(6, 1 + len(t) // 12)
    return n


print("loading bank…", flush=True)
data = json.loads(BANK.read_text(encoding="utf-8"))
need = leftover_ids()
print("leftover ids", len(need), "token", bool(TOK), flush=True)
st = {
    "fetched": 0,
    "restored": 0,
    "img_baked": 0,
    "sol_healed": 0,
    "cdn": 0,
    "skipped_official_letter": 0,
    "marks_miss": 0,
}

by_id = {}
for i, q in enumerate(data.get("questions") or []):
    if isinstance(q, dict) and q.get("id") in need:
        by_id[q.get("id")] = q

for qid, q in sorted(by_id.items(), key=lambda x: str(x[0])):
    blob = str(q.get("q") or "") + str(q.get("solution") or "") + " ".join(opt_plain(o) for o in (q.get("options") or []))
    mid = q.get("_marksId")
    print("-" * 60, qid, q.get("source"), "alc" if "alcohol-prep" in blob else "", flush=True)
    rec = None
    if mid and TOK:
        d = fetch_marks(mid)
        time.sleep(0.2)
        if d:
            st["fetched"] += 1
            rec = marks_to_local(d)
        else:
            st["marks_miss"] += 1

    dirty = False
    if rec:
        rec_q = rewrite_cdn(rec.get("q") or "")
        rec_sol = rewrite_cdn(rec.get("solution") or "")
        rec_opts = [rewrite_cdn(x) if isinstance(x, str) else x for x in (rec.get("options") or [])]
        cur_alc = "alcohol-prep" in blob
        if cur_alc or score_stem(rec_q) > score_stem(q.get("q")) + 8:
            if strip(rec_q) or re.search(r"<img\b", rec_q, re.I):
                q["q"] = rec_q
                dirty = True
        if score_opts(rec_opts) > score_opts(q.get("options")):
            q["options"] = rec_opts
            if rec.get("answer") is not None:
                q["answer"] = rec["answer"]
            dirty = True
        if len(strip(rec_sol)) > max(12, len(strip(q.get("solution")))) or (odd(q.get("solution")) and rec_sol and not odd(rec_sol)):
            q["solution"] = rec_sol
            dirty = True
        if rec.get("correctValue") is not None and q.get("correctValue") in (None, ""):
            q["correctValue"] = rec["correctValue"]
            dirty = True

    # bake / rewrite remaining
    for field in ("q", "question", "solution", "explanation"):
        raw = q.get(field)
        if not isinstance(raw, str):
            continue
        new = rewrite_cdn(raw)
        new = rewrite_imgs_to_local(new)
        # strip dead alcohol-prep only when a live official <img> remains
        if "alcohol-prep" in new:
            live = [u for u in IMG.findall(new) if "alcohol-prep" not in u]
            if live:
                new = ALC.sub("", new)
        if field in ("solution", "explanation") and odd(new):
            h = heal_odd_sol(new)
            if h != new:
                new = h
                st["sol_healed"] += 1
        if new != raw:
            q[field] = new
            dirty = True
            if "getmarks.app" in raw:
                st["cdn"] += 1
    opts = q.get("options")
    if isinstance(opts, list):
        nopts = []
        och = False
        for o in opts:
            if isinstance(o, str):
                no = rewrite_imgs_to_local(rewrite_cdn(o))
                if "alcohol-prep" in no:
                    live = [u for u in IMG.findall(no) if "alcohol-prep" not in u]
                    if live:
                        no = ALC.sub("", no)
                nopts.append(no)
                och = och or no != o
            else:
                nopts.append(o)
        if och:
            q["options"] = nopts
            dirty = True

    if dirty:
        st["restored"] += 1
        print("  restored", qid, "stem", strip(q.get("q"))[:80], flush=True)

print("writing bank…", flush=True)
BANK.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
print(json.dumps(st, indent=2), flush=True)

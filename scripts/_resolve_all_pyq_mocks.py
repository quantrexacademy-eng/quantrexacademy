#!/usr/bin/env python3
"""Repair PYQ mock display issues across all exam banks. Never invents stems/figs/sols."""
from __future__ import annotations
import hashlib, json, re, ssl, time, urllib.error, urllib.request
from collections import Counter
from pathlib import Path
from urllib.parse import quote, unquote

ROOT = Path(r"C:\Users\Admin\qx-hosting")
BANKS = ROOT / "data" / "banks"
INDEX_DIR = ROOT / "data" / "nav" / "pyq_paper_index"
QID = ROOT / "data" / "qid_marks"
DIAG = ROOT / "assets" / "diagrams"
BAKE = ROOT / "data" / "_migration" / "bake_tmp"
CFG = json.loads((ROOT / "data" / "marks_config.json").read_text(encoding="utf-8"))
TOK = CFG.get("token") or ""
OUT = ROOT / "data" / "_migration" / "pyq_all_exams_fixed.json"
FB = "https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app/o/"
CTX = ssl.create_default_context()
QID.mkdir(parents=True, exist_ok=True)
DIAG.mkdir(parents=True, exist_ok=True)

CDN = re.compile(r'https?://cdn-question-pool\.getmarks\.app/([^"\'\s>]+)', re.I)
QZ = re.compile(r'https?://cdn\.quizrr\.in/([^"\'\s>]+)', re.I)
BR = re.compile(r"<br\s*/?>", re.I)
IMG = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.I)
DOLLAR = re.compile(r"(?<!\\)\$")
DOLLAR_BLOCK = re.compile(r"(?<!\\)\$(.+?)(?<!\\)\$", re.S)
HTML_IN = re.compile(r"<br\s*/?>|</?p>|</?div>|</?span>", re.I)
DISPLAY = (
    "html_in_math", "unbalanced_dollar_stem", "array_unclosed", "aligned_unclosed",
    "missing_local_fig", "stem_only_dead_fig", "dead_alcohol_prep", "empty_stem",
    "no_options", "few_options", "mentions_fig_no_img", "remote_cdn",
)


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


def brtex(inner):
    return BR.sub(r" \\\\ ", inner)


def split_imgs_from_math(s):
    def split_disp(m):
        inner = m.group(1)
        if not re.search(r"<img", inner, re.I):
            return "$$" + brtex(inner) + "$$"
        out = []
        last = 0
        for im in re.finditer(r"<img[^>]*>", inner, re.I):
            before = inner[last:im.start()]
            if before.strip():
                out.append("$$" + brtex(before) + "$$")
            out.append(im.group(0))
            last = im.end()
        after = inner[last:]
        if after.strip():
            out.append("$$" + brtex(after) + "$$")
        return "".join(out) if out else m.group(0)

    out = re.sub(r"\$\$([\s\S]*?)\$\$", split_disp, s)

    def split_inline(m):
        inner = m.group(1)
        if not re.search(r"<br\s*/?>|<img", inner, re.I):
            return m.group(0)
        if re.search(r"<img", inner, re.I):
            parts = []
            last = 0
            for im in re.finditer(r"<img[^>]*>", inner, re.I):
                before = inner[last:im.start()]
                if before.strip():
                    parts.append("$" + brtex(before) + "$")
                parts.append(im.group(0))
                last = im.end()
            after = inner[last:]
            if after.strip():
                parts.append("$" + brtex(after) + "$")
            return "".join(parts)
        return "$" + brtex(inner) + "$"

    out = re.sub(r"\$(?!\$)([^$]*?)\$", split_inline, out)
    return out


def close_env(s, env):
    token = "\\end{" + env + "}"
    if token not in s:
        return s
    out = s
    if odd(out):
        # extra $ glued on \end{array}$ before & / \\
        cand = re.sub(r"(\\end\{" + env + r"\})\$(?=\s*(?:&|\\\\|&amp;))", r"\1", out)
        if not odd(cand):
            out = cand
    if odd(out) and not re.search(r"\\end\{" + env + r"\}\$", out):
        parts = out.rsplit(token, 1)
        if len(parts) == 2:
            cand = parts[0] + token + "$" + parts[1]
            if not odd(cand):
                out = cand
    return out


def close_odd_chem(s):
    if not odd(s):
        return s
    cand = s
    cand = re.sub(r"(?<![\\$])(CCl_4)\$", r"$\1$", cand)
    cand = re.sub(r"(?<![\\$])(FADH_2)\$", r"$\1$", cand)
    cand = re.sub(r"(?<![\\$])(NADH\+H)\$", r"$\1$", cand)
    cand = re.sub(r"(?<![\\$])(F_2)\$", r"$\1$", cand)
    cand = re.sub(r"(?<![\\$])(HNO_3)\$", r"$\\mathrm{HNO}_3$", cand)
    cand = re.sub(r"(?<![\\$])(S_\{1\})\$", r"$\1$", cand)
    cand = re.sub(r"(?<![\\$])([A-Za-z]_\{?\d+\}?)\$", r"$\1$", cand, count=1)
    if not odd(cand):
        return cand
    if not str(s).rstrip().endswith("$"):
        cand2 = s.rstrip() + "$"
        if not odd(cand2):
            return cand2
    return s


def cdn_to_fb(kind, path):
    p = unquote(path).split("?")[0].split("#")[0]
    prefix = "questions/figs/" + (("quizrr/" + p) if kind == "quizrr" else p)
    return FB + quote(prefix, safe="") + "?alt=media"


def sha12(u):
    return hashlib.sha1(str(u).encode("utf-8", "ignore")).hexdigest()[:12]


def bake(url):
    u = str(url or "").strip()
    m = CDN.search(u)
    kind = "marks"
    raw_path = ""
    if m:
        raw_path = unquote(m.group(1)).split("?")[0]
        cdn_url = "https://cdn-question-pool.getmarks.app/" + raw_path
    else:
        m2 = QZ.search(u)
        if m2:
            kind = "quizrr"
            raw_path = unquote(m2.group(1)).split("?")[0]
            cdn_url = "https://cdn.quizrr.in/" + raw_path
        else:
            return cdn_to_fb("marks", u) if "getmarks.app" in u else u
    dest = DIAG / ("qx-self-" + sha12(cdn_url) + ".png")
    if dest.is_file() and dest.stat().st_size > 80:
        return "/assets/diagrams/" + dest.name
    bake_hit = None
    if raw_path:
        cand = BAKE / raw_path.replace("\\", "/")
        if cand.is_file() and cand.stat().st_size > 80:
            bake_hit = cand
    try:
        if bake_hit:
            dest.write_bytes(bake_hit.read_bytes())
            return "/assets/diagrams/" + dest.name
        req = urllib.request.Request(
            cdn_url,
            headers={"User-Agent": "Mozilla/5.0", "Referer": "https://web.getmarks.app/"},
        )
        with urllib.request.urlopen(req, timeout=35, context=CTX) as r:
            body = r.read()
        if len(body) > 80:
            dest.write_bytes(body)
            return "/assets/diagrams/" + dest.name
    except Exception:
        return cdn_to_fb(kind, raw_path)
    return cdn_to_fb(kind, raw_path)


def rewrite_cdn(s, collected):
    if not isinstance(s, str):
        return s

    def one(m, kind):
        raw = m.group(0)
        collected.add(raw.split("?")[0])
        return bake(raw)

    out = CDN.sub(lambda m: one(m, "marks"), s)
    out = QZ.sub(lambda m: one(m, "quizrr"), out)

    def prox(m):
        raw = m.group(0)
        qm = re.search(r"url=([^&\"']+)", raw)
        if not qm:
            return raw
        inner = unquote(qm.group(1))
        if "getmarks.app" not in inner and "quizrr.in" not in inner:
            return raw
        collected.add(inner.split("?")[0])
        return bake(inner)

    out = re.sub(r"/api/proxy-image\?url=[^\"'>\\s]+", prox, out, flags=re.I)
    return out


def heal_text(s, collected):
    if not isinstance(s, str) or not s:
        return s
    out = split_imgs_from_math(s)
    out = close_env(out, "array")
    out = close_env(out, "aligned")
    out = close_odd_chem(out)
    out = rewrite_cdn(out, collected)
    return out


def classify(q):
    raw = str(q.get("q") or q.get("question") or "")
    opts = q.get("options") or []
    sol = str(q.get("solution") or q.get("explanation") or "")
    plains = [strip(opt_plain(o)) for o in opts]
    issues = []
    for m in DOLLAR_BLOCK.findall(raw):
        if HTML_IN.search(m):
            issues.append("html_in_math")
            break
    if odd(raw):
        issues.append("unbalanced_dollar_stem")
    if "\\begin{array}" in raw and "\\end{array}" not in raw:
        issues.append("array_unclosed")
    if "\\begin{aligned}" in raw and "\\end{aligned}" not in raw:
        issues.append("aligned_unclosed")
    imgs = IMG.findall(raw)
    for o in opts:
        imgs += IMG.findall(opt_plain(o))
    imgs += IMG.findall(sol)
    miss = False
    for src in imgs:
        path = src.split("?")[0]
        if path.startswith("/assets/") and not (ROOT / path.lstrip("/")).is_file():
            miss = True
        elif "getmarks.app" in src or "cdn.quizrr" in src:
            issues.append("remote_cdn")
    if miss:
        issues.append("missing_local_fig")
    if re.search(r"as shown in (the )?figure|following figure|given figure", raw, re.I) and not imgs:
        issues.append("mentions_fig_no_img")
    if not strip(raw) and not IMG.search(raw):
        issues.append("empty_stem")
    if "alcohol-prep" in (raw + " ".join(opt_plain(o) for o in opts) + sol):
        issues.append("dead_alcohol_prep")
    emptyish = (not plains) or all(p in ("", "A", "B", "C", "D") for p in plains)
    has_fig_opt = any("<img" in opt_plain(o).lower() for o in opts)
    qtype = str(q.get("questionType") or q.get("type") or "")
    is_num = "numerical" in qtype.lower() or "integer" in qtype.lower()
    if emptyish and not has_fig_opt:
        is_num = True
    if not is_num:
        if len(opts) == 0:
            issues.append("no_options")
        elif len(opts) < 4:
            issues.append("few_options")
    if odd(sol):
        issues.append("unbalanced_dollar_sol")
    return list(dict.fromkeys(issues))


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
        q += '<br><img src="%s">' % qimg
    opts, ans = [], None
    raw_opts = d.get("options") if isinstance(d.get("options"), list) else []
    for i, o in enumerate(raw_opts):
        if isinstance(o, dict):
            t = str(o.get("text") or o.get("html") or "").strip()
            im = img_url(o.get("image") or o.get("img"))
            if im and not re.search(r"<img\b", t, re.I):
                t += '<br><img src="%s">' % im
            opts.append(t)
            if o.get("isCorrect"):
                ans = i
        else:
            opts.append(str(o or ""))
    sb = d.get("solution") if isinstance(d.get("solution"), dict) else {}
    sol = str(sb.get("text") or sb.get("html") or "")
    simg = img_url(sb.get("image"))
    if simg and not re.search(r"<img\b", sol, re.I):
        sol += '<br><img src="%s">' % simg
    title = ""
    papers = d.get("previousYearPapers") or []
    if papers and isinstance(papers[0], dict):
        title = str(papers[0].get("title") or "")
    return {
        "q": q, "options": opts, "solution": sol, "answer": ans,
        "correctValue": d.get("correctValue"), "source": title, "type": d.get("type") or "",
    }


def load_marks(mid):
    p = QID / f"{mid}.json"
    if p.exists() and p.stat().st_size > 80:
        try:
            raw = json.loads(p.read_text(encoding="utf-8"))
            d = raw.get("data") if isinstance(raw.get("data"), dict) else raw
            return d if isinstance(d, dict) else None
        except Exception:
            pass
    if not TOK or not mid:
        return None
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
        p.write_bytes(body)
        raw = json.loads(body.decode("utf-8", "ignore"))
        d = raw.get("data") if isinstance(raw.get("data"), dict) else raw
        return d if isinstance(d, dict) else None
    except Exception:
        return None


def apply_heal_fields(q, collected):
    dirty = False
    for field in ("q", "question", "solution", "explanation"):
        raw = q.get(field)
        if not isinstance(raw, str):
            continue
        new = heal_text(raw, collected)
        if new != raw:
            q[field] = new
            dirty = True
    opts = q.get("options")
    if isinstance(opts, list):
        nopts, och = [], False
        for o in opts:
            if isinstance(o, str):
                no = heal_text(o, collected)
                nopts.append(no)
                och = och or no != o
            elif isinstance(o, dict):
                o2 = dict(o)
                for k in ("text", "html"):
                    if isinstance(o2.get(k), str):
                        nv = heal_text(o2[k], collected)
                        if nv != o2[k]:
                            o2[k] = nv
                            och = True
                nopts.append(o2)
            else:
                nopts.append(o)
        if och:
            q["options"] = nopts
            dirty = True
    return dirty


def stem_score(html):
    s = str(html or "")
    n = len(strip(s))
    if re.search(r"<img\b", s, re.I) and "alcohol-prep" not in s:
        n += 80
    return n


def exam_slugs():
    return [p.stem for p in sorted(INDEX_DIR.glob("*.json")) if (BANKS / f"{p.stem}.json").is_file()]


def main():
    collected = set()
    report = {"exams": [], "changed_ids": [], "cdn_urls": [], "fetched": 0, "marks_applied": 0, "source_fixed": 0}
    st = Counter()
    for slug in exam_slugs():
        path = BANKS / f"{slug}.json"
        print("heal", slug, flush=True)
        data = json.loads(path.read_text(encoding="utf-8"))
        qs = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(qs, list):
            continue
        n_ch = 0
        leftover = []
        for q in qs:
            if not isinstance(q, dict):
                continue
            if apply_heal_fields(q, collected):
                n_ch += 1
                report["changed_ids"].append({"bank": slug, "id": q.get("id")})
            fl = classify(q)
            disp = [x for x in fl if x in DISPLAY]
            src = str(q.get("source") or "")
            if disp:
                leftover.append((q, disp, src, True))
            elif src in ("MOG", "Unknown") and q.get("_marksId"):
                leftover.append((q, disp, src, False))
        # Marks restore: network only for display-broken; cache-only for MOG/Unknown source labels
        for q, disp, src, do_fetch in leftover:
            mid = q.get("_marksId")
            if not mid:
                continue
            if do_fetch:
                d = load_marks(str(mid))
                time.sleep(0.08)
            else:
                p = QID / f"{mid}.json"
                if not (p.exists() and p.stat().st_size > 80):
                    continue
                try:
                    raw = json.loads(p.read_text(encoding="utf-8"))
                    d = raw.get("data") if isinstance(raw.get("data"), dict) else raw
                except Exception:
                    continue
            if not isinstance(d, dict):
                continue
            if do_fetch:
                report["fetched"] += 1
            rec = marks_to_local(d)
            used = False
            rec_q = heal_text(rec.get("q") or "", collected)
            rec_sol = heal_text(rec.get("solution") or "", collected)
            rec_opts = [heal_text(x, collected) if isinstance(x, str) else x for x in (rec.get("options") or [])]
            if any(x in disp for x in ("mentions_fig_no_img", "missing_local_fig", "remote_cdn", "dead_alcohol_prep", "empty_stem", "html_in_math", "unbalanced_dollar_stem")):
                if stem_score(rec_q) >= stem_score(q.get("q")) and (strip(rec_q) or "<img" in rec_q.lower()):
                    q["q"] = rec_q
                    used = True
                if rec_opts and (any("<img" in opt_plain(o).lower() for o in rec_opts) or len(rec_opts) >= len(q.get("options") or [])):
                    if any("<img" in opt_plain(o).lower() for o in rec_opts) or "few_options" in disp or "no_options" in disp:
                        q["options"] = rec_opts
                        if rec.get("answer") is not None:
                            q["answer"] = rec["answer"]
                        used = True
                if rec_sol and (odd(q.get("solution") or "") and not odd(rec_sol) or (len(strip(rec_sol)) > len(strip(q.get("solution") or "")) + 20)):
                    q["solution"] = rec_sol
                    used = True
            if src in ("MOG", "Unknown", "") and rec.get("source"):
                q["source"] = rec["source"]
                report["source_fixed"] += 1
                used = True
            if used:
                report["marks_applied"] += 1
                report["changed_ids"].append({"bank": slug, "id": q.get("id")})
                n_ch += 1
        print("  writing", slug, "changed~", n_ch, flush=True)
        if isinstance(data, dict):
            path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        else:
            path.write_text(json.dumps(qs, ensure_ascii=False), encoding="utf-8")
        report["exams"].append({"slug": slug, "changed": n_ch})
        st[slug] = n_ch
    report["cdn_urls"] = sorted(collected)
    # unique changed ids
    seen = set()
    uniq = []
    for row in report["changed_ids"]:
        k = (row["bank"], str(row["id"]))
        if k in seen:
            continue
        seen.add(k)
        uniq.append(row)
    report["changed_ids"] = uniq
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print("changed_ids", len(uniq), "cdn", len(collected), "marks_applied", report["marks_applied"], "source_fixed", report["source_fixed"])
    print("wrote", OUT)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Build Quantrex public SEO index: shards, hub tree, chapter lists, sitemaps."""
from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path
from xml.sax.saxutils import escape as xml_esc

ROOT = Path(r"E:\QUANTREX\website")
BANKS = ROOT / "data" / "banks"
BOOKS = ROOT / "data" / "books" / "chapters"
SEO = ROOT / "data" / "seo"
SITEMAP_DIR = ROOT
SITE = "https://www.quantrexacademy.com"
TODAY = "2026-09-04"

def _load_local_fig_map():
    """Map qid -> list of /assets/diagrams/... paths from data/qx_local_fig_map.json."""
    fp = ROOT / "data" / "qx_local_fig_map.json"
    out = {}
    if not fp.exists():
        return out
    try:
        raw = json.loads(fp.read_text(encoding="utf-8"))
    except Exception:
        return out
    # accept {qid: path|list|dict} or {"map": {...}}
    if isinstance(raw, dict) and "map" in raw and isinstance(raw["map"], dict):
        raw = raw["map"]
    if not isinstance(raw, dict):
        return out
    for k, v in raw.items():
        qid = str(k).strip()
        urls = []
        if isinstance(v, str):
            urls = [v]
        elif isinstance(v, list):
            for item in v:
                if isinstance(item, str):
                    urls.append(item)
                elif isinstance(item, dict):
                    urls.append(item.get("src") or item.get("url") or item.get("path") or "")
        elif isinstance(v, dict):
            urls = [v.get("src") or v.get("url") or v.get("path") or ""]
        cleaned = []
        for u in urls:
            u = str(u or "").strip().replace("\\", "/")
            if not u:
                continue
            # normalize to site-relative /assets/diagrams/...
            if "assets/diagrams" in u.replace("\\", "/"):
                idx = u.replace("\\", "/").lower().rfind("assets/diagrams")
                rel = u.replace("\\", "/")[idx:]
                if not rel.startswith("/"):
                    rel = "/" + rel
                cleaned.append(rel)
            elif u.startswith("/assets/"):
                cleaned.append(u)
            elif u.startswith("qx-self-") or u.endswith(".png"):
                name = u.split("/")[-1].split("\\")[-1]
                cleaned.append("/assets/diagrams/" + name)
        if cleaned:
            out[qid] = cleaned
    return out

LOCAL_FIG_MAP = _load_local_fig_map()
# Hard fallbacks from USB audit (2026-09-04) if map missing entries
_AUDIT_FIGS = {
    "26093": ["/assets/diagrams/qx-self-398fb00cdb71784e.png"],
}
for _qid, _urls in _AUDIT_FIGS.items():
    LOCAL_FIG_MAP.setdefault(_qid, _urls)


EXAM_LABEL = {
    "jee_main": "JEE Main",
    "jee_advanced": "JEE Advanced",
    "neet": "NEET",
    "nda": "NDA",
    "bitsat": "BITSAT",
    "aiims": "AIIMS",
    "jipmer": "JIPMER",
    "mht_cet": "MHT CET",
    "mht_cet_medical": "MHT CET Medical",
    "ap_eamcet": "AP EAMCET",
    "ts_eamcet": "TS EAMCET",
    "wbjee": "WBJEE",
    "kcet": "KCET",
    "comedk": "COMEDK",
    "viteee": "VITEEE",
    "kvpy": "KVPY",
    "manipal_met": "Manipal MET",
    "nest_niser": "NEST",
    "iat_iiser": "IAT IISER",
    "nta_abhyas_jee_main": "NTA Abhyas JEE Main",
    "nta_abhyas_neet": "NTA Abhyas NEET",
    "class_9": "CBSE Class 9",
}

HUB_FOR_BANK = {
    "jee_main": "jee",
    "jee_advanced": "jee",
    "nta_abhyas_jee_main": "jee",
    "neet": "neet",
    "nta_abhyas_neet": "neet",
    "aiims": "neet",
    "jipmer": "neet",
    "mht_cet_medical": "neet",
    "nda": "nda",
    "bitsat": "bitsat",
}

HUB_LABEL = {
    "jee": "JEE Main & Advanced",
    "neet": "NEET UG",
    "nda": "NDA",
    "bitsat": "BITSAT",
    "other": "Other exams",
}

SKIP_BANKS = {"dpp.json"}
PLAIN_RE = re.compile(r"<[^>]+>")
SPACE_RE = re.compile(r"\s+")
YEAR_RE = re.compile(r"\b(20\d{2}|19\d{2})\b")
IMG_SRC_RE = re.compile(r'<img[^>]+src\s*=\s*["\']([^"\']+)["\']', re.I)
SUB_TRANS = str.maketrans("0123456789", "₀₁₂₃₄₅₆₇₈₉")
SUP_TRANS = str.maketrans("0123456789+-", "⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻")

# TeX command → Unicode (applied before generic command strip)
TEX_UNICODE = {
    "infty": "∞",
    "emptyset": "∅",
    "varnothing": "∅",
    "alpha": "α",
    "beta": "β",
    "gamma": "γ",
    "delta": "δ",
    "epsilon": "ε",
    "varepsilon": "ε",
    "zeta": "ζ",
    "eta": "η",
    "theta": "θ",
    "vartheta": "ϑ",
    "iota": "ι",
    "kappa": "κ",
    "lambda": "λ",
    "mu": "μ",
    "nu": "ν",
    "xi": "ξ",
    "pi": "π",
    "varpi": "ϖ",
    "rho": "ρ",
    "sigma": "σ",
    "tau": "τ",
    "upsilon": "υ",
    "phi": "φ",
    "varphi": "ϕ",
    "chi": "χ",
    "psi": "ψ",
    "omega": "ω",
    "Gamma": "Γ",
    "Delta": "Δ",
    "Theta": "Θ",
    "Lambda": "Λ",
    "Xi": "Ξ",
    "Pi": "Π",
    "Sigma": "Σ",
    "Upsilon": "Υ",
    "Phi": "Φ",
    "Psi": "Ψ",
    "Omega": "Ω",
    "times": "×",
    "cdot": "·",
    "bullet": "•",
    "pm": "±",
    "mp": "∓",
    "div": "÷",
    "leq": "≤",
    "geq": "≥",
    "le": "≤",
    "ge": "≥",
    "neq": "≠",
    "ne": "≠",
    "approx": "≈",
    "equiv": "≡",
    "sim": "∼",
    "simeq": "≃",
    "propto": "∝",
    "infty": "∞",
    "partial": "∂",
    "nabla": "∇",
    "sum": "∑",
    "prod": "∏",
    "int": "∫",
    "oint": "∮",
    "rightarrow": "→",
    "leftarrow": "←",
    "leftrightarrow": "↔",
    "Rightarrow": "⇒",
    "Leftarrow": "⇐",
    "Leftrightarrow": "⇔",
    "to": "→",
    "mapsto": "↦",
    "in": "∈",
    "notin": "∉",
    "ni": "∋",
    "subset": "⊂",
    "supset": "⊃",
    "subseteq": "⊆",
    "supseteq": "⊇",
    "cup": "∪",
    "cap": "∩",
    "setminus": "∖",
    "forall": "∀",
    "exists": "∃",
    "neg": "¬",
    "land": "∧",
    "lor": "∨",
    "wedge": "∧",
    "vee": "∨",
    "perp": "⊥",
    "parallel": "∥",
    "angle": "∠",
    "degree": "°",
    "circ": "∘",
    "ldots": "…",
    "cdots": "⋯",
    "dots": "…",
    "hbar": "ℏ",
    "ell": "ℓ",
    "Re": "ℜ",
    "Im": "ℑ",
    "triangle": "△",
    "square": "□",
    "checkmark": "✓",
}

# Commands that wrap content we keep: \mathrm{x} → x
WRAP_CMDS = re.compile(
    r"\\(?:mathrm|mathbf|mathit|mathsf|mathtt|operatorname|text|textrm|textbf|textit|mbox|hbox)\s*\{([^{}]*)\}"
)
SQRT_BRACE = re.compile(r"\\sqrt\s*\{([^{}]*)\}")
SQRT_BARE = re.compile(r"\\sqrt\s*(?![a-zA-Z{])")
FRAC = re.compile(r"\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}")
LEFT_RIGHT = re.compile(r"\\(?:left|right)\s*(?:[\[\](){}|.|]|\\[{}|])?")
# Remaining named TeX cmds (after Unicode map / wraps)
CMD_RE = re.compile(r"\\([a-zA-Z]+)\*?")
BODY_LIMIT = 12000  # full stem/sol for page body — not the old 420/520 cut
META_LIMIT = 160
OPT_LIMIT = 400


def truncate_words(t: str, n: int) -> str:
    """Word-boundary truncate for meta/title snippets only."""
    t = str(t or "")
    if n is None or n <= 0 or len(t) <= n:
        return t
    cut = t[:n]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,;:-")


def tex_to_unicode(t: str) -> str:
    """Convert common TeX tokens to Unicode; preserve √ ∞ Greek etc."""
    if not t:
        return ""
    # unwrap text/mathrm wrappers first
    for _ in range(4):
        nt = WRAP_CMDS.sub(r"\1", t)
        if nt == t:
            break
        t = nt
    t = SQRT_BRACE.sub(lambda m: "√(" + m.group(1) + ")" if len(m.group(1)) > 1 else "√" + m.group(1), t)
    t = SQRT_BARE.sub("√", t)
    t = FRAC.sub(r"(\1)/(\2)", t)
    t = LEFT_RIGHT.sub("", t)
    # named commands → Unicode
    def repl_cmd(m):
        name = m.group(1)
        if name in TEX_UNICODE:
            return TEX_UNICODE[name]
        # drop layout-only commands, keep unknown letter as-is blank-safe
        if name in {
            "quad", "qquad", ",", ";", "!", " ",
            "hspace", "vspace", "noindent", "displaystyle", "textstyle",
            "scriptstyle", "limits", "nolimits", "big", "Big", "bigg", "Bigg",
            "bigl", "bigr", "Bigl", "Bigr",
        }:
            return " "
        return " "  # unknown cmd → space (do NOT delete following digits/letters already separated)

    # Prefer exact known map via explicit pass for multi-char safety
    for name, uni in sorted(TEX_UNICODE.items(), key=lambda x: -len(x[0])):
        t = re.sub(r"\\" + name + r"(?![a-zA-Z])\*?", uni, t)
    t = CMD_RE.sub(repl_cmd, t)
    return t


def plain(s, n=BODY_LIMIT):
    """HTML/TeX → readable plain text. Preserves √ ∞ Greek via Unicode.
    n=None or large → full body; use truncate_words for meta separately.
    """
    t = PLAIN_RE.sub(" ", str(s or ""))
    t = (
        t.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&minus;", "−")
        .replace("&infin;", "∞")
        .replace("&radic;", "√")
        .replace("&#8734;", "∞")
        .replace("&#8730;", "√")
    )
    t = re.sub(r"_\{(\d+)\}", lambda m: m.group(1).translate(SUB_TRANS), t)
    t = re.sub(r"_(\d)", lambda m: m.group(1).translate(SUB_TRANS), t)
    t = re.sub(r"\^\{([0-9+-]+)\}", lambda m: m.group(1).translate(SUP_TRANS), t)
    t = tex_to_unicode(t)
    # strip leftover $ delimiters but keep content
    t = t.replace("$$", " ").replace("$", " ")
    t = t.replace(r"\(", " ").replace(r"\)", " ").replace(r"\[", " ").replace(r"\]", " ")
    # remove leftover braces/backslashes from TeX grouping
    t = re.sub(r"[{}]", " ", t)
    t = t.replace("\\", " ")
    t = SPACE_RE.sub(" ", t).strip()
    if n is None or n <= 0:
        return t
    if n >= BODY_LIMIT:
        return t[:n] if len(t) > n else t
    # short limits (legacy / options) — word boundary
    return truncate_words(t, n)


def extract_imgs(*blobs, qid: str = "") -> list:
    """Collect unique <img src> from bank HTML; prefer clean proxy for watermarked Firebase figs."""
    urls = []
    seen = set()
    for blob in blobs:
        if blob is None:
            continue
        if isinstance(blob, (list, tuple)):
            for item in blob:
                if isinstance(item, dict):
                    for k in ("src", "url", "html", "text"):
                        if item.get(k):
                            urls.extend(extract_imgs(item.get(k), qid=qid))
                    continue
                urls.extend(extract_imgs(item, qid=qid))
            continue
        s = str(blob)
        for m in IMG_SRC_RE.finditer(s):
            u = m.group(1).strip()
            if not u or u.startswith("data:") or "javascript:" in u.lower():
                continue
            # skip logo-only noise
            if "quantrex-logo" in u.lower() or "favicon" in u.lower():
                continue
            # watermarked Firebase / known clean-proxy QIDs → clean=1 (no crop)
            if qid == "39270" or "firebasestorage.googleapis" in u:
                if "/api/proxy-image" in u:
                    if "clean=1" not in u:
                        u = u + ("&" if "?" in u else "?") + "clean=1"
                elif u.startswith("http"):
                    u = "/api/proxy-image?clean=1&url=" + __import__("urllib.parse").parse.quote(u, safe="")
            if u in seen:
                continue
            seen.add(u)
            urls.append(u)
    return urls[:8]


def slugify(s, n=80):
    t = plain(s, 160).lower().replace("&", "and")
    t = re.sub(r"[^a-z0-9]+", "-", t).strip("-")
    return (t[:n].strip("-") or "question")


def shard_key(qid):
    return hashlib.md5(str(qid).encode("utf-8")).hexdigest()[:2]


def year_of(q):
    blob = " ".join(str(q.get(k) or "") for k in ("year", "source", "examName", "paperSource", "exam"))
    m = YEAR_RE.search(blob)
    return m.group(1) if m else ""


def exam_label(bank, q):
    return EXAM_LABEL.get(bank) or q.get("examName") or q.get("exam") or bank.replace("_", " ").title()


def compact(q, bank):
    qid = str(q.get("id") or "").strip()
    if not qid:
        return None
    raw_q = q.get("q") or q.get("question") or ""
    text = plain(raw_q, BODY_LIMIT)
    if len(text) < 18:
        return None
    opts = []
    raw_opts = []
    for o in (q.get("options") or [])[:4]:
        raw = o if not isinstance(o, dict) else (o.get("text") or o.get("html") or "")
        raw_opts.append(raw)
        t = plain(raw, OPT_LIMIT)
        if t:
            opts.append(t)
    raw_sol = q.get("solution") or q.get("explanation") or ""
    sol = plain(raw_sol, BODY_LIMIT)
    subj = str(q.get("subject") or "General").strip() or "General"
    ch = str(q.get("chapter") or "Chapter").strip() or "Chapter"
    ans = q.get("answer")
    if ans is None:
        ans = q.get("correctValue")
    # gather figure URLs from bank HTML + explicit fields
    img_blobs = [raw_q, raw_sol] + raw_opts
    for k in ("img", "imgs", "image", "images", "fig", "figure", "figures"):
        if q.get(k):
            img_blobs.append(q.get(k))
    imgs = extract_imgs(*img_blobs, qid=qid)
    for u in LOCAL_FIG_MAP.get(qid, []) or []:
        if u and u not in imgs:
            imgs.append(u)
    imgs = imgs[:8]
    return {
        "id": qid,
        "slug": slugify(text),
        "exam": exam_label(bank, q),
        "bank": bank,
        "subject": subj,
        "chapter": ch,
        "year": year_of(q),
        "source": plain(q.get("source") or "", 70),
        "text": text,
        "options": opts,
        "answer": ans,
        "sol": sol,
        "imgs": imgs,
        # short meta snippet (word-boundary) — consumers may ignore
        "meta": truncate_words(text, META_LIMIT),
    }


def iter_bank_questions(fp):
    data = json.loads(fp.read_text(encoding="utf-8"))
    qs = data.get("questions") if isinstance(data, dict) else data
    if not isinstance(qs, list):
        return
    bank = fp.stem
    for q in qs:
        if isinstance(q, dict):
            yield q, bank


def iter_book_questions():
    if not BOOKS.exists():
        return
    for fp in BOOKS.rglob("*.json"):
        try:
            data = json.loads(fp.read_text(encoding="utf-8"))
        except Exception:
            continue
        qs = data.get("questions") if isinstance(data, dict) else None
        if not isinstance(qs, list):
            continue
        for q in qs:
            if not isinstance(q, dict):
                continue
            q = dict(q)
            if not q.get("subject"):
                q["subject"] = data.get("subject") or "PCM"
            if not q.get("chapter"):
                q["chapter"] = data.get("chapter") or "Digital Book"
            if not q.get("examName"):
                q["examName"] = "JEE Main"
            if not q.get("source"):
                q["source"] = "Quantrex Digital Book"
            yield q, "book"


def hub_for(bank):
    return HUB_FOR_BANK.get(bank, "other")


def add_tree(tree, lists, hub, rec):
    node = tree.setdefault(hub, {"label": HUB_LABEL.get(hub, hub), "count": 0, "subjects": {}})
    node["count"] += 1
    sk = slugify(rec["subject"], 40)
    ck = slugify(rec["chapter"], 50)
    sub = node["subjects"].setdefault(sk, {"label": rec["subject"], "count": 0, "chapters": {}, "featured": []})
    sub["count"] += 1
    ch = sub["chapters"].setdefault(ck, {"label": rec["chapter"], "count": 0})
    ch["count"] += 1
    if len(sub["featured"]) < 12:
        sub["featured"].append(
            {"id": rec["id"], "slug": rec["slug"], "t": truncate_words(rec["text"], 170), "year": rec["year"], "exam": rec["exam"]}
        )
    lk = f"{hub}__{sk}"
    pack = lists.setdefault(lk, {"hub": hub, "slug": sk, "label": rec["subject"], "count": 0, "chapters": {}})
    pack["count"] += 1
    chl = pack["chapters"].setdefault(ck, {"label": rec["chapter"], "count": 0, "items": []})
    chl["count"] += 1
    if len(chl["items"]) < 220:
        chl["items"].append(
            {"id": rec["id"], "slug": rec["slug"], "t": truncate_words(rec["text"], 180), "year": rec["year"], "exam": rec["exam"]}
        )


def write_sitemaps(urls, tree):
    SITEMAP_DIR.mkdir(exist_ok=True)
    chunk = 45000
    parts = []
    for i in range(0, len(urls), chunk):
        batch = urls[i : i + chunk]
        name = f"sitemap-q-{i // chunk + 1}.xml"
        body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
        for u in batch:
            body.append(
                f"  <url><loc>{xml_esc(u)}</loc><lastmod>{TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>"
            )
        body.append("</urlset>")
        (SITEMAP_DIR / name).write_text("\n".join(body), encoding="utf-8")
        parts.append(f"{SITE}/{name}")

    pages = [
        SITE + "/",
        SITE + "/jee",
        SITE + "/neet",
        SITE + "/nda",
        SITE + "/bitsat",
        SITE + "/questions",
        SITE + "/login.html",
        SITE + "/app.html",
        SITE + "/pay.html",
        SITE + "/download.html",
        SITE + "/help.html",
    ]
    seen_p = set(pages)
    for hub, node in tree.items():
        if hub == "other":
            continue
        hu = f"{SITE}/{hub}"
        if hu not in seen_p:
            pages.append(hu)
            seen_p.add(hu)
        for sk, sub in (node.get("subjects") or {}).items():
            su = f"{SITE}/{hub}/{sk}"
            if su not in seen_p:
                pages.append(su)
                seen_p.add(su)
            for ck in sub.get("chapters") or {}:
                cu = f"{SITE}/{hub}/{sk}/{ck}"
                if cu not in seen_p:
                    pages.append(cu)
                    seen_p.add(cu)
    body = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for u in pages:
        pri = "1.0" if u.rstrip("/").endswith(("/jee", "/neet")) or u == SITE + "/" else "0.75"
        body.append(
            f"  <url><loc>{xml_esc(u)}</loc><lastmod>{TODAY}</lastmod><changefreq>daily</changefreq><priority>{pri}</priority></url>"
        )
    body.append("</urlset>")
    (SITEMAP_DIR / "sitemap-pages.xml").write_text("\n".join(body), encoding="utf-8")
    parts.insert(0, f"{SITE}/sitemap-pages.xml")

    idx = ['<?xml version="1.0" encoding="UTF-8"?>', '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for p in parts:
        idx.append(f"  <sitemap><loc>{xml_esc(p)}</loc><lastmod>{TODAY}</lastmod></sitemap>")
    idx.append("</sitemapindex>")
    (ROOT / "sitemap.xml").write_text("\n".join(idx), encoding="utf-8")

    (ROOT / "robots.txt").write_text(
        "\n".join(
            [
                "User-agent: *",
                "Allow: /",
                "Allow: /q/",
                "Allow: /jee",
                "Allow: /neet",
                "Allow: /nda",
                "Allow: /bitsat",
                "Allow: /questions",
                "Allow: /app.html",
                "Disallow: /api/",
                "Disallow: /data/seo/",
                "Disallow: /admin.html",
                "Disallow: /api/create-payment",
                "Disallow: /api/verify-payment",
                "Disallow: /api/payment-webhook",
                "Disallow: /api/admin-login",
                f"Sitemap: {SITE}/sitemap.xml",
                "",
            ]
        ),
        encoding="utf-8",
    )


def main():
    SEO.mkdir(parents=True, exist_ok=True)
    (SEO / "shards").mkdir(exist_ok=True)
    (SEO / "lists").mkdir(exist_ok=True)
    SITEMAP_DIR.mkdir(exist_ok=True)

    shards = defaultdict(dict)
    tree = {h: {"label": HUB_LABEL[h], "count": 0, "subjects": {}} for h in HUB_LABEL}
    lists = {}
    seen = set()
    urls = []
    stats = {"banks": 0, "qs": 0, "skip": 0, "books": 0}

    bank_files = sorted(BANKS.glob("*.json")) if BANKS.exists() else []
    for fp in bank_files:
        if fp.name in SKIP_BANKS or fp.name.endswith(".bak"):
            continue
        print("BANK", fp.name, flush=True)
        n = 0
        try:
            it = list(iter_bank_questions(fp))
        except Exception as e:
            print("  fail", e, flush=True)
            continue
        stats["banks"] += 1
        for q, bank in it:
            rec = compact(q, bank)
            if not rec:
                stats["skip"] += 1
                continue
            qid = rec["id"]
            if qid in seen:
                stats["skip"] += 1
                continue
            seen.add(qid)
            shards[shard_key(qid)][qid] = rec
            hub = hub_for(bank)
            add_tree(tree, lists, hub, rec)
            urls.append(f"{SITE}/q/{qid}/{rec['slug']}")
            n += 1
            stats["qs"] += 1
        print("  kept", n, flush=True)

    print("BOOKS", flush=True)
    bn = 0
    for q, bank in iter_book_questions() or []:
        rec = compact(q, bank)
        if not rec:
            continue
        qid = rec["id"]
        if qid in seen:
            continue
        seen.add(qid)
        shards[shard_key(qid)][qid] = rec
        add_tree(tree, lists, "jee", rec)
        urls.append(f"{SITE}/q/{qid}/{rec['slug']}")
        bn += 1
        stats["qs"] += 1
    stats["books"] = bn
    print("  books kept", bn, flush=True)

    for key, obj in shards.items():
        (SEO / "shards" / f"{key}.json").write_text(
            json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    print("shards", len(shards), flush=True)

    for lk, pack in lists.items():
        for ch in pack["chapters"].values():
            ch["items"].sort(key=lambda x: x.get("year") or "", reverse=True)
        (SEO / "lists" / f"{lk}.json").write_text(
            json.dumps(pack, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
        )
    print("lists", len(lists), flush=True)

    (SEO / "tree.json").write_text(json.dumps(tree, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    write_sitemaps(urls, tree)

    shard_bytes = sum(p.stat().st_size for p in (SEO / "shards").glob("*.json"))
    list_bytes = sum(p.stat().st_size for p in (SEO / "lists").glob("*.json"))
    print(
        "STATS",
        stats,
        "urls",
        len(urls),
        "shardMB",
        round(shard_bytes / 1e6, 1),
        "listMB",
        round(list_bytes / 1e6, 1),
        flush=True,
    )


if __name__ == "__main__":
    main()

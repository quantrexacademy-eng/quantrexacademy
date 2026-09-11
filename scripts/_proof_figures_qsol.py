#!/usr/bin/env python3
"""Proofread figure loading / missing in questions, options, solutions.
Never invents. Read-only."""
from __future__ import annotations

import json
import re
import ssl
import urllib.error
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CTX = ssl.create_default_context()
IMG_RX = re.compile(r'<img\b[^>]*>', re.I)
SRC_RX = re.compile(r'\bsrc=["\']([^"\']+)["\']', re.I)
FIG_TALK = re.compile(
    r"\b(the following (reaction|compound|figure|diagram|graph)|shown in (the )?(figure|diagram|graph)|"
    r"shown below|in the (given )?figure|see (the )?figure|as shown)\b",
    re.I,
)
HEX24 = re.compile(r"^[a-fA-F0-9]{24}$")


def plain(s):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", str(s or ""))).strip()


def opt_html(o):
    if isinstance(o, dict):
        return str(o.get("text") or o.get("html") or "")
    return str(o or "")


def blob_q(q):
    return str(q.get("q") or q.get("question") or "")


def blob_sol(q):
    return str(q.get("solution") or q.get("explanation") or "")


def blob_opts(q):
    return " ".join(opt_html(o) for o in (q.get("options") or []))


def srcs(html):
    return SRC_RX.findall(html or "")


def classify_url(u):
    s = str(u or "")
    if "firebasestorage" in s:
        return "firebase"
    if "proxy-image" in s:
        return "proxy"
    if "cdn-question-pool.getmarks" in s or "getmarks.app" in s:
        return "marks_cdn"
    if "cdn.quizrr" in s:
        return "quizrr"
    if "/assets/diagrams/" in s or s.startswith("/assets/"):
        return "local_asset"
    if "https://.app/" in s:
        return "broken_host"
    if s.startswith("data:"):
        return "data"
    return "other"


def load_qs(path: Path):
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None
    if isinstance(raw, dict):
        qs = raw.get("questions")
        return qs if isinstance(qs, list) else None
    if isinstance(raw, list):
        return raw
    return None


def bank_files():
    out = []
    for p in sorted((ROOT / "data/banks").glob("*.json")):
        if "bak" in p.name:
            continue
        out.append(p)
    return out


def scan_file(path: Path, exam_filter=None):
    qs = load_qs(path)
    if not qs:
        return None
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    st = {
        "file": rel,
        "n": 0,
        "q_img": 0,
        "opt_img": 0,
        "sol_img": 0,
        "q_talk_no_img": 0,
        "sol_talk_no_img": 0,
        "letter_opts": 0,
        "hosts": Counter(),
        "missing_alt": 0,
        "broken_host": 0,
        "samples": defaultdict(list),
    }
    for q in qs:
        if not q:
            continue
        if exam_filter and exam_filter not in str(q.get("source") or q.get("exam") or ""):
            continue
        st["n"] += 1
        qh, sh, oh = blob_q(q), blob_sol(q), blob_opts(q)
        qi, si, oi = srcs(qh), srcs(sh), srcs(oh)
        if qi:
            st["q_img"] += 1
        if si:
            st["sol_img"] += 1
        if oi:
            st["opt_img"] += 1
        opts = q.get("options") or []
        op_plain = [plain(opt_html(o)) for o in opts]
        letter = bool(opts) and all(re.fullmatch(r"[A-Da-d]?", x or "") for x in op_plain) and not any(
            IMG_RX.search(opt_html(o) or "") for o in opts
        )
        if letter:
            st["letter_opts"] += 1
            if len(st["samples"]["letter_opts"]) < 4:
                st["samples"]["letter_opts"].append(
                    {"id": q.get("id"), "src": q.get("source"), "ch": q.get("chapter")}
                )
        if FIG_TALK.search(plain(qh)) and not qi and not IMG_RX.search(qh):
            st["q_talk_no_img"] += 1
            if len(st["samples"]["q_talk_no_img"]) < 4:
                st["samples"]["q_talk_no_img"].append(
                    {
                        "id": q.get("id"),
                        "src": q.get("source"),
                        "stem": plain(qh)[:120],
                    }
                )
        if FIG_TALK.search(plain(sh)) and not si and not IMG_RX.search(sh):
            st["sol_talk_no_img"] += 1
            if len(st["samples"]["sol_talk_no_img"]) < 3:
                st["samples"]["sol_talk_no_img"].append(
                    {"id": q.get("id"), "src": q.get("source"), "sol": plain(sh)[:100]}
                )
        for u in qi + si + oi:
            kind = classify_url(u)
            st["hosts"][kind] += 1
            if kind == "broken_host":
                st["broken_host"] += 1
            if kind == "firebase" and "alt=media" not in u:
                st["missing_alt"] += 1
                if len(st["samples"]["missing_alt"]) < 3:
                    st["samples"]["missing_alt"].append(u[:160])
    st["hosts"] = dict(st["hosts"])
    st["samples"] = {k: v for k, v in st["samples"].items() if v}
    return st


def probe(url, referer="https://www.quantrexacademy.com/"):
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0", "Referer": referer, "Accept": "image/*,*/*"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20, context=CTX) as r:
            b = r.read(64)
            return r.status, (r.headers.get("content-type") or "")[:40], r.headers.get("content-length")
    except urllib.error.HTTPError as e:
        return e.code, (e.headers.get("content-type") if e.headers else "")[:40], None
    except Exception as e:
        return None, type(e).__name__, str(e)[:80]


def collect_sample_urls():
    bank = json.loads((ROOT / "data/banks/jee_main.json").read_text(encoding="utf-8"))
    by = defaultdict(list)
    for q in bank["questions"]:
        if "2026" not in str(q.get("source") or ""):
            continue
        blob = blob_q(q) + " " + blob_sol(q) + " " + blob_opts(q)
        for u in srcs(blob):
            k = classify_url(u)
            if len(by[k]) < 6:
                by[k].append({"id": q.get("id"), "src": q.get("source"), "url": u, "where": "jee2026"})
    # irodov local
    iro = ROOT / "data/books/chapters/69cfb5366ecf5579037d96a4"
    if iro.exists():
        for p in iro.glob("*.json"):
            t = p.read_text(encoding="utf-8", errors="ignore")
            for u in srcs(t)[:20]:
                k = classify_url(u)
                if len(by["irodov_" + k]) < 4:
                    by["irodov_" + k].append({"file": p.name[-20:], "url": u})
    # amine
    org = ROOT / "data/books/chapters/6a4ce383c59a7b462185330f"
    if org.exists():
        for p in org.glob("*.json"):
            t = p.read_text(encoding="utf-8", errors="ignore")[:8000]
            if "Amines" not in t:
                continue
            for u in srcs(t):
                if len(by["amine"]) < 6:
                    by["amine"].append(u)
            break
    return by


def local_exists(u):
    if "/assets/" not in u:
        return None
    m = re.search(r"/assets/diagrams/([^\"'\\?\s]+)", u)
    if not m:
        return None
    p = ROOT / "assets" / "diagrams" / m.group(1).replace("\\", "")
    return p.exists(), str(p.name), p.stat().st_size if p.exists() else 0


def main():
    print("=== BANKS ===")
    rows = []
    for p in bank_files():
        st = scan_file(p)
        if not st or st["n"] == 0:
            continue
        rows.append(st)
        if st["q_talk_no_img"] or st["sol_talk_no_img"] or st["broken_host"] or st["missing_alt"]:
            print(
                f"{p.name:28s} n={st['n']:5d} qImg={st['q_img']:5d} optImg={st['opt_img']:4d} solImg={st['sol_img']:5d} "
                f"qTalkNoFig={st['q_talk_no_img']:3d} solTalkNoFig={st['sol_talk_no_img']:3d} "
                f"letter={st['letter_opts']:4d} broken={st['broken_host']} noAlt={st['missing_alt']} hosts={st['hosts']}"
            )
    print("\n=== JEE MAIN 2026 ONLY ===")
    st = scan_file(ROOT / "data/banks/jee_main.json", exam_filter="2026")
    print(json.dumps({k: v for k, v in st.items() if k != "samples"}, indent=2, default=str))
    print("samples", json.dumps(st.get("samples") or {}, indent=2)[:2000])

    print("\n=== NEET (all) fig flags ===")
    stn = scan_file(ROOT / "data/banks/neet.json")
    print(
        f"n={stn['n']} qImg={stn['q_img']} optImg={stn['opt_img']} solImg={stn['sol_img']} "
        f"qTalkNoFig={stn['q_talk_no_img']} solTalkNoFig={stn['sol_talk_no_img']} letter={stn['letter_opts']} hosts={stn['hosts']}"
    )

    print("\n=== LIVE URL PROBES ===")
    samples = collect_sample_urls()
    probed = []
    for kind, rows_u in samples.items():
        items = rows_u if isinstance(rows_u, list) else []
        for row in items[:3]:
            u = row if isinstance(row, str) else row.get("url")
            if not u:
                continue
            if u.startswith("/"):
                exists = local_exists(u)
                print(f"LOCAL {kind} exists={exists} {u[:90]}")
                probed.append({"kind": kind, "url": u, "local": exists})
                continue
            ref = "https://web.getmarks.app/" if "getmarks" in u or "cdn-question" in u else "https://www.quantrexacademy.com/"
            code, ct, cl = probe(u, ref)
            print(f"HTTP {code} {ct} {cl} [{kind}] {u[-80:]}")
            probed.append({"kind": kind, "url": u[:180], "http": code, "ctype": ct})

    # local irodov / amine files
    print("\n=== LOCAL FILE EXISTS ===")
    for name in (
        "qx-irodov-a8dbbffe2c4f0c37.png",
        "qx-irodov-250e293106820500.png",
        "qx-org-c49221e5dad1f07b.png",
    ):
        p = ROOT / "assets/diagrams" / name
        print(name, p.exists(), p.stat().st_size if p.exists() else 0)

    out = ROOT / "data/_migration/figure_proofread.json"
    out.write_text(
        json.dumps(
            {
                "jee2026": st,
                "neet": {k: v for k, v in stn.items() if k != "samples"},
                "banks_flagged": [
                    {k: v for k, v in r.items() if k != "samples"}
                    for r in rows
                    if r["q_talk_no_img"] or r["sol_talk_no_img"] or r["broken_host"] or r["missing_alt"]
                ],
                "probes": probed,
            },
            indent=2,
            default=str,
        ),
        encoding="utf-8",
    )
    print("WROTE", out)


if __name__ == "__main__":
    main()

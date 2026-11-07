"""Apply ONLY the requested qxmd392 entry-asset delta onto exact live bytes (line endings/indent preserved).
Never removes a line: every live line is kept; only version tags on 3 existing script tags change and new lines are inserted."""
import re, sys, os, hashlib, json
L = "/workspace/qxhost-baseline/live-raw"; OUT = "/workspace/qx-livepatch-20261107/patch"
def nl_of(b): return b"\r\n" if b.count(b"\r\n") * 2 > b.count(b"\n") else b"\n"
def line_with(lines, pat):
    hits = [i for i, l in enumerate(lines) if re.search(pat, l)]
    if len(hits) != 1: raise SystemExit(f"need exactly one line matching {pat!r}, got {len(hits)}")
    return hits[0]
def indent(l): return re.match(rb"[ \t]*", l).group(0)
def standalone(name):
    raw = open(f"{L}/{name}", "rb").read(); nl = nl_of(raw)
    lines = raw.split(b"\n"); strip = lambda l: l[:-1] if l.endswith(b"\r") else l
    end = lambda l: b"\r" if l.endswith(b"\r") else b""
    for need in [rb"qxmd392-layout\.css", rb"qx-math-scroll\.js", rb"qx-start-index\.js"]:
        if any(re.search(need, l) for l in lines): raise SystemExit(f"{name}: live already has {need!r}; refusing double insert")
    cr = b"\r" if nl == b"\r\n" else b""  # inserted lines follow the FILE's dominant line ending (CRLF pages stay CRLF)
    def ins_after(i, text): lines.insert(i + 1, indent(lines[i]) + text + cr)
    def ins_before(i, text): lines.insert(i, indent(lines[i]) + text + cr)
    i = line_with(lines, rb'<script src="math-render\.js\?v=[^"]*"'); ins_after(i, b'<script src="qx-math-scroll.js?v=qxmd392h" defer></script>')
    for f in (rb"question-format\.js", rb"data\.js", rb"test-engine\.js"):
        i = line_with(lines, rb'<script src="' + f + rb'\?v=[^"]*"')
        lines[i] = re.sub(rb'(src="' + f + rb'\?v=)[^"]*', rb"\g<1>qxmd392c", lines[i])
    i = line_with(lines, rb'<script src="test-engine\.js\?v=')
    has_fit = any(re.search(rb'src="qx-fit\.js', l) for l in lines)
    if not has_fit: ins_before(i, b'<script src="qx-fit.js?v=qxmd392d" defer></script>'); i += 1
    ins_before(i, b'<script src="qx-start-index.js?v=qxmd392c" defer></script>')
    i = line_with(lines, rb"</head>"); ins_before(i, b'<link rel="stylesheet" href="assets/qxmd392-layout.css?v=qxmd392g">')
    return raw, b"\n".join(lines)
def footer_link(name):
    raw = open(f"{L}/{name}", "rb").read(); nl = nl_of(raw)
    lines = raw.split(b"\n"); i = line_with(lines, rb'<a href="privacy\.html">Privacy</a>')
    if any(b"delete-account.html" in l for l in lines): raise SystemExit(f"{name}: already linked")
    lines.insert(i + 1, indent(lines[i]) + b'<a href="delete-account.html">Delete account</a>' + (b"\r" if nl_of(raw) == b"\r\n" else b""))
    return raw, b"\n".join(lines)
rep = {}
for n, fn in [("index.html", footer_link), ("login.html", footer_link)] + [(n, standalone) for n in ("examgoal-test-series.html", "jee-main-pyq-chapter.html", "quantrex-test-series.html", "test-series.html")]:
    old, new = fn(n)
    ol, nw = old.split(b"\n"), new.split(b"\n")
    # proof: every live line still present in order (only the 3 retagged lines differ)
    import difflib
    sm = difflib.SequenceMatcher(a=ol, b=nw, autojunk=False)
    removed = [l for t, a1, a2, b1, b2 in sm.get_opcodes() if t in ("delete", "replace") for l in ol[a1:a2]]
    bad = [l for l in removed if not re.search(rb'src="(question-format|data|test-engine)\.js\?v=', l)]
    if bad: raise SystemExit(f"{n}: would remove live lines {bad[:2]}")
    theme = sum(b"data-test-theme" in l for l in ol), sum(b"data-test-theme" in l for l in nw)
    blocks = [m.group(0) for m in re.finditer(rb"<script\b[^>]*>(?:(?!</script>).)*?data-(?:test-)?theme(?:(?!</script>).)*?</script>", old, re.S)]
    for blk in blocks:
        if new.count(blk) != old.count(blk): raise SystemExit(f"{n}: live theme script not byte-identical")
    mixed = [k for k, l in enumerate(nw[:-1]) if (nl_of(old) == b"\r\n") and not l.endswith(b"\r") and ol.count(l) == 0]
    math = [s for s in (b"math-render.js", b"qx-math-repair.js", b"question-format.js", b"katex") if (s in old) != (s in new) or old.count(s) > new.count(s)]
    if theme[0] != theme[1] or math: raise SystemExit(f"{n}: theme/math script loss {theme} {math}")
    os.makedirs(OUT, exist_ok=True); open(f"{OUT}/{n}", "wb").write(new)
    rep[n] = {"liveSha256": hashlib.sha256(old).hexdigest(), "newSha256": hashlib.sha256(new).hexdigest(), "crlf": nl_of(old) == b"\r\n",
              "retagged": [l.strip().decode() for l in removed], "inserted": [l.strip().decode() for t, a1, a2, b1, b2 in sm.get_opcodes() if t in ("insert", "replace") for l in nw[b1:b2]],
              "themeLines": theme[0], "themeScriptBlocks": [{"bytes": len(x), "sha256": hashlib.sha256(x).hexdigest()} for x in blocks],
              "insertedLinesWithoutCR_inCRLFfile": mixed}
    if mixed: raise SystemExit(f"{n}: inserted LF-only lines in CRLF file {mixed}")
json.dump(rep, open("/workspace/qx-livepatch-20261107/html-rebase-proof.json", "w"), indent=1)
for n, r in rep.items(): print(n, "crlf" if r["crlf"] else "lf", "retag", len(r["retagged"]), "insert", len(r["inserted"]) - len(r["retagged"]), "themeLines", r["themeLines"])

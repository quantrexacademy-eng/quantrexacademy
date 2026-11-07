# python3 scripts/hosting/test_qxhost.py — offline; no network, no auth
import json, os, sys, tempfile, gzip, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import qxhost as Q
n = 0
def t(name, fn):
    global n; fn(); n += 1; print("ok", n, name)
d = tempfile.mkdtemp()
for p, c in {"app.html": "<html><head><title>x</title></head></html>", "qx-preview-guard.js": "//g", "a.js": "x"}.items():
    open(os.path.join(d, p), "w").write(c)
base = {"version": "sites/s/versions/V1", "config": {"rewrites": [{"glob": "/api/x", "function": "f"}, {"glob": "**", "path": "/index.html"}], "headers": []},
        "files": {"/app.html": {"hash": "h1"}, "/a.js": {"hash": "h2"}, "/data/banks/x.json": {"hash": "hd"}, "/functions/index.js": {"hash": "hf"},
                  "/_notes.txt": {"hash": "hn"}, "/login.html": {"hash": "hl"}, "/google.html": {"hash": "hg"}}}
fetched = {"/login.html": b"<html><head></head>L</html>", "/google.html": b"google-site-verification: x"}
tag = '<script src="/qx-preview-guard.js?v=qa2"></script>'
def mk(): return Q.build_plan(base, d, ["/app.html", "/a.js", "/qx-preview-guard.js"], ["functions/**", "_*.txt"], [p for p in base["files"] if p.endswith(".html")], tag, lambda p: fetched[p], approved_deletions=["/_notes.txt", "/functions/index.js"], guard_asset=os.path.join(d, "qx-preview-guard.js"))
t("gzip hash deterministic and equals sha256 of the uploaded gz bytes", lambda: (lambda r: (r[0] == Q.gz_hash(b"abc")[0] and hashlib.sha256(r[1]).hexdigest() == r[0] and gzip.decompress(r[1]) == b"abc") or (_ for _ in ()).throw(AssertionError()))(Q.gz_hash(b"abc")))
def t2():
    p = mk(); assert p["deletions"] == ["/_notes.txt", "/functions/index.js"], p["deletions"]
    assert "/data/banks/x.json" in p["untouched"] and p["untouched"]["/data/banks/x.json"] == "hd"
    assert set(p["populate"]) == {"/app.html", "/a.js", "/qx-preview-guard.js", "/login.html", "/google.html"}
    assert p["populate"]["/login.html"]["kind"] == "guard" and p["populate"]["/google.html"]["guard"] == "prefix" and p["notes"]
t("deletions only from audited exclusions; data untouched; guard on every html with <head>", t2)
def t3():
    p = mk(); assert p["removedRewrites"] == [{"glob": "/api/x", "function": "f"}]
    assert p["previewConfig"]["rewrites"] == [{"glob": "**", "path": "/index.html"}]
    h = p["previewConfig"]["headers"][-1]["headers"]; assert "connect-src 'self'" in h["Content-Security-Policy"] and "form-action 'none'" in h["Content-Security-Policy"] and h["X-Robots-Tag"].startswith("noindex")
    assert any(x["path"] == "rewrites" for x in p["configDiff"]) and any(x["path"] == "headers" for x in p["configDiff"])
t("preview config: function rewrites removed, CSP+noindex added, exact diff reported", t3)
def t4():
    try: Q.build_plan(base, d, ["/data/banks/x.json"], [], None, None, None); raise AssertionError("should refuse")
    except SystemExit as e: assert "protected" in str(e)
    try: Q.build_plan(base, d, [], ["data/**"], None, None, None, approved_deletions=["/data/banks/x.json"]); raise AssertionError("should refuse")
    except SystemExit as e: assert "protected" in str(e)
t("refuses to patch or delete /data/ question files", t4)
def t5():
    for ch in ("live", ""):
        try: Q.main(["apply", "--plan", "x", "--channel", ch]); raise AssertionError()
        except SystemExit as e: assert "live" in str(e)
t("apply refuses the live channel", t5)
def t6():
    p = mk(); [v.pop("gz") for v in p["populate"].values()]; f = os.path.join(d, "plan.json"); json.dump(p, open(f, "w"))
    import io, contextlib; out = io.StringIO()
    with contextlib.redirect_stdout(out): Q.main(["apply", "--plan", f, "--channel", "qx-review-x"])
    s = out.getvalue(); assert "DRY RUN" in s and "skipped: no --finalize" in s and "skipped: no --release" in s
t("apply defaults to dry run; finalize/release need explicit flags", t6)
t("glob->regex matches firebase ignore semantics used", lambda: [__import__("re").match(Q.glob_to_regex(g), p) or (_ for _ in ()).throw(AssertionError(g)) for g, p in [("functions/**", "/functions/a/b.js"), ("_*.txt", "/_x.txt"), ("**/node_modules/**", "/a/node_modules/x")]])
assert not __import__("re").match(Q.glob_to_regex("_*.txt"), "/data/_x.txt")
E0 = {"provenance": "Quantrex explanation", "official_solution_claim": False, "allowed_fields": ["solution"], "allowed_original_values": ["No Solution"]}
def V(old, new, ids, e=None):
    """entry with the CORRECT hashes filled in, so each case fails (or passes) on structure, not on hashes"""
    e = dict(e or E0); e.setdefault("baseline_sha256", hashlib.sha256(old).hexdigest()); e.setdefault("patched_sha256", hashlib.sha256(new).hexdigest())
    return Q.verify_solution_only(old, new, ids, e)
def t8():
    old = json.dumps({"title": "T", "questions": [{"id": 1, "q": "x", "options": ["4","1","3","2"], "answer": 3, "solution": ""}, {"id": 2, "q": "y", "solution": "s"}]}).encode()
    good = json.loads(old); good["questions"][0]["solution"] = "new worked solution"
    assert V(old, json.dumps(good).encode(), {"1"}) == []
    assert V(old, json.dumps(good).encode(), {"2"})  # id not approved
    bad = json.loads(old); bad["questions"][1]["solution"] = "overwrite"; assert V(old, json.dumps(bad).encode(), {"2"})
    bad2 = json.loads(json.dumps(good)); bad2["questions"][0]["options"][2] = "5"; assert V(old, json.dumps(bad2).encode(), {"1"})
    os.makedirs(os.path.join(d, "data/banks"), exist_ok=True); open(os.path.join(d, "data/banks/x.json"), "wb").write(json.dumps(good).encode())
    p = Q.build_plan(base, d, ["/data/banks/x.json"], [], None, None, lambda _: old, approved_data={"/data/banks/x.json": {"ids": [1], "provenance": "math-verified", "official_solution_claim": False, "baseline_sha256": hashlib.sha256(old).hexdigest(), "patched_sha256": hashlib.sha256(json.dumps(good).encode()).hexdigest()}})
    assert "/data/banks/x.json" in p["populate"]
t("data patch allowed ONLY as approved fill of an empty solution; options/answer/existing solutions immutable", t8)
def t9():
    E = {"ids": [1], "provenance": "Quantrex explanation", "official_solution_claim": False, "allowed_fields": ["solution"], "allowed_original_values": ["No Solution"]}
    old = json.dumps({"questions": [{"id": 1, "q": "x", "solution": "No Solution"}, {"id": 2, "q": "y", "solution": "real worked steps"}]}).encode()
    g = json.loads(old); g["questions"][0]["solution"] = "<p><strong>Quantrex Explanation</strong></p>"
    assert V(old, json.dumps(g).encode(), {"1"}, E) == []
    # placeholder must match EXACTLY; a legitimate worked solution is never replaceable
    o2 = old.replace(b'"No Solution"', b'"No solution yet"'); assert V(o2, json.dumps(g).encode(), {"1"}, E)
    b = json.loads(json.dumps(g)); b["questions"][1]["solution"] = "replaced"; assert V(old, json.dumps(b).encode(), {"1", "2"}, E)
    assert V(old, json.dumps(g).encode(), {"1"}, dict(E, provenance=""))
    assert V(old, json.dumps(g).encode(), {"1"}, dict(E, official_solution_claim=True))
    assert Q.verify_solution_only(old, json.dumps(g).encode(), {"1"}, dict(E, baseline_sha256="0"*64))
    dup = b'{"questions": [{"id": 1, "q": "x", "q": "z", "solution": "No Solution"}]}'; assert any("duplicate JSON" in e for e in V(dup, json.dumps(g).encode(), {"1"}, E))
    dids = json.dumps({"questions": [{"id": 1, "solution": ""}, {"id": 1, "solution": ""}]}).encode(); assert V(dids, dids, {"1"}, E)
    e = json.loads(json.dumps(g)); e["questions"][0]["solution"] = "  "; assert V(old, json.dumps(e).encode(), {"1"}, E)
    assert V(old, old, {"1"}, E)  # approved id not filled
    k = json.loads(json.dumps(g)); k["questions"][0] = {"solution": k["questions"][0]["solution"], "id": 1, "q": "x"}; assert V(old, json.dumps(k).encode(), {"1"}, E)  # key order
    W = "/workspace/qx-solutions-20261107"; P = "/data/banks/chapters/ap_eamcet/mathematics/trigonometric-ratios-and-identities.json"
    if os.path.exists(W + "/patches" + P) and os.path.exists("/tmp/ap-trig-fresh.json"):
        man = json.load(open(W + "/approved-solutions-provenance.json"))[P]
        r = Q.verify_solution_only(open("/tmp/ap-trig-fresh.json", "rb").read(), open(W + "/patches" + P, "rb").read(), {str(x) for x in man["ids"]}, man)
        assert r == [], r
        print("   real AP EAMCET Trig patch validated against fresh canonical baseline")
t("placeholder 'No Solution' fill: exact placeholder only, provenance+non-official+sha gates, dup keys/ids, key order", t9)
import urllib.error, io as _io
class _R:
    def __init__(s, url, body, status=200): s.url, s.body, s.status = url, body, status
    def geturl(s): return s.url
    def read(s, n=-1): return s.body[:n] if n and n > 0 else s.body
class _Op:
    def __init__(s, fn): s.fn = fn; s.urls = []
    def open(s, url, timeout=0): s.urls.append(url); return s.fn(url)
def t10():
    for bad in ["/../x", "/a/../../x", "/a\\b", "/a\x00", "//evil.com/x", "/a/%2e%2e/x", "/a%2fb", "https://x/y", "x.html", "/a/./b"]:
        try: Q.safe_path(bad); raise AssertionError(bad)
        except SystemExit: pass
    assert Q.safe_path("/assets/a-b.css") == "/assets/a-b.css"
    os.symlink("/etc", os.path.join(d, "lnk"))
    try: Q.root_join(d, "/lnk/passwd"); raise AssertionError("symlink escape")
    except SystemExit as e: assert "escaping" in str(e)
t("path sanitizer: traversal, backslash, NUL, double slash, encoded separators, scheme, symlink escape", t10)
def t11():
    log = {}; op = _Op(lambda u: _R(u, b"hello"))
    f = Q.canonical_fetcher("quantrexacademy-app", {"/app.html"}, log, opener=op)
    assert f("/app.html") == b"hello" and op.urls[0].startswith("https://quantrexacademy-app.web.app/app.html?qxcb=")
    assert log["/app.html"]["rawSha256"] == hashlib.sha256(b"hello").hexdigest()
    for fn, why in [(lambda: f("/not-in-manifest.html"), "not in live manifest"),
                    (lambda: Q.canonical_fetcher("quantrexacademy-app", {"/a"}, {}, opener=_Op(lambda u: _R("https://quantrexacademy-app.web.app/app", b"x")))("/a"), "direct 200"),
                    (lambda: Q.canonical_fetcher("quantrexacademy-app", {"/a"}, {}, opener=_Op(lambda u: (_ for _ in ()).throw(urllib.error.HTTPError(u, 301, "m", {}, None))))("/a"), "HTTP 301"),
                    (lambda: Q.canonical_fetcher("quantrexacademy-app", {"/a"}, {}, opener=_Op(lambda u: _R(u, b"x" * 11)), cap=10)("/a"), "over")]:
        try: fn(); raise AssertionError(why)
        except SystemExit as e: assert why in str(e), (why, str(e))
t("canonical fetch: site.web.app only, manifest-known paths, direct 200, redirects refused, byte cap, raw sha logged", t11)
def t12():
    live = {"rewrites": [{"glob": "/api/**", "function": "api"}, {"glob": "/r/**", "run": {"serviceId": "s"}}, {"glob": "/l/**", "dynamicLinks": True}, {"glob": "**", "destination": "/index.html"}],
            "headers": [{"glob": "**", "headers": {"content-security-policy": "old", "X-Frame-Options": "DENY"}}, {"glob": "*.html", "headers": {"X-ROBOTS-TAG": "all"}}, {"regex": ".*", "headers": {"Content-Security-Policy-Report-Only": "r"}}]}
    cfg, removed, _dr = Q.preview_config(live, Q.CSP); Q.assert_isolated(cfg)
    assert len(removed) == 3 and cfg["rewrites"] == [{"glob": "**", "destination": "/index.html"}]
    keys = [k.lower() for h in cfg["headers"] for k in h["headers"]]
    assert keys.count("content-security-policy") == 1 and keys.count("x-robots-tag") == 1 and "content-security-policy-report-only" not in keys
    assert {"glob": "**", "headers": {"X-Frame-Options": "DENY"}} in cfg["headers"]
    assert Q.production_config(live) == live
    try: Q.assert_isolated(live); raise AssertionError()
    except SystemExit: pass
    assert "'unsafe-inline'" in Q.CSP.split("script-src")[1].split(";")[0]  # real app inline bootstrap/onclick must run
t("preview headers: CSP/noindex dedup case-insensitive -> one global; Functions/Run/DynamicLinks rewrites removed; production config = live unchanged", t12)
def t13():
    for ch in ("LIVE", " live ", "sites/x/channels/live", "Live/"):
        try: Q.main(["apply", "--plan", "x", "--channel", ch]); raise AssertionError(ch)
        except SystemExit as e: assert "live" in str(e)
    p = mk(); [v.pop("gz") for v in p["populate"].values()]; p["isolation"] = False; f = os.path.join(d, "plan2.json"); json.dump(p, open(f, "w"))
    try: Q.main(["apply", "--plan", f, "--channel", "qx-review-x"]); raise AssertionError()
    except SystemExit as e: assert "ISOLATED" in str(e)
t("live refusal: normalized/case/path forms; non-isolated (production-shaped) plan refused by apply", t13)
def t14():
    p = mk(); fm = p["finalManifest"]; assert Q.manifest_errors(dict(fm), p) == []
    assert Q.manifest_errors({**fm, "/extra": "h"}, p) and Q.manifest_errors({k: v for k, v in list(fm.items())[1:]}, p)
    g = dict(fm); g["/a.js"] = "zz"; assert Q.manifest_errors(g, p)
    assert "/functions/index.js" not in fm and fm["/data/banks/x.json"] == "hd"
    gz = os.path.join(d, "gzt"); os.makedirs(gz, exist_ok=True); h, b = Q.gz_hash(b"x"); open(os.path.join(gz, h), "wb").write(b)
    assert Q.read_blob(gz, h) == b
    open(os.path.join(gz, h), "wb").write(b + b"!")
    try: Q.read_blob(gz, h); raise AssertionError()
    except SystemExit as e: assert "does not hash" in str(e)
    try: Q.read_blob(gz, "../x"); raise AssertionError()
    except SystemExit: pass
t("exact final manifest set+hash; upload blob bytes hash-checked; bad hash names refused", t14)
def t15():
    try: Q.build_plan(base, d, ["/app.html"], ["functions/**"], None, None, lambda p: b"", approved_deletions=["/app.html"]); raise AssertionError()
    except SystemExit as e: assert "not matched" in str(e)
    p = Q.build_plan(base, d, ["/app.html"], ["functions/**", "_*.txt"], None, None, lambda p: b"")
    assert p["deletions"] == [] and p["deletionCandidates"] == ["/_notes.txt", "/functions/index.js"]
    try: Q.build_plan(base, d, ["/app.html", "/qx-preview-guard.js"], [], ["/app.html"], tag, lambda p: b"", guard_asset="/nonexistent/g.js"); raise AssertionError()
    except SystemExit as e: assert "guard asset missing" in str(e)
    try: Q.build_plan(base, d, ["/missing.js"], [], None, None, lambda p: b""); raise AssertionError()
    except SystemExit as e: assert "missing" in str(e)
    assert os.path.isfile(Q.GUARD_ASSET) and "QA PREVIEW" in open(Q.GUARD_ASSET).read()
t("deletions only from EXACT reviewed list (wildcards = candidates); missing guard/patch file refused; durable guard asset present", t15)
def csp_allows(csp, kind, url=None, origin="https://quantrexacademy-app--qx.web.app"):
    d = {x.split()[0]: x.split()[1:] for x in (y.strip() for y in csp.split(";")) if x}
    src = d.get(kind, d.get("default-src", []))
    if url is None: return "'unsafe-inline'" in src  # inline <script> / onclick
    if "'none'" in src: return False
    host = url.split("/")[2]; o = "https://" + host
    return ("'self'" in src and o == origin) or any(s == o or (s.startswith("https://") and s.rstrip("/") == o) for s in src)
def t16():
    c = Q.CSP
    assert csp_allows(c, "script-src")  # app inline bootstrap + onclick handlers
    assert csp_allows(c, "script-src", "https://www.gstatic.com/firebasejs/x.js") and csp_allows(c, "connect-src", "https://quantrexacademy-app--qx.web.app/data/a.json")
    for u in ["https://firestore.googleapis.com/v1/x", "https://identitytoolkit.googleapis.com/v1/x", "https://securetoken.googleapis.com/x", "https://us-central1-quantrexacademy-app.cloudfunctions.net/f", "https://api.razorpay.com/x"]:
        assert not csp_allows(c, "connect-src", u), u
    assert not csp_allows(c, "worker-src", "https://quantrexacademy-app--qx.web.app/sw.js") and "form-action 'none'" in c and "frame-src 'self'" in c
    lines = open(os.path.join(os.path.dirname(Q.__file__), "exclusions.txt")).read().split()
    for need in ["functions/**", "scripts/**", "tools/**", "docs/**", "*.md", "*.py", "*.bat", "*.ps1", ".firebaserc", "*.apk", "hosting-fast/**"]: assert need in lines, need
    assert not any(l.startswith("data") for l in lines)
t("CSP policy: inline app bootstrap/onclick allowed, same-origin data ok; Auth/Firestore/Functions/payment connect denied; exclusions cover firebase ignore internals, never data", t16)
def t17():
    old = b'{"questions": [{"id": 1, "n": 1, "f": true, "solution": "No Solution"}, {"id": 2, "n": 2.50, "solution": "x"}]}'
    ok = old.replace(b'"No Solution"', b'"<p><strong>Quantrex Explanation</strong></p>"', 1)
    assert V(old, ok, {"1"}) == []
    for bad in [ok.replace(b'"n": 1,', b'"n": 1.0,'), ok.replace(b'"f": true', b'"f": 1'), ok.replace(b'2.50', b'2.5'), ok.replace(b', "n": 2', b',  "n": 2'), ok.replace(b'"solution": "x"', b'"solution": "y"')]:
        assert V(old, bad, {"1"}), bad  # type/number/whitespace/other-solution changes are caught byte-exactly
    assert Q.verify_solution_only(old, ok, {"1"}, E0)  # hashes mandatory
    assert Q.verify_solution_only(old, ok, {"1"}, dict(E0, baseline_sha256="abc", patched_sha256="def"))
    assert V(old, ok.replace(b'"<p>', b'1, "z": "<p>', 1), {"1"})  # not a single string token
    cfg, rm, dropped = Q.preview_config({"headers": [{"glob": "**", "headers": {"x-robots-tag": "all"}}]}, Q.CSP)
    assert "_qxDroppedHeaders" not in cfg and dropped == [{"glob": "**", "header": "x-robots-tag"}]
    Q.assert_api_config(cfg)
    try: Q.assert_api_config(dict(cfg, foo=1)); raise AssertionError()
    except SystemExit as e: assert "ServingConfig" in str(e)
    assert hashlib.sha256(open(Q.GUARD_ASSET, "rb").read()).hexdigest() == Q.GUARD_SHA256  # update pin deliberately on reviewed guard edits
    g = open(Q.GUARD_ASSET).read()
    for need in ["storage\\.googleapis\\.com", "www\\.googleapis\\.com", "apis\\.google\\.com", "window.open=", "External navigation is not allowed", "CONNECTING", "NOT full isolation"]: assert need in g, need
    src = open(Q.__file__).read(); assert 'channels/{ch_id}/releases' in src and 'channels/{a.channel}/releases' not in src
    import types; ex = os.path.join(d, "ex.txt"); open(ex, "w").write("  # comment\n\tfunctions/**\n")
    assert [l.strip() for l in open(ex) if l.strip() and not l.strip().startswith("#")] == ["functions/**"]
t("raw byte-exact data proof (1 vs 1.0, true vs 1, 2.50, whitespace, other solution); hashes mandatory; config API fields only; guard pin + nav/storage blocks; release uses validated channel", t17)
G = '<script src="/qx-preview-guard.js?v=qa2"></script>'; GS = "/qx-preview-guard.js?v=qa2"
def plan_with(files_html, patch_html, fetched_html):
    dd = tempfile.mkdtemp(); open(os.path.join(dd, "qx-preview-guard.js"), "w").write("//g")
    for p, c in patch_html.items(): os.makedirs(os.path.dirname(os.path.join(dd, p.lstrip("/"))), exist_ok=True); open(os.path.join(dd, p.lstrip("/")), "w").write(c)
    bb = {"version": "v", "config": {}, "files": {p: {"hash": "h" + p} for p in files_html}}
    return Q.build_plan(bb, dd, list(patch_html) + ["/qx-preview-guard.js"], [], [p for p in files_html if Q._is_html(p)], G, lambda p: fetched_html[p].encode(), guard_asset=os.path.join(dd, "qx-preview-guard.js"))
def body(pl, p): return gzip.decompress(pl["populate"][p]["gz"]).decode()
def t18():
    pl = plan_with({"/old.html": 1, "/data/x.json": 1}, {"/new-page.html": "<!DOCTYPE html><html><head><title>n</title></head></html>"}, {"/old.html": "<html><head></head></html>"})
    assert Q.is_guarded(body(pl, "/new-page.html"), GS) and Q.is_guarded(body(pl, "/old.html"), GS) and pl["finalManifest"]["/data/x.json"] == "h/data/x.json"
t("NEW patched html (not on live) gets the guard; live html too; data untouched", t18)
def t19():
    pl = plan_with({"/app.html": 1}, {"/app.html": "<html><head><script src=app.js></script></head></html>"}, {})
    b = body(pl, "/app.html"); assert b.index("qx-preview-guard") < b.index("app.js") and pl["populate"]["/app.html"]["kind"] == "patch+guard"
t("MODIFIED existing html: guard inserted before the page's own scripts", t19)
def t20():
    frag = "<div>fragment</div><script>x()</script>"; gv = "google-site-verification: google54d8.html"
    dt = "<!DOCTYPE html>\n<p>no head</p>"
    pl = plan_with({"/f.html": 1, "/g.html": 1, "/d.html": 1}, {}, {"/f.html": frag, "/g.html": gv, "/d.html": dt})
    assert body(pl, "/f.html") == G + "\n" + frag and body(pl, "/g.html") == G + "\n" + gv  # original bytes kept after the prefix
    assert body(pl, "/d.html").startswith("<!DOCTYPE html>\n" + G) and body(pl, "/d.html").endswith("<p>no head</p>")
    assert all(pl["populate"][p]["guard"] == "prefix" for p in ("/f.html", "/g.html", "/d.html"))
t("headless fragment / Google verification / doctype-only: explicit preview-only prefix, original bytes preserved", t20)
def t21():
    pl = plan_with({"/UP.HTML": 1, "/x.Htm": 1}, {}, {"/UP.HTML": "<HTML><HEAD></HEAD></HTML>", "/x.Htm": "<html><HEAD lang=en></HEAD></html>"})
    assert Q.is_guarded(body(pl, "/UP.HTML"), GS) and Q.is_guarded(body(pl, "/x.Htm"), GS)
t("uppercase .HTML/.Htm and <HEAD> are covered", t21)
def t22():
    bb = {"version": "v", "config": {}, "files": {"/a.html": {"hash": "h"}, "/b.html": {"hash": "h2"}}}
    dd = tempfile.mkdtemp(); open(os.path.join(dd, "qx-preview-guard.js"), "w").write("//g")
    try: Q.build_plan(bb, dd, ["/qx-preview-guard.js"], [], ["/a.html"], G, lambda p: b"<html><head></head></html>", guard_asset=os.path.join(dd, "qx-preview-guard.js")); raise AssertionError("must refuse")
    except SystemExit as e: assert "unguarded html" in str(e) and "/b.html" in str(e)
t("an html left out of the guard list makes the plan REFUSE (fail closed)", t22)
def t23():
    g = "<html><head>\n" + G + "<script src=a.js></script></head></html>"
    out, how = Q.inject_guard(g, G, GS); assert how == "already" and out == g
    for fake in ['<!-- ' + G + ' --><html><head></head></html>', '<html><head><title>' + G + '</title></head></html>',
                 '<html><head><script>var s=\'' + G + '\'</script></head></html>', '<html data-x=\'' + G + '\'><head></head></html>',
                 '<html><head><script src=evil.js></script>' + G + '</head></html>', '<html><head><script src="/qx-preview-guard.js?v=qa2" async></script></head></html>',
                 '<html><head><template>' + G + '</template></head></html>', '<html><head><textarea>' + G + '</textarea></head></html>', '<html><head><noscript>' + G + '</noscript></head></html>']:
        assert not Q.is_guarded(fake, GS), fake
        out, how = Q.inject_guard(fake, G, GS); assert Q.is_guarded(out, GS) and how != "already", fake
t("idempotent on a correct first guard; quoted/commented/attribute/later/async guard text never counts as guarded", t23)
def t24():
    crlf = "<!DOCTYPE html>\r\n<html>\r\n<head>\r\n<title>t</title>\r\n</head>\r\n</html>\r\n"
    out, how = Q.inject_guard(crlf, G, GS); assert how == "head" and out == crlf.replace("<head>", "<head>\r\n" + G, 1)
    assert "\n" not in out.replace("\r\n", ""), "no bare LF in a CRLF page"
    out2, _ = Q.inject_guard("<p>x</p>\r\n<p>y</p>\r\n", G, GS); assert out2 == G + "\r\n<p>x</p>\r\n<p>y</p>\r\n"
    lf = "<html><head>\n</head></html>\n"; o3, _ = Q.inject_guard(lf, G, GS); assert "\r" not in o3
t("guard injection keeps the page's dominant line ending (CRLF pages get CRLF, LF pages LF)", t24)
print("PASS", n)

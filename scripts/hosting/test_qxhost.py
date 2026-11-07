# python3 scripts/hosting/test_qxhost.py — offline; no network, no auth
import json, os, sys, tempfile, gzip, hashlib
sys.path.insert(0, os.path.dirname(__file__)); import qxhost as Q
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
def mk(): return Q.build_plan(base, d, ["/app.html", "/a.js", "/qx-preview-guard.js"], ["functions/**", "_*.txt"], [p for p in base["files"] if p.endswith(".html")], tag, lambda p: fetched[p])
t("gzip hash deterministic and equals sha256 of the uploaded gz bytes", lambda: (lambda r: (r[0] == Q.gz_hash(b"abc")[0] and hashlib.sha256(r[1]).hexdigest() == r[0] and gzip.decompress(r[1]) == b"abc") or (_ for _ in ()).throw(AssertionError()))(Q.gz_hash(b"abc")))
def t2():
    p = mk(); assert p["deletions"] == ["/_notes.txt", "/functions/index.js"], p["deletions"]
    assert "/data/banks/x.json" in p["untouched"] and p["untouched"]["/data/banks/x.json"] == "hd"
    assert set(p["populate"]) == {"/app.html", "/a.js", "/qx-preview-guard.js", "/login.html"}
    assert p["populate"]["/login.html"]["kind"] == "guard" and "/google.html" not in p["populate"] and p["notes"]
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
    try: Q.build_plan(base, d, [], ["data/**"], None, None, None); raise AssertionError("should refuse")
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
def t8():
    old = json.dumps({"title": "T", "questions": [{"id": 1, "q": "x", "options": ["4","1","3","2"], "answer": 3, "solution": ""}, {"id": 2, "q": "y", "solution": "s"}]}).encode()
    good = json.loads(old); good["questions"][0]["solution"] = "new worked solution"
    assert Q.verify_solution_only(old, json.dumps(good).encode(), {"1"}) == []
    assert Q.verify_solution_only(old, json.dumps(good).encode(), {"2"})  # id not approved
    bad = json.loads(old); bad["questions"][1]["solution"] = "overwrite"; assert Q.verify_solution_only(old, json.dumps(bad).encode(), {"2"})
    bad2 = json.loads(json.dumps(good)); bad2["questions"][0]["options"][2] = "5"; assert Q.verify_solution_only(old, json.dumps(bad2).encode(), {"1"})
    os.makedirs(os.path.join(d, "data/banks"), exist_ok=True); open(os.path.join(d, "data/banks/x.json"), "wb").write(json.dumps(good).encode())
    p = Q.build_plan(base, d, ["/data/banks/x.json"], [], None, None, lambda _: old, approved_data={"/data/banks/x.json": {"ids": [1], "provenance": "math-verified", "official_solution_claim": False}})
    assert "/data/banks/x.json" in p["populate"]
t("data patch allowed ONLY as approved fill of an empty solution; options/answer/existing solutions immutable", t8)
def t9():
    E = {"ids": [1], "provenance": "Quantrex explanation", "official_solution_claim": False, "allowed_fields": ["solution"], "allowed_original_values": ["No Solution"]}
    old = json.dumps({"questions": [{"id": 1, "q": "x", "solution": "No Solution"}, {"id": 2, "q": "y", "solution": "real worked steps"}]}).encode()
    g = json.loads(old); g["questions"][0]["solution"] = "<p><strong>Quantrex Explanation</strong></p>"
    assert Q.verify_solution_only(old, json.dumps(g).encode(), {"1"}, E) == []
    # placeholder must match EXACTLY; a legitimate worked solution is never replaceable
    o2 = old.replace(b'"No Solution"', b'"No solution yet"'); assert Q.verify_solution_only(o2, json.dumps(g).encode(), {"1"}, E)
    b = json.loads(json.dumps(g)); b["questions"][1]["solution"] = "replaced"; assert Q.verify_solution_only(old, json.dumps(b).encode(), {"1", "2"}, E)
    assert Q.verify_solution_only(old, json.dumps(g).encode(), {"1"}, dict(E, provenance=""))
    assert Q.verify_solution_only(old, json.dumps(g).encode(), {"1"}, dict(E, official_solution_claim=True))
    assert Q.verify_solution_only(old, json.dumps(g).encode(), {"1"}, dict(E, baseline_sha256="0"*64))
    dup = b'{"questions": [{"id": 1, "q": "x", "q": "z", "solution": "No Solution"}]}'; assert any("duplicate JSON" in e for e in Q.verify_solution_only(dup, json.dumps(g).encode(), {"1"}, E))
    dids = json.dumps({"questions": [{"id": 1, "solution": ""}, {"id": 1, "solution": ""}]}).encode(); assert Q.verify_solution_only(dids, dids, {"1"}, E)
    e = json.loads(json.dumps(g)); e["questions"][0]["solution"] = "  "; assert Q.verify_solution_only(old, json.dumps(e).encode(), {"1"}, E)
    assert Q.verify_solution_only(old, old, {"1"}, E)  # approved id not filled
    k = json.loads(json.dumps(g)); k["questions"][0] = {"solution": k["questions"][0]["solution"], "id": 1, "q": "x"}; assert Q.verify_solution_only(old, json.dumps(k).encode(), {"1"}, E)  # key order
    W = "/workspace/qx-solutions-20261107"; P = "/data/banks/chapters/ap_eamcet/mathematics/trigonometric-ratios-and-identities.json"
    if os.path.exists(W + "/patches" + P) and os.path.exists("/tmp/ap-trig-fresh.json"):
        man = json.load(open(W + "/approved-solutions-provenance.json"))[P]
        r = Q.verify_solution_only(open("/tmp/ap-trig-fresh.json", "rb").read(), open(W + "/patches" + P, "rb").read(), {str(x) for x in man["ids"]}, man)
        assert r == [], r
        print("   real AP EAMCET Trig patch validated against fresh canonical baseline")
t("placeholder 'No Solution' fill: exact placeholder only, provenance+non-official+sha gates, dup keys/ids, key order", t9)
print("PASS", n)

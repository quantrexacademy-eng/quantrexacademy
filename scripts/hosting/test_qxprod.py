import gzip, os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import qxprod as P
n = 0
def t(name, cond):
    global n; assert cond, name; n += 1; print("ok", n, name)
G = {"h1": gzip.compress(b"<html>ok</html>"), "h2": gzip.compress(b'<script src="/qx-preview-guard.js"></script>'), "hd": gzip.compress(b"{}")}
live = {"/a.html": {"hash": "L"}, "/data/x.json": {"hash": "D"}}; cfg = {"rewrites": [{"glob": "/api/**", "run": {"serviceId": "s"}}]}
def plan(**k):
    p = {"isolation": False, "deletions": [], "removedRewrites": [], "previewConfig": cfg,
         "finalManifest": {"/a.html": "h1", "/data/x.json": "D"}, "populate": {"/a.html": {"hash": "h1"}}}
    p.update(k); return p
chk = lambda p, ap=("/data/x.json",): P.check_plan(p, live, cfg, set(ap), G.__getitem__)
t("good live-derived plan passes", chk(plan()) == [])
t("isolated plan refused", chk(plan(isolation=True)))
t("deletions refused", chk(plan(deletions=["/a.html"])))
t("config differing from live (rewrites dropped) refused", chk(plan(previewConfig={})))
t("missing live path refused", chk(plan(finalManifest={"/a.html": "h1"})))
t("preview guard in html refused", chk(plan(finalManifest={"/a.html": "h2", "/data/x.json": "D"}, populate={"/a.html": {"hash": "h2"}})))
t("unapproved data change refused", chk(plan(finalManifest={"/a.html": "h1", "/data/x.json": "hd"}, populate={"/a.html": {"hash": "h1"}, "/data/x.json": {"hash": "hd"}}), ap=()))
t("untouched path hash drift refused", chk(plan(finalManifest={"/a.html": "h1", "/data/x.json": "ZZ"})))
t("guard artifact path refused", chk(plan(finalManifest={"/a.html": "h1", "/data/x.json": "D", "/qx-preview-guard.js": "h1"}, populate={"/a.html": {"hash": "h1"}, "/qx-preview-guard.js": {"hash": "h1"}})))
print("PASS", n)

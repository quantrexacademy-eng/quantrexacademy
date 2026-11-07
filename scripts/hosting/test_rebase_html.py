# offline: checks the rebased pages in ../patch against exact live bytes in /workspace/qxhost-baseline/live-raw
import json, re, hashlib, os, sys
L = "/workspace/qxhost-baseline/live-raw"; P = os.environ.get("QX_LIVEPATCH", "/workspace/qx-livepatch-20261107/patch")
proof = json.load(open(os.path.join(P, "..", "html-rebase-proof.json"))); n = 0
for name, pr in proof.items():
    old = open(f"{L}/{name}", "rb").read(); new = open(f"{P}/{name}", "rb").read()
    assert hashlib.sha256(old).hexdigest() == pr["liveSha256"] and hashlib.sha256(new).hexdigest() == pr["newSha256"], name
    bare = lambda b: b.count(b"\n") - b.count(b"\r\n")
    if pr["crlf"]: assert bare(new) == bare(old), f"{name}: new bare-LF lines in CRLF page"
    else: assert b"\r" not in new or new.count(b"\r") == old.count(b"\r"), f"{name}: CR added to LF page"
    for blk in re.findall(rb"<script\b[^>]*>(?:(?!</script>).)*?data-(?:test-)?theme(?:(?!</script>).)*?</script>", old, re.S):
        assert new.count(blk) == old.count(blk), f"{name}: theme script changed"
    ol, nl = old.split(b"\n"), new.split(b"\n"); it = iter(nl)
    retag = re.compile(rb'src="(question-format|data|test-engine)\.js\?v=')
    for l in ol:  # every live line survives in order (3 retagged script lines excepted)
        if retag.search(l): continue
        assert any(x == l for x in it), f"{name}: live line lost/reordered: {l[:60]!r}"
    for s in (b"math-render.js", b"qx-math-repair.js", b"question-format.js"): assert new.count(s) >= old.count(s), (name, s)
    n += 1; print("ok", name)
print("PASS", n)

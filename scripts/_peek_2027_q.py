import json, glob, os, re
files = glob.glob(r"E:\QUANTREX\website\data\tests\jee_main_examgoal_2027\questions\*.json")
print("nfiles", len(files))
img_hosts = {}
latexish = 0
nqs = 0
empty_opt = 0
for fp in files[:8]:
    d = json.loads(open(fp, encoding="utf-8").read())
    if isinstance(d, list):
        qs = d
    elif isinstance(d, dict):
        qs = d.get("questions") or d.get("items") or d.get("data") or [d]
    else:
        continue
    if not isinstance(qs, list):
        qs = [qs]
    print("FILE", os.path.basename(fp), "nq", len(qs), "top", list(d.keys())[:10] if isinstance(d, dict) else "list")
    for q in qs[:2]:
        if not isinstance(q, dict):
            continue
        nqs += 1
        blob = str(q.get("q") or q.get("question") or q.get("stem") or "")
        opts = q.get("options") or q.get("choices") or []
        print(" keys", list(q.keys())[:18])
        print(" stem", blob[:220].replace("\n", " "))
        if opts:
            o0 = opts[0]
            print(" opt0", str(o0 if not isinstance(o0, dict) else o0.get("text") or o0.get("html") or o0)[:180])
        for o in opts:
            t = o if not isinstance(o, dict) else (o.get("text") or o.get("html") or "")
            if not str(t).strip():
                empty_opt += 1
        imgs = re.findall(r'src=["\']([^"\']+)["\']', blob + str(opts), re.I)
        for u in imgs:
            host = u.split("/")[2] if "://" in u else "rel"
            img_hosts[host] = img_hosts.get(host, 0) + 1
            if "getmarks" in u or ".app/" in u:
                print("  IMG", u[:140])
        if "$" in blob or "\\" in blob or "katex" in blob.lower():
            latexish += 1
print("latexish_in_sample", latexish, "empty_opt", empty_opt)
print("hosts", img_hosts)

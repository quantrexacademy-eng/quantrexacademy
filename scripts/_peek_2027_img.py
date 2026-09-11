import json, glob, os, re
files = glob.glob(r"E:\QUANTREX\website\data\tests\jee_main_examgoal_2027\questions\*.json")
with_img_field = 0
with_img_tag = 0
img_samples = []
for fp in files:
    d = json.loads(open(fp, encoding="utf-8").read())
    qs = d if isinstance(d, list) else (d.get("questions") or [d])
    if not isinstance(qs, list):
        qs = [qs]
    for q in qs:
        if not isinstance(q, dict):
            continue
        blob = json.dumps(q)
        if q.get("image"):
            with_img_field += 1
            if len(img_samples) < 8:
                img_samples.append(("field", os.path.basename(fp), str(q.get("image"))[:160]))
        if "<img" in blob.lower():
            with_img_tag += 1
            if len(img_samples) < 12:
                m = re.search(r'<img[^>]+src=["\']([^"\']+)', blob, re.I)
                img_samples.append(("tag", os.path.basename(fp), (m.group(1) if m else "no-src")[:160]))
print("with_img_field", with_img_field, "with_img_tag", with_img_tag)
for s in img_samples:
    print(s)

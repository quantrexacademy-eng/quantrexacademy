#!/usr/bin/env python3
"""Sample live/local solution HTML for img srcs and test proxy."""
import json
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting")
CTX = ssl.create_default_context()
UA = "Mozilla/5.0"


def get(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "*/*"})
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=CTX) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()[:200]
    except Exception as e:
        return None, {}, str(e).encode()


def main():
    bank = json.loads((ROOT / "data/banks/neet.json").read_text(encoding="utf-8"))
    qs = bank["questions"]
    hosts = Counter()
    n_img = 0
    samples = []
    for q in qs:
        sol = str(q.get("solution") or "")
        imgs = re.findall(r'src=["\']([^"\']+)["\']', sol, re.I)
        if not imgs:
            continue
        n_img += 1
        for u in imgs:
            try:
                host = urllib.parse.urlparse(u).hostname or "rel"
            except Exception:
                host = "bad"
            hosts[host] += 1
            if len(samples) < 12:
                samples.append((q.get("id"), q.get("source"), u[:180], str(q.get("q") or "")[:40]))
    print("neet qs with sol img", n_img)
    print("hosts", hosts.most_common(15))
    print("samples")
    for s in samples:
        print(" ", s[0], s[1], s[2][:160])

    # live catalog NEET 2025 sols
    u = "https://www.quantrexacademy.com/api/catalog?action=paper&exam=neet&source=" + urllib.parse.quote("NEET 2025") + "&v=qxfix47"
    st, _, raw = get(u, 90)
    print("\nlive paper", st, len(raw))
    try:
        d = json.loads(raw.decode("utf-8", "ignore"))
    except Exception:
        print("not json")
        return
    qs = d.get("questions") or []
    live_hosts = Counter()
    live_imgs = []
    for q in qs:
        for field in ("q", "solution"):
            blob = str(q.get(field) or "")
            for src in re.findall(r'src=["\']([^"\']+)["\']', blob, re.I):
                live_imgs.append((field, src))
                try:
                    live_hosts[urllib.parse.urlparse(src).hostname or "rel"] += 1
                except Exception:
                    live_hosts["bad"] += 1
    print("live img hosts", live_hosts.most_common())
    # hit first 8 unique imgs via live proxy
    seen = set()
    n = 0
    for field, src in live_imgs:
        if src in seen:
            continue
        seen.add(src)
        n += 1
        if n > 8:
            break
        if src.startswith("/api/proxy-image"):
            url = "https://www.quantrexacademy.com" + src
        elif src.startswith("http"):
            url = "https://www.quantrexacademy.com/api/proxy-image?url=" + urllib.parse.quote(src, safe="") + "&clean=1&v=pale1"
        else:
            url = "https://www.quantrexacademy.com" + src
        st2, hdrs, body = get(url, 40)
        ctype = (hdrs.get("Content-Type") or hdrs.get("content-type") or "")[:40]
        print(f"  {st2} {len(body)} {ctype} {field} {src[:120]}")


if __name__ == "__main__":
    main()

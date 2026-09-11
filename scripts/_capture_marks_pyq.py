#!/usr/bin/env python3
"""Login to Marks in a browser, capture the Most Important PYQ module APIs, save token.
Does not write credentials into frontend files.
"""
from __future__ import annotations

import json
import time
from pathlib import Path

ROOT = Path(r"E:\QUANTREX\website")
OUT = ROOT / "data" / "_migration" / "marks_pyq_capture"
CFG = ROOT / "data" / "marks_config.json"
EXAM = "6a91185f41ab5aba084f4d30"
MOD = "6a916235cb18ffc9d00d5aa1"
URL = f"https://web.getmarks.app/marks-selected/exams/{EXAM}/module/{MOD}/"

EMAIL = "ajaykumarsaroj13@gmail.com"
PASSWORD = "Saroj2013@"


def main():
    from playwright.sync_api import sync_playwright

    OUT.mkdir(parents=True, exist_ok=True)
    hits = []

    def keep(req):
        u = req.url
        if any(k in u.lower() for k in (
            "/api/", "marks-selected", "graphql", "question", "module", "subject", "chapter"
        )):
            hits.append({"method": req.method, "url": u, "res": None})

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome", args=["--disable-blink-features=AutomationControlled"])
        ctx = browser.new_context(viewport={"width": 1400, "height": 900})
        page = ctx.new_page()
        page.on("request", keep)

        def on_res(res):
            u = res.url
            if "/api/" in u or "marks-selected" in u or "graphql" in u:
                try:
                    body = res.text()
                except Exception:
                    body = ""
                hits.append({
                    "method": res.request.method,
                    "url": u,
                    "status": res.status,
                    "ctype": res.headers.get("content-type", ""),
                    "body": (body or "")[:4000],
                })

        page.on("response", on_res)

        page.goto("https://web.getmarks.app/login", wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(2500)
        page.screenshot(path=str(OUT / "login.png"), full_page=True)

        filled = False
        for sel in ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="Email" i]', "#email"]:
            loc = page.locator(sel)
            if loc.count():
                loc.first.fill(EMAIL)
                filled = True
                break
        if filled:
            for sel in ['input[type="password"]', 'input[name="password"]']:
                loc = page.locator(sel)
                if loc.count():
                    loc.first.fill(PASSWORD)
                    break
            for name in ["Login", "Sign in", "Continue", "Log in"]:
                try:
                    page.get_by_role("button", name=name, exact=False).first.click(timeout=1800)
                    print("clicked", name)
                    break
                except Exception:
                    pass
            page.wait_for_timeout(4000)

        # Google fallback
        if "login" in (page.url or "").lower():
            try:
                with ctx.expect_page(timeout=5000) as gp:
                    page.get_by_text("Google", exact=False).first.click(timeout=2500)
                g = gp.value
                g.wait_for_timeout(2000)
                if g.locator('input[type="email"], #identifierId').count():
                    g.locator('input[type="email"], #identifierId').first.fill(EMAIL)
                    g.locator("#identifierNext, button:has-text('Next')").first.click()
                    g.wait_for_timeout(2800)
                if g.locator('input[type="password"], input[name="Passwd"]').count():
                    g.locator('input[type="password"], input[name="Passwd"]').first.fill(PASSWORD)
                    g.locator("#passwordNext, button:has-text('Next')").first.click()
                    g.wait_for_timeout(8000)
            except Exception as e:
                print("google flow", e)

        page.wait_for_timeout(4000)
        page.screenshot(path=str(OUT / "after_login.png"), full_page=True)
        print("after_login", page.url)

        page.goto(URL, wait_until="domcontentloaded", timeout=90000)
        page.wait_for_timeout(8000)
        page.screenshot(path=str(OUT / "module.png"), full_page=True)
        print("module", page.url)

        token = ""
        dump = {}
        for pg in ctx.pages:
            try:
                dump = pg.evaluate(
                    """() => {
                      const out = { href: location.href, ls: {}, next: '' };
                      try {
                        for (let i = 0; i < localStorage.length; i++) {
                          const k = localStorage.key(i);
                          const v = localStorage.getItem(k) || '';
                          if (/token|jwt|auth|user|redux/i.test(k) || (v && v.length > 20 && v.length < 4000)) {
                            out.ls[k] = v.slice(0, 2500);
                          }
                        }
                      } catch (e) {}
                      const n = document.getElementById('__NEXT_DATA__');
                      out.next = n ? (n.textContent || '').slice(0, 20000) : '';
                      out.token = localStorage.getItem('token')
                        || localStorage.getItem('accessToken')
                        || sessionStorage.getItem('token')
                        || '';
                      return out;
                    }"""
                )
                token = (dump or {}).get("token") or token
            except Exception as e:
                print("eval", e)

        (OUT / "page_dump.json").write_text(json.dumps(dump, indent=2)[:500000], encoding="utf-8")
        slim = []
        for h in hits:
            slim.append({k: h[k] for k in h if k != "body" or (h.get("body") or "").startswith("{") or (h.get("body") or "").startswith("[")})
        (OUT / "network.json").write_text(json.dumps(slim[:400], indent=2)[:800000], encoding="utf-8")
        urls = sorted({h["url"] for h in hits if "url" in h})
        (OUT / "urls.txt").write_text("\n".join(urls), encoding="utf-8")
        print("urls", len(urls))
        for u in urls:
            if "/api/" in u:
                print("API", u[:220])

        if token and token.count(".") == 2:
            cfg = {}
            if CFG.exists():
                try:
                    cfg = json.loads(CFG.read_text(encoding="utf-8"))
                except Exception:
                    cfg = {}
            cfg.update({
                "apiBase": "https://web.getmarks.app",
                "token": token,
                "email": EMAIL,
                "updatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                "via": "playwright-pyq",
            })
            CFG.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
            print("SAVED token len", len(token))
        else:
            print("NO_JWT token_type", type(token), "ls_keys", list((dump or {}).get("ls") or {}).keys())

        ctx.storage_state(path=str(OUT / "storage.json"))
        browser.close()
    print("DONE", OUT)


if __name__ == "__main__":
    main()

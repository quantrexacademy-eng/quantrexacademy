import urllib.request

urls = [
    "https://cdn-question-pool.getmarks.app/pyq/jee_main_2026_watermark_improved/28S1_o_59_1_v2.png",
    "https://www.quantrexacademy.com/api/proxy-image?url="
    + urllib.parse.quote(
        "https://cdn-question-pool.getmarks.app/pyq/jee_main_2026_watermark_improved/28S1_o_59_1_v2.png",
        safe="",
    )
    + "&clean=1",
]
import urllib.parse

urls[1] = (
    "https://www.quantrexacademy.com/api/proxy-image?url="
    + urllib.parse.quote(
        "https://cdn-question-pool.getmarks.app/pyq/jee_main_2026_watermark_improved/28S1_o_59_1_v2.png",
        safe="",
    )
    + "&clean=1"
)

for u in urls:
    req = urllib.request.Request(u, headers={"User-Agent": "qx", "Referer": "https://web.getmarks.app/"})
    try:
        r = urllib.request.urlopen(req, timeout=20)
        print("OK", r.status, r.headers.get("content-type"), r.headers.get("content-length"), u[:90])
    except Exception as e:
        print("FAIL", type(e).__name__, e, u[:90])

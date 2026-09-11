from pathlib import Path
import re
p = Path(r"C:\Users\Admin\qx-hosting\app.html")
t = p.read_text(encoding="utf-8")
t = re.sub(r'window\.QX_BUILD="[^"]+"', 'window.QX_BUILD="qxicons1"', t)
p.write_bytes(t.encode("utf-8"))
Path(r"E:\quantrexacademy\app.html").write_bytes(t.encode("utf-8"))
print("ok", re.search(r'QX_BUILD="([^"]+)"', t).group(1))
print("icons", re.findall(r'<span class="ic">([^<]+)</span>', t)[:12])

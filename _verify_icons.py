import re
from pathlib import Path
t = Path(r"C:\Users\Admin\app-check.html").read_text(encoding="utf-8", errors="replace")
m = re.search(r'QX_BUILD="([^"]+)"', t)
print("build", m.group(1) if m else "none")
print("icons", re.findall(r'<span class="ic">([^<]+)</span>', t)[:14])
print("bad", len(re.findall(r'<span class="ic">\?+', t)))
print("has home emoji", "🏠" in t)

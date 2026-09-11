from pathlib import Path
import re
import shutil
import subprocess

root = Path(r"C:\Users\Admin\qx-hosting")
app = root / "app.html"
t = app.read_text(encoding="utf-8")
t = re.sub(r'marks-live\.js\?v=[^"]+', 'marks-live.js?v=qxproxy1', t)
t = re.sub(r'app\.js\?v=[^"]+', 'app.js?v=qxproxy1', t)
t = re.sub(r'question-format\.js\?v=[^"]+', 'question-format.js?v=qxproxy1', t)
t = re.sub(r'window\.QX_BUILD="[^"]+"', 'window.QX_BUILD="qxproxy1"', t)
app.write_bytes(t.encode("utf-8"))
for f in ("app.html", "app.js", "marks-live.js", "question-format.js"):
    shutil.copy2(root / f, Path(r"E:\quantrexacademy") / f)
print("files ready")

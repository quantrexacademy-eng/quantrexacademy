from pathlib import Path
import re
import shutil
import subprocess

root = Path(r"C:\Users\Admin\qx-hosting")
app = root / "app.html"
t = app.read_text(encoding="utf-8")
for name in ("app.js", "marks-live.js", "question-format.js"):
    t = re.sub(rf'{name}\?v=[^"]+', f'{name}?v=qxhang1', t)
t = re.sub(r'window\.QX_BUILD="[^"]+"', 'window.QX_BUILD="qxhang1"', t)
app.write_bytes(t.encode("utf-8"))
for f in ("app.html", "app.js", "marks-live.js", "question-format.js"):
    shutil.copy2(root / f, Path(r"E:\quantrexacademy") / f)
print("bumped qxhang1")
r = subprocess.run(
    [
        "firebase", "deploy", "--only", "hosting",
        "--project", "quantrexacademy-live",
        "--config", "firebase.hosting-c.json",
        "--non-interactive",
    ],
    cwd=r"E:\quantrexacademy",
)
print("exit", r.returncode)

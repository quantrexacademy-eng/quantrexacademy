#!/usr/bin/env python3
"""Restore official JEE Main 2025-01-29 S2 solution for id 37393. No shell interpolation."""
import json
from pathlib import Path

P = Path(r"E:\QUANTREX\website\data\banks\chapters\jee_main\mathematics\sets-and-relations.json")
IMG = (
    '<img src="/api/proxy-image?url=https%3A%2F%2Ffirebasestorage.googleapis.com%2Fv0%2Fb%2F'
    "quantrexacademy-app.firebasestorage.app%2Fo%2Fquestions%252Ffigs%252Fpyq%252Fjee_main%252F"
    "D9WPjjdEUit2TlHrZMTdWmtVlQMoEftGDBl2beTaqhA.original.fullsize.png%3Falt%3Dmedia&clean=1&v=wm2"
    '" data-qx-orig-src="https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app'
    "/o/questions%2Ffigs%2Fpyq%2Fjee_main%2FD9WPjjdEUit2TlHrZMTdWmtVlQMoEftGDBl2beTaqhA.original.fullsize.png"
    '?alt=media" data-qx-storage-src="https://firebasestorage.googleapis.com/v0/b/quantrexacademy-app.firebasestorage.app'
    "/o/questions%2Ffigs%2Fpyq%2Fjee_main%2FD9WPjjdEUit2TlHrZMTdWmtVlQMoEftGDBl2beTaqhA.original.fullsize.png"
    '?alt=media">'
)
SOL = (
    r"$\begin{aligned} S&=\{0,1,2,3,\ldots\} \\ "
    r"\log_e y&=x\log_e\left(\frac{2}{5}\right) \\ "
    r"\Rightarrow y&=\left(\frac{2}{5}\right)^x\end{aligned}$"
    "\n\n" + IMG + "<br>\n\n"
    r"Range of $R$ is $\left\{1,\dfrac{2}{5},\dfrac{4}{25},\ldots\right\}$. "
    r"This is an infinite GP with first term $1$ and common ratio $\dfrac{2}{5}$."
    "\n\n"
    r"Required sum $=1+\left(\dfrac{2}{5}\right)+\left(\dfrac{2}{5}\right)^2+\cdots"
    r"=\dfrac{1}{1-\dfrac{2}{5}}=\dfrac{5}{3}$."
)

def main():
    d = json.loads(P.read_text(encoding="utf-8"))
    hit = None
    for q in d.get("questions") or []:
        if str(q.get("id")) == "37393":
            q["solution"] = SOL
            q["questionType"] = "singleCorrect"
            hit = q
            break
    if not hit:
        raise SystemExit("37393 not found")
    P.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print("ok id", hit["id"], "sol_len", len(hit["solution"]))
    print("has_R", "$R$" in hit["solution"])
    print("has_5/3", r"\dfrac{5}{3}" in hit["solution"])
    print("has_img", "<img" in hit["solution"])
    print("has_log_y", r"\log _y" in hit["solution"] or r"\log_y" in hit["solution"])

if __name__ == "__main__":
    main()

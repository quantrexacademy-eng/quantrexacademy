import urllib.request
html = urllib.request.urlopen("https://www.quantrexacademy.com/app.html", timeout=40).read().decode("utf-8", "replace")
js = urllib.request.urlopen("https://www.quantrexacademy.com/math-render.js?v=qxfix35", timeout=40).read().decode("utf-8", "replace")
print("BUILD35", 'window.QX_BUILD = "qxfix35"' in html)
print("math35", "math-render.js?v=qxfix35" in html)
print("axis_park", "consume BOTH dollars" in js)
print("pt_junk", "stripLatexPtJunk" in js)
print("sgn", "professionalizeSgnPiecewise" in js)
print("space_glued", "function spaceGluedDollars" in js)

from pathlib import Path
import numpy as np
from PIL import Image
p = Path(r"C:\Users\Admin\qx-hosting\assets\diagrams\qx-book-6775bff4b335d00f.png")
im = Image.open(p).convert("RGB")
a = np.asarray(im)
h, w = a.shape[:2]
# center band where MARKS sits
y0, y1 = int(h*0.35), int(h*0.70)
x0, x1 = int(w*0.35), int(w*0.70)
crop = a[y0:y1, x0:x1]
r, g, b = crop[:,:,0].astype(int), crop[:,:,1].astype(int), crop[:,:,2].astype(int)
lum = 0.299*r + 0.587*g + 0.114*b
mx = np.maximum(np.maximum(r,g),b)
mn = np.minimum(np.minimum(r,g),b)
chroma = mx-mn
# non-white
mask = lum < 250
print("size", w, h, "crop", crop.shape, "nonwhite", int(mask.sum()))
if mask.any():
    print("lum min/med/max", float(lum[mask].min()), float(np.median(lum[mask])), float(lum[mask].max()))
    print("chroma min/med/max", float(chroma[mask].min()), float(np.median(chroma[mask])), float(chroma[mask].max()))
    print("mean rgb", float(r[mask].mean()), float(g[mask].mean()), float(b[mask].mean()))
    # count how many match previous cyan rule
    cyan = (b > r+6) & (b > g+2) & (lum > 125) & (lum < 238) & (chroma < 140)
    grey = (chroma < 30) & (lum > 140) & (lum < 225)
    print("cyan hits", int((cyan&mask).sum()), "grey hits", int((grey&mask).sum()))
    # show a few unique-ish colors
    flat = crop.reshape(-1,3)
    uniq = np.unique(flat, axis=0)
    # most common nonwhite
    from collections import Counter
    c = Counter(tuple(px) for px in flat if not (px[0]>248 and px[1]>248 and px[2]>248))
    print("top colors", c.most_common(12))

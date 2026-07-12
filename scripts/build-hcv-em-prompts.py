import json
import re
from pathlib import Path

CHAPTER = Path(
    r"E:\quantrexacademy\data\books\chapters\6a0addba4b032b031e049a36"
    r"\6a0addba4b032b031e049a36__6a2fdc56afb6d6932c18272b__"
    r"6a2fdc56afb6d6932c18272e__6a2fdc56afb6d6932c183850.json"
)

STYLE = (
    "Vibrant colorful educational physics textbook illustration, polished digital art, "
    "clean white background, no watermark, no logo, no brand text, no MARKS overlay, "
    "clear labels and arrows, semi-realistic cartoon style where people appear."
)

PROMPTS = {
    "figure_38_e1": "Circular conducting loop perpendicular to a uniform magnetic field shown with blue field lines and arrows, colorful coil in copper-orange, field vector B labeled, clean physics diagram.",
    "figure_38_e2": "Square conducting loop parallel to pole faces of a ring magnet, ring magnet shown in red-blue poles, loop in center, colorful educational diagram.",
    "figure_38_e4": "Bar magnet north pole moving down along axis toward horizontal circular coil, coil in copper color, magnetic flux lines, colorful physics illustration.",
    "figure_38_e5": "Square wire loop moving right at speed v toward a region of uniform magnetic field marked with X symbols into page, velocity arrow, colorful diagram.",
    "figure_38_e6": "Cylindrical region radius 10cm with uniform magnetic field B inside shown by X marks, wire loop outside, colorful physics diagram.",
    "figure_38_e7": "Cylindrical region with increasing magnetic field, circular loops and paths labeled, colorful EM induction diagram with arrows.",
    "figure_38_e8": "Circular coil N turns radius a connected to battery and rheostat variable resistor, circuit diagram colorful and clear.",
    "figure_38_e9": "Circular wheel radius 10cm, upper half dark iron semicircle lower half non-magnetic, rotating in magnetic field, colorful diagram.",
    "figure_38_e10": "Right-angled triangle wire abc moving at uniform speed v in plane inside magnetic field region with X symbols, velocity arrow, colorful.",
    "figure_38_e11": "Wire sliding on two parallel conducting rails separation l in perpendicular magnetic field B, colorful rails diagram with current direction.",
    "figure_38_e12": "Long U-shaped wire width l in magnetic field B, sliding wire of length l with velocity v, colorful electromagnetic induction rails.",
    "figure_38_e13": "Wire PQ mass m resistance r sliding on horizontal parallel rails in magnetic field, battery or resistor in circuit, colorful diagram.",
    "figure_38_e14": "Rectangular wire frame abcd 32cm by 8cm in magnetic field, labeled corners, colorful frame diagram.",
    "figure_38_e15": "Metallic wire resistance 0.20 ohm sliding on horizontal U-shaped metallic rails in magnetic field, colorful rails problem diagram.",
    "figure_38_e16": "Wire ab length l mass m resistance R slides on smooth thick metallic rails connected at ends, colorful sliding rod on rails.",
    "figure_38_e17": "Two sliding wires P1Q1 and P2Q2 on parallel rails with resistors 2 ohm and 19 ohm, dimension 4cm, magnetic field B=1.0T, colorful labeled diagram like a test circuit.",
    "figure_38_e18": "Wire PQ sliding on three rails at constant speed in magnetic field, triangular or Y rail arrangement, colorful.",
    "figure_38_e19": "Current generator Ig with constant current i, wire cd held on rails in magnetic field, colorful circuit rails diagram.",
    "figure_38_e20": "Current generator driving constant current, wire ab on rails in B field, colorful educational physics diagram.",
    "figure_38_e21": "Smooth rails with current generator Ig and sliding wire ab in magnetic field, colorful diagram.",
    "figure_38_e22": "Rectangular wire frame width d entering uniform magnetic field region from left, constant force F pushing frame, colorful diagram.",
    "figure_38_e23": "Thick metallic rails connected to battery emf E, sliding wire in magnetic field, colorful rails and battery circuit.",
    "figure_38_e24": "Conducting wire ab length l sliding down smooth vertical rails in magnetic field, gravity and induction setup, colorful diagram.",
    "figure_38_e25": "Conducting disc rotating about axis in perpendicular magnetic field B, resistor connected between center and rim, colorful diagram.",
    "figure_38_e26": "Long straight wire carrying current i and rod length l coplanar, rod moving with velocity, colorful diagram with magnetic field.",
    "figure_38_e27": "Square wire frame resistance r coplanar with long straight current-carrying wire, colorful mutual induction diagram.",
    "figure_38_e28": "Rectangular metallic loop length l width b coplanar with long wire carrying current i, colorful diagram.",
    "figure_38_e29": "Circular loop radius a in vertical plane in uniform magnetic field B perpendicular to plane, colorful diagram.",
    "figure_38_e30": "Circular loop radius a in vertical plane rotating in magnetic field B, colorful diagram with angular motion.",
    "figure_38_e31": "Wire mass m length l sliding on smooth vertical rails in magnetic field, colorful vertical rails diagram.",
    "figure_38_e32": "Cylindrical region with dotted boundary, uniform magnetic field B increasing with time inside cylinder, colorful diagram.",
}

with CHAPTER.open(encoding="utf-8") as f:
    data = json.load(f)

fig_info = {}
for i, q in enumerate(data.get("questions", [])):
    text = (q.get("q") or "") + (q.get("solution") or "")
    for src in re.findall(r'src=["\']([^"\']+)["\']', text):
        if not src.startswith("http"):
            continue
        key = re.search(r"figure_38_(e\d+)", src)
        if not key:
            continue
        k = key.group(1)
        if k not in fig_info:
            fig_info[k] = {
                "src": src,
                "out": f"/assets/diagrams/hcv-v2-em-induction-{k}.png",
                "file": f"hcv-v2-em-induction-{k}.png",
                "prompt": PROMPTS.get(f"figure_38_{k}", "Electromagnetic induction physics diagram colorful"),
                "sample_q": re.sub(r"<[^>]+>", " ", q.get("q") or "")[:200],
                "q_idxs": [],
                "q_ids": [],
            }
        fig_info[k]["q_idxs"].append(i + 1)
        fig_info[k]["q_ids"].append(q.get("id"))

manifest = {
    "style": STYLE,
    "figures": [
        {**v, "id": k, "style": STYLE + " " + v["prompt"]}
        for k, v in sorted(fig_info.items(), key=lambda x: int(re.sub(r"\D", "", x[0]) or 0))
    ],
}
out = Path(r"E:\quantrexacademy\data\hcv-em-induction-figures-manifest.json")
out.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
print("figures", len(manifest["figures"]))
print("wrote", out)
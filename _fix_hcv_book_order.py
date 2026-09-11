# Reorder HCV Vol 1 / Vol 2 like the printed book:
# Objective I -> Objective II -> Exercises, chapters in official order.
import json
from pathlib import Path

ROOT = Path(r"C:\Users\Admin\qx-hosting\data\nav\books")

VOL1_ORDER = [
    "Introduction to Physics",
    "Physics and Mathematics",
    "Rest and Motion   Kinematics",
    "The Forces",
    "Newton's Laws of Motion",
    "Friction",
    "Circular Motion",
    "Work and Energy",
    "Centre of Mass, Linear momentum, Collision",
    "Rotational Mechanics",
    "Gravitation",
    "Simple Harmonic Motion",
    "Fluid Mechanics",
    "Some Mechanical Properties of Matter",
    "Wave Motion and Waves on a String",
    "Sound Waves",
    "Light Waves",
    "Geometrical Optics",
    "Optical Instruments",
    "Dispersion and Spectra",
    "Speed of Light",
    "Photometry",
]

VOL2_ORDER = [
    "Heat and Temperature",
    "Kinetic Theory of Gases",
    "Calorimetry",
    "Laws of Thermodynamics",
    "Specific Heat Capacities of Gases",
    "Heat Transfer",
    "Electric Field and Potential",
    "Gauss's Law",
    "Capacitors",
    "Electric Current in Conductors",
    "Thermal and Chemical Effects of Electric Current",
    "Magnetic Field",
    "Magnetic Field due to a Current",
    "Permanent Magnets",
    "Magnetic Properties of Matter",
    "Electromagnetic Induction",
    "Alternating Current",
    "Electromagnetic Waves",
    "Electric Current through Gases",
    "Photoelectric Effect and Wave–Particle Duality",
    "Bohr's Model and Physics of the Atom",
    "X-rays",
    "Semiconductors and Semiconductor Devices",
    "The Nucleus",
    "The Special Theory of Relativity",
]

MODULE_ORDER = ["Objective I", "Objective II", "Exercises"]


def rank(name, order):
    n = (name or "").strip().lower().replace("–", "-").replace("—", "-")
    for i, o in enumerate(order):
        if n == o.strip().lower().replace("–", "-").replace("—", "-"):
            return i
    for i, o in enumerate(order):
        a = o.strip().lower()
        if n in a or a in n:
            return i
    return 900 + hash(n) % 50


def fix(path, order):
    p = Path(path)
    data = json.loads(p.read_text(encoding="utf-8"))
    mods = data.get("modules") or []
    by_title = {m.get("title"): m for m in mods}
    new_mods = []
    for title in MODULE_ORDER:
        if title in by_title:
            new_mods.append(by_title[title])
    for m in mods:
        if m.get("title") not in MODULE_ORDER:
            new_mods.append(m)
    for m in new_mods:
        for s in m.get("subjects") or []:
            chs = s.get("chapters") or []
            chs.sort(key=lambda c: rank(c.get("name"), order))
            s["chapters"] = chs
    data["modules"] = new_mods
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(p.name, [m["title"] for m in new_mods])
    if new_mods:
        print("  first chapters:", [c["name"] for c in new_mods[0]["subjects"][0]["chapters"][:5]])


if __name__ == "__main__":
    fix(ROOT / "69f9cc23681eab6d6021a4d1.json", VOL1_ORDER)
    fix(ROOT / "6a0addba4b032b031e049a36.json", VOL2_ORDER)

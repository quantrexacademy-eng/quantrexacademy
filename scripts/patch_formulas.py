#!/usr/bin/env python3
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from import_to_quantrex import load_formulas, build_formula_nav

USB = Path(r"E:\quantrexacademy")
formulas = load_formulas()
nav = build_formula_nav()
(USB / "data" / "nav" / "formulas.json").write_text(
    json.dumps(nav, ensure_ascii=False, indent=2), encoding="utf-8"
)
path = USB / "data.js"
text = path.read_text(encoding="utf-8")
new = "const FORMULAS = " + json.dumps(formulas, ensure_ascii=False, indent=2) + ";"
text = re.sub(r"const FORMULAS = \[.*?\];", new, text, count=1, flags=re.S)
path.write_text(text, encoding="utf-8")
chapters = sum(len(s["chapters"]) for s in nav)
print(f"Patched {len(formulas)} formulas, {chapters} nav chapters")
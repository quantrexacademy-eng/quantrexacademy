#!/usr/bin/env python3
"""Move FORMULAS out of data.js into data/formulas.json for faster page load."""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from import_to_quantrex import load_formulas

USB = Path(r"E:\quantrexacademy")
formulas = load_formulas()
out = USB / "data" / "formulas.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(formulas, ensure_ascii=False, indent=2), encoding="utf-8")

path = USB / "data.js"
text = path.read_text(encoding="utf-8")
loader = """
let FORMULAS = [];
let _formulasLoaded = false;
async function loadFormulas() {
  if (_formulasLoaded) return FORMULAS;
  const res = await fetch("data/formulas.json");
  FORMULAS = await res.json();
  _formulasLoaded = true;
  return FORMULAS;
}
"""
text = re.sub(r"const FORMULAS = \[.*?\];", loader.strip(), text, count=1, flags=re.S)
path.write_text(text, encoding="utf-8")
print(f"Externalized {len(formulas)} formulas → {out} ({out.stat().st_size // 1024} KB)")
print(f"data.js now {path.stat().st_size // 1024} KB")
#!/usr/bin/env python3
"""Generate premium Quantrex Academy digital book cover SVGs."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "book-covers"

COVERS = [
    {
        "file": "hc-verma-v2.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Concepts of", "Physics"],
        "subtitle": "MCQ Edition",
        "vol": "Volume 2",
        "author": "HC Verma",
        "meta": "Physics · IIT-JEE Prep",
        "colors": ["#0c1e4a", "#1e3a8a", "#2563eb", "#38bdf8"],
        "pattern": "waves",
        "equations": ["E = mc²", "F = ma", "λ = h/p", "∫ F·dx"],
        "accent": "⚛",
        "tag": None,
    },
    {
        "file": "hc-verma-v1.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Concepts of", "Physics"],
        "subtitle": "MCQ Edition",
        "vol": "Volume 1",
        "author": "HC Verma",
        "meta": "Physics · IIT-JEE Prep",
        "colors": ["#0c4a6e", "#0369a1", "#0284c7", "#7dd3fc"],
        "pattern": "waves",
        "equations": ["v = u + at", "P = IV", "τ = r × F"],
        "accent": "⚛",
        "tag": None,
    },
    {
        "file": "irodov.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["I.E. Irodov"],
        "subtitle": "General Physics",
        "vol": "Top Problems",
        "author": "Advanced Level",
        "meta": "Physics · JEE Advanced",
        "colors": ["#450a0a", "#991b1b", "#dc2626", "#fca5a5"],
        "pattern": "grid",
        "equations": ["∇·E", "ω² = k/m", "L = Iω"],
        "accent": "🔥",
        "tag": None,
    },
    {
        "file": "rank-booster.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Rank", "Booster"],
        "subtitle": "Most Important Qs",
        "vol": "JEE Advanced",
        "author": "Selected PYQs",
        "meta": "PCM · High Yield",
        "colors": ["#312e81", "#4338ca", "#6366f1", "#a5b4fc"],
        "pattern": "diagonal",
        "equations": ["ΣF = 0", "ΔG < 0", "∫∫"],
        "accent": "🚀",
        "tag": None,
    },
    {
        "file": "99-percentile.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["99", "Percentile"],
        "subtitle": "Question Bank",
        "vol": "High Yield",
        "author": "JEE Main",
        "meta": "PCM · Top Scorers",
        "colors": ["#78350f", "#b45309", "#d97706", "#fcd34d"],
        "pattern": "shine",
        "equations": ["99%", "σ²", "P(X)"],
        "accent": "👑",
        "tag": None,
    },
    {
        "file": "backlog-booster.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Backlog", "Booster"],
        "subtitle": "Selective Questions",
        "vol": "Clear Backlog",
        "author": "JEE Main",
        "meta": "PCM · Smart Revision",
        "colors": ["#9a3412", "#c2410c", "#ea580c", "#fdba74"],
        "pattern": "diagonal",
        "equations": ["t = ?", "v = s/t", "n!"],
        "accent": "⚡",
        "tag": None,
    },
    {
        "file": "olympiad.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Olympiad"],
        "subtitle": "Workbook",
        "vol": "Competitive",
        "author": "Challenge Qs",
        "meta": "PCM · Olympiad Prep",
        "colors": ["#134e4a", "#0f766e", "#14b8a6", "#5eead4"],
        "pattern": "grid",
        "equations": ["π", "∞", "Σn"],
        "accent": "🏅",
        "tag": None,
    },
    {
        "file": "biology-360.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Biology", "360/360"],
        "subtitle": "NEET 2026",
        "vol": "Complete Syllabus",
        "author": "NEET Biology",
        "meta": "Biology · Medical Prep",
        "colors": ["#14532d", "#15803d", "#22c55e", "#86efac"],
        "pattern": "waves",
        "equations": ["DNA", "ATP", "CO₂"],
        "accent": "🧬",
        "tag": "NEET",
    },
    {
        "file": "must-do-2024.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Must Do", "Top Qs"],
        "subtitle": "JEE Main 2024",
        "vol": "PYQ Edition",
        "author": "Essential PYQs",
        "meta": "PCM · Must Solve",
        "colors": ["#881337", "#be123c", "#e11d48", "#fda4af"],
        "pattern": "shine",
        "equations": ["2024", "PYQ", "★"],
        "accent": "⭐",
        "tag": "New",
    },
    {
        "file": "top-250.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Top 250"],
        "subtitle": "Single Correct",
        "vol": "2023 – 2020",
        "author": "JEE Main PYQ",
        "meta": "PCM · PYQ Collection",
        "colors": ["#1e3a8a", "#1d4ed8", "#3b82f6", "#93c5fd"],
        "pattern": "grid",
        "equations": ["250", "MCQ", "A B C D"],
        "accent": "🎯",
        "tag": "PYQ",
    },
    {
        "file": "top-100-numerical.svg",
        "publisher": "QUANTREX ACADEMY",
        "title_lines": ["Top 100"],
        "subtitle": "Numerical Qs",
        "vol": "2023 – 2020",
        "author": "Physics + Math",
        "meta": "Numerical · PYQ Bank",
        "colors": ["#065f46", "#047857", "#059669", "#6ee7b7"],
        "pattern": "diagonal",
        "equations": ["0.00", "×10ⁿ", "√"],
        "accent": "🔢",
        "tag": "Numerical",
    },
]


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def pattern_block(slug: str, kind: str, c3: str) -> str:
    if kind == "waves":
        return f"""
    <path d="M-20 320 Q80 260 180 320 T380 320" stroke="{c3}" stroke-opacity="0.18" stroke-width="2.5" fill="none"/>
    <path d="M-20 350 Q100 290 200 350 T400 350" stroke="{c3}" stroke-opacity="0.12" stroke-width="2" fill="none"/>
    <path d="M-20 380 Q60 340 160 380 T360 380" stroke="{c3}" stroke-opacity="0.08" stroke-width="1.5" fill="none"/>
    <path d="M200 40 Q260 100 220 180 Q180 260 250 340" stroke="rgba(255,255,255,0.1)" stroke-width="2" fill="none"/>"""
    if kind == "grid":
        lines = []
        for i in range(0, 320, 28):
            lines.append(
                f'<line x1="{i}" y1="0" x2="{i}" y2="400" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>'
            )
        for j in range(0, 420, 28):
            lines.append(
                f'<line x1="0" y1="{j}" x2="300" y2="{j}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>'
            )
        return "\n    ".join(lines)
    if kind == "diagonal":
        lines = []
        for i in range(-200, 500, 24):
            lines.append(
                f'<line x1="{i}" y1="400" x2="{i+200}" y2="0" stroke="rgba(255,255,255,0.07)" stroke-width="1.5"/>'
            )
        return "\n    ".join(lines)
    # shine
    return f"""
    <ellipse cx="220" cy="90" rx="120" ry="80" fill="url(#{slug}-shine)"/>"""


def equations_block(equations, slug) -> str:
    positions = [(200, 70), (230, 130), (180, 200), (240, 280)]
    parts = []
    for i, eq in enumerate(equations[:4]):
        x, y = positions[i]
        parts.append(
            f'<text x="{x}" y="{y}" fill="rgba(255,255,255,0.14)" font-family="Georgia,serif" font-size="15" font-style="italic" filter="url(#{slug}-glow)">{esc(eq)}</text>'
        )
    return "\n    ".join(parts)


def render_cover(cfg: dict) -> str:
    slug = cfg["file"].replace(".svg", "").replace("-", "")
    c0, c1, c2, c3 = cfg["colors"]
    title_y = 118
    title_lines = cfg["title_lines"]
    title_svg = []
    for i, line in enumerate(title_lines):
        y = title_y + i * 36
        title_svg.append(
            f'<text x="34" y="{y}" fill="rgba(0,0,0,0.35)" font-family="Literata,Georgia,serif" font-size="28" font-weight="700">{esc(line)}</text>'
        )
        title_svg.append(
            f'<text x="32" y="{y - 2}" fill="#ffffff" font-family="Literata,Georgia,serif" font-size="28" font-weight="700">{esc(line)}</text>'
        )
    title_block = "\n    ".join(title_svg)
    tag_block = ""
    if cfg.get("tag"):
        tag_block = f"""
    <rect x="32" y="52" width="72" height="22" rx="11" fill="rgba(255,255,255,0.22)"/>
    <text x="44" y="67" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="10" font-weight="800" letter-spacing="0.5">{esc(cfg["tag"])}</text>"""

    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400" role="img" aria-label="{esc(" ".join(title_lines))}">
  <defs>
    <linearGradient id="{slug}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="{c0}"/>
      <stop offset="35%" stop-color="{c1}"/>
      <stop offset="70%" stop-color="{c2}"/>
      <stop offset="100%" stop-color="{c3}"/>
    </linearGradient>
    <linearGradient id="{slug}-shine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.35)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <linearGradient id="{slug}-gloss" x1="0%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="rgba(255,255,255,0.22)"/>
      <stop offset="45%" stop-color="rgba(255,255,255,0.04)"/>
      <stop offset="100%" stop-color="rgba(255,255,255,0)"/>
    </linearGradient>
    <filter id="{slug}-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="1.8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="{slug}-emboss">
      <feDropShadow dx="0" dy="1.5" stdDeviation="1" flood-color="rgba(0,0,0,0.45)"/>
    </filter>
  </defs>
  <rect width="300" height="400" fill="url(#{slug}-bg)"/>
  {pattern_block(slug, cfg["pattern"], c3)}
  {equations_block(cfg["equations"], slug)}
  <rect x="0" y="0" width="22" height="400" fill="rgba(0,0,0,0.32)"/>
  <rect x="22" y="0" width="3" height="400" fill="rgba(255,255,255,0.08)"/>
  <rect x="296" y="0" width="4" height="400" fill="rgba(255,255,255,0.12)"/>
  <rect x="0" y="0" width="300" height="400" fill="url(#{slug}-gloss)"/>
  <text x="32" y="34" fill="rgba(255,255,255,0.88)" font-family="Inter,Arial,sans-serif" font-size="9" font-weight="800" letter-spacing="2.2">{esc(cfg["publisher"])}</text>
  {tag_block}
  {title_block}
  <text x="32" y="{title_y + len(title_lines) * 36 + 8}" fill="rgba(255,255,255,0.92)" font-family="Inter,Arial,sans-serif" font-size="13" font-weight="600" filter="url(#{slug}-emboss)">{esc(cfg["subtitle"])}</text>
  <rect x="32" y="{title_y + len(title_lines) * 36 + 20}" width="108" height="24" rx="12" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.25)" stroke-width="0.5"/>
  <text x="46" y="{title_y + len(title_lines) * 36 + 37}" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="700">{esc(cfg["vol"])}</text>
  <text x="32" y="{title_y + len(title_lines) * 36 + 78}" fill="#fff" font-family="Inter,Arial,sans-serif" font-size="20" font-weight="800">{esc(cfg["author"])}</text>
  <text x="32" y="{title_y + len(title_lines) * 36 + 102}" fill="rgba(255,255,255,0.82)" font-family="Inter,Arial,sans-serif" font-size="11" font-weight="600">{esc(cfg["meta"])}</text>
  <circle cx="248" cy="72" r="34" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
  <text x="248" y="82" text-anchor="middle" font-size="30" filter="url(#{slug}-glow)">{cfg["accent"]}</text>
  <rect x="0" y="372" width="300" height="28" fill="rgba(0,0,0,0.22)"/>
  <text x="32" y="390" fill="rgba(255,255,255,0.7)" font-family="Inter,Arial,sans-serif" font-size="9" font-weight="800" letter-spacing="1.8">DIGITAL EDITION</text>
  <text x="268" y="390" text-anchor="end" fill="rgba(255,255,255,0.55)" font-family="Inter,Arial,sans-serif" font-size="8" font-weight="700">QX</text>
</svg>
'''


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for cfg in COVERS:
        path = OUT / cfg["file"]
        path.write_text(render_cover(cfg), encoding="utf-8")
        print(f"wrote {path.name}")
    print(f"done — {len(COVERS)} covers")


if __name__ == "__main__":
    main()
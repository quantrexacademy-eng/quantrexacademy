"""
Irodov fix — HTML question text + figure-only image in q field.
"""
import html
import importlib.util
import json
import re
from pathlib import Path



ROOT = Path(r"E:\quantrexacademy")
IRODOV_DIR = ROOT / "data" / "books" / "chapters" / "69cfb5366ecf5579037d96a4"
SRC = ROOT / "assets" / "diagrams" / "irodov-src"
OUT = ROOT / "assets" / "diagrams"
MANIFEST = ROOT / "data" / "qx_irodov_figure_manifest.json"
TEXT_MANIFEST = ROOT / "data" / "qx_irodov_question_text.json"

_spec = importlib.util.spec_from_file_location("irodov", ROOT / "scripts" / "process-irodov-figures.py")
iro = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(iro)


def load_reverse_map():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rev = {}
    for broken, local in m.get("map", {}).items():
        rev[local] = broken
    return rev


def src_for_local(local_path: str, rev: dict):
    broken = rev.get(local_path)
    if not broken:
        return None
    cdn = iro.normalize_url(broken)
    stem = Path(cdn.split("?")[0]).name
    p = SRC / f"{iro.url_hash(broken)}_{stem}"
    return p if p.exists() else None


def ocr_question_text(src_path: Path) -> str:
    return iro.extract_question_text(src_path)


def is_garbage_text(text: str) -> bool:
    t = str(text or "").strip()
    if len(t) < 12:
        return True
    if re.search(r"MARKS|MaRK|#AI|getmarks", t, re.I):
        return True
    letters = sum(c.isalpha() for c in t)
    return letters < max(6, len(t) * 0.25)


def patch_q_field(old_q: str, text: str, img_src: str) -> str:
    m = re.search(r'(<img[^>]+>)', old_q, re.I)
    img_tag = m.group(1) if m else f'<img style="width:400px;" src="{img_src}">'
    if is_garbage_text(text):
        if "qx-irodov-q-text" in old_q:
            return re.sub(r'<p class="qx-irodov-q-text">[^<]*</p>', "", old_q)
        return old_q
    safe = html.escape(text)
    return f'<p class="qx-irodov-q-text">{safe}</p>{img_tag}'


def main():
    rev = load_reverse_map()
    text_map = {}
    if TEXT_MANIFEST.exists():
        text_map = json.loads(TEXT_MANIFEST.read_text(encoding="utf-8")).get("map", {})
    patched_qs = 0
    cleaned = 0
    n = 0

    for ch_file in IRODOV_DIR.glob("*.json"):
        data = json.loads(ch_file.read_text(encoding="utf-8"))
        changed = False
        for q in data.get("questions", []):
            old_q = q.get("q", "")
            m = re.search(r'src="([^"]+)"', old_q)
            if not m:
                continue
            local = m.group(1)
            src = src_for_local(local, rev)
            if not src:
                continue
            n += 1
            cached = text_map.get(local, "")
            text = cached if cached and not is_garbage_text(cached) else ocr_question_text(src)
            if is_garbage_text(text):
                text = ""
            text_map[local] = text
            new_q = patch_q_field(old_q, text, local)
            if new_q != old_q:
                q["q"] = new_q
                if text:
                    patched_qs += 1
                else:
                    cleaned += 1
                changed = True
            if n % 10 == 0:
                TEXT_MANIFEST.write_text(json.dumps({"version": 1, "map": text_map}, indent=2), encoding="utf-8")
                print(f"progress {n} patched={patched_qs} cleaned={cleaned}")
        if changed:
            ch_file.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")

    TEXT_MANIFEST.write_text(json.dumps({"version": 1, "map": text_map}, indent=2), encoding="utf-8")
    print("patched_questions", patched_qs, "cleaned_bad", cleaned, "text_entries", len(text_map))


if __name__ == "__main__":
    main()
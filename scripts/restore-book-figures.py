"""Re-apply qx-book local paths from manifest — does NOT reprocess PNGs."""
import json
from pathlib import Path

ROOT = Path(r"E:\quantrexacademy")
CHAPTERS = ROOT / "data" / "books" / "chapters"
MANIFEST = ROOT / "data" / "qx_book_figure_manifest.json"


def main():
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    url_map = m.get("map", {})
    changed = 0
    for book_dir in CHAPTERS.iterdir():
        if not book_dir.is_dir() or book_dir.name == "69cfb5366ecf5579037d96a4":
            continue
        for f in book_dir.glob("*.json"):
            blob = f.read_text(encoding="utf-8")
            new_blob = blob
            for url, local in url_map.items():
                new_blob = new_blob.replace(url, local)
            if new_blob != blob:
                f.write_text(new_blob, encoding="utf-8")
                changed += 1
    print("patched_chapter_files", changed, "map_size", len(url_map))


if __name__ == "__main__":
    main()
#!/usr/bin/env python3
"""Full watermark pipeline: scan → batch clean → audit report."""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "data" / "qx_image_scan.json"
MANIFEST = ROOT / "data" / "qx_clean_manifest.json"
REVIEW = ROOT / "data" / "qx_image_review.json"
RECREATE = ROOT / "data" / "qx_image_recreate.json"
AUDIT = ROOT / "data" / "qx_watermark_audit.json"


def run(cmd: list[str]) -> int:
    print("+", " ".join(cmd))
    return subprocess.call(cmd, cwd=ROOT)


def audit() -> dict:
    scan = json.loads(SCAN.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {"map": {}}
    review = json.loads(REVIEW.read_text(encoding="utf-8")) if REVIEW.exists() else {"flagged": []}
    recreate = json.loads(RECREATE.read_text(encoding="utf-8")) if RECREATE.exists() else {"queue": []}

    urls = scan.get("urls", [])
    cleaned = set(manifest.get("map", {}))
    flagged = set(review.get("flagged", []))
    done = cleaned | flagged
    remaining = [u for u in urls if u not in done]

    report = {
        "updated": int(time.time()),
        "total_scanned": len(urls),
        "cleaned": len(cleaned),
        "flagged_review": len(flagged),
        "recreate_queue": len(recreate.get("queue", [])),
        "remaining": len(remaining),
        "manifest_version": manifest.get("version"),
        "pct_complete": round(100 * len(done) / max(len(urls), 1), 2),
    }
    AUDIT.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))
    return report


def main():
    ap = argparse.ArgumentParser(description="Quantrex watermark pipeline")
    ap.add_argument("--scan", action="store_true", help="Rescan all JSON data for image URLs")
    ap.add_argument("--clean", type=int, default=0, help="Batch clean N images")
    ap.add_argument("--recreate", type=int, default=0, help="Aggressive recreate N flagged images")
    ap.add_argument("--audit-only", action="store_true", help="Only write audit report")
    args = ap.parse_args()

    py = sys.executable
    if args.scan:
        run([py, "scripts/scan_pool_images.py"])
    if args.clean > 0:
        run([py, "scripts/clean_diagram_images.py", "--limit", str(args.clean)])
    if args.recreate > 0:
        run([py, "scripts/recreate_diagrams.py", "--limit", str(args.recreate)])
    audit()


if __name__ == "__main__":
    main()
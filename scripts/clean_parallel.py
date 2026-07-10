#!/usr/bin/env python3
"""
Parallel watermark batch cleaner — splits work across N workers.
Each worker writes to its own shard manifest; merges at end.

Usage:
  python scripts/clean_parallel.py --workers 8 --per-worker 600
  python scripts/clean_parallel.py --workers 8 --per-worker 600 --merge-only
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "data" / "qx_image_scan.json"
MANIFEST = ROOT / "data" / "qx_clean_manifest.json"
REVIEW = ROOT / "data" / "qx_image_review.json"
SHARD_DIR = ROOT / "data" / "clean_shards"
CLEAN_VER = 3


def fix_url(url: str) -> str:
    return url.replace("https://.app/", "https://cdn-question-pool.getmarks.app/")


def load_json(path: Path, default):
    if path.exists():
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    return default


def save_json(path: Path, data):
    path.write_text(json.dumps(data, indent=2), encoding="utf-8")


def remaining_urls() -> list[str]:
    scan = load_json(SCAN, {"urls": []})
    manifest = load_json(MANIFEST, {"map": {}})
    review = load_json(REVIEW, {"flagged": []})
    done = set(manifest.get("map", {})) | set(review.get("flagged", []))
    return [fix_url(u) for u in scan.get("urls", []) if fix_url(u) not in done]


def shard_paths(worker_id: int) -> tuple[Path, Path, Path]:
    SHARD_DIR.mkdir(parents=True, exist_ok=True)
    urls = SHARD_DIR / f"urls_w{worker_id}.json"
    manifest = SHARD_DIR / f"manifest_w{worker_id}.json"
    review = SHARD_DIR / f"review_w{worker_id}.json"
    return urls, manifest, review


def run_worker(worker_id: int, url_list: list[str]) -> dict:
    urls_path, manifest_path, review_path = shard_paths(worker_id)
    save_json(urls_path, {"urls": url_list})
    cmd = [
        sys.executable,
        str(ROOT / "scripts" / "clean_diagram_images.py"),
        "--urls-file", str(urls_path),
        "--manifest-out", str(manifest_path),
        "--review-out", str(review_path),
        "--worker", str(worker_id),
    ]
    print(f"[worker {worker_id}] start n={len(url_list)}")
    t0 = time.time()
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    elapsed = round(time.time() - t0, 1)
    tail = (proc.stdout or "").strip().splitlines()[-3:]
    for line in tail:
        print(f"[worker {worker_id}] {line}")
    if proc.returncode != 0:
        print(f"[worker {worker_id}] STDERR: {(proc.stderr or '')[-500:]}")
    return {
        "worker": worker_id,
        "count": len(url_list),
        "ok": proc.returncode == 0,
        "elapsed": elapsed,
    }


def merge_shards() -> dict:
    manifest = load_json(MANIFEST, {"version": CLEAN_VER, "map": {}, "processed": 0})
    review = load_json(REVIEW, {"flagged": [], "reasons": {}})
    merged_ok = merged_flag = 0

    for shard_m in sorted(SHARD_DIR.glob("manifest_w*.json")):
        sm = load_json(shard_m, {"map": {}})
        for url, rel in sm.get("map", {}).items():
            if url not in manifest["map"]:
                manifest["map"][url] = rel
                merged_ok += 1

    for shard_r in sorted(SHARD_DIR.glob("review_w*.json")):
        sr = load_json(shard_r, {"flagged": [], "reasons": {}})
        for url in sr.get("flagged", []):
            if url not in review["flagged"]:
                review["flagged"].append(url)
                merged_flag += 1
        for url, reason in sr.get("reasons", {}).items():
            review["reasons"][url] = reason

    manifest["version"] = CLEAN_VER
    manifest["processed"] = len(manifest.get("map", {}))
    manifest["updated"] = int(time.time())
    review["count"] = len(review.get("flagged", []))
    save_json(MANIFEST, manifest)
    save_json(REVIEW, review)

    audit = {
        "merged_ok": merged_ok,
        "merged_flagged": merged_flag,
        "total_cleaned": len(manifest["map"]),
        "total_flagged": len(review["flagged"]),
    }
    print("MERGE", json.dumps(audit, indent=2))
    return audit


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=8, help="Parallel worker count")
    ap.add_argument("--per-worker", type=int, default=500, help="URLs per worker this run")
    ap.add_argument("--merge-only", action="store_true", help="Only merge shard manifests")
    args = ap.parse_args()

    if args.merge_only:
        merge_shards()
        return

    todo = remaining_urls()
    total_take = args.workers * args.per_worker
    batch = todo[:total_take]
    if not batch:
        print("nothing to do")
        merge_shards()
        return

    chunks: list[tuple[int, list[str]]] = []
    for i in range(args.workers):
        start = i * args.per_worker
        end = start + args.per_worker
        chunk = batch[start:end]
        if chunk:
            chunks.append((i, chunk))

    print(f"parallel workers={len(chunks)} urls={len(batch)} remaining={len(todo)}")
    t0 = time.time()
    results = []
    with ProcessPoolExecutor(max_workers=len(chunks)) as pool:
        futs = {pool.submit(run_worker, wid, urls): wid for wid, urls in chunks}
        for fut in as_completed(futs):
            results.append(fut.result())

    merge_shards()
    elapsed = round(time.time() - t0, 1)
    ok_workers = sum(1 for r in results if r["ok"])
    print(f"done workers_ok={ok_workers}/{len(results)} elapsed={elapsed}s")


if __name__ == "__main__":
    main()
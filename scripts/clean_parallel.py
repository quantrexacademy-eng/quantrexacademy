#!/usr/bin/env python3
"""
Parallel watermark batch cleaner — up to 100 workers in waves.
Each worker writes to its own shard manifest; merges at end.

Usage:
  python scripts/clean_parallel.py --workers 100 --per-worker 50 --loop
  python scripts/clean_parallel.py --merge-only
"""
from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
import time
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCAN = ROOT / "data" / "qx_image_scan.json"
MANIFEST = ROOT / "data" / "qx_clean_manifest.json"
REVIEW = ROOT / "data" / "qx_image_review.json"
PROGRESS = ROOT / "data" / "qx_watermark_progress.json"
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
    return (
        SHARD_DIR / f"urls_w{worker_id}.json",
        SHARD_DIR / f"manifest_w{worker_id}.json",
        SHARD_DIR / f"review_w{worker_id}.json",
    )


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
    t0 = time.time()
    proc = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    elapsed = round(time.time() - t0, 1)
    ok = proc.returncode == 0
    if ok:
        print(f"[w{worker_id}] done n={len(url_list)} {elapsed}s")
    else:
        print(f"[w{worker_id}] FAIL {(proc.stderr or '')[-200:]}")
    return {"worker": worker_id, "count": len(url_list), "ok": ok, "elapsed": elapsed}


def write_progress(extra: dict | None = None) -> dict:
    scan = load_json(SCAN, {"urls": []})
    manifest = load_json(MANIFEST, {"map": {}})
    review = load_json(REVIEW, {"flagged": []})
    done = set(manifest.get("map", {})) | set(review.get("flagged", []))
    total = len(scan.get("urls", []))
    remaining = total - len(done)
    state = {
        "updated": int(time.time()),
        "build": "qxtest483",
        "total_scanned": total,
        "cleaned": len(manifest.get("map", {})),
        "flagged": len(review.get("flagged", [])),
        "remaining": remaining,
        "pct_complete": round(100 * len(done) / max(total, 1), 2),
        "manifest_version": manifest.get("version"),
        "resume_command": "python scripts/clean_parallel.py --workers 100 --per-worker 50 --wave 25 --loop",
        "merge_command": "python scripts/clean_parallel.py --merge-only",
    }
    if extra:
        state.update(extra)
    save_json(PROGRESS, state)
    return state


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
    print("MERGE", json.dumps(audit))
    write_progress({"last_merge": audit})
    return audit


def run_wave(chunks: list[tuple[int, list[str]]], wave_size: int) -> list[dict]:
    results = []
    for i in range(0, len(chunks), wave_size):
        wave = chunks[i : i + wave_size]
        print(f"wave {i // wave_size + 1} workers={len(wave)}")
        with ProcessPoolExecutor(max_workers=min(wave_size, len(wave))) as pool:
            futs = {pool.submit(run_worker, wid, urls): wid for wid, urls in wave}
            for fut in as_completed(futs):
                results.append(fut.result())
    return results


def run_batch(workers: int, per_worker: int, wave_size: int) -> bool:
    todo = remaining_urls()
    total_take = workers * per_worker
    batch = todo[:total_take]
    if not batch:
        merge_shards()
        return False

    chunks: list[tuple[int, list[str]]] = []
    for i in range(workers):
        start = i * per_worker
        chunk = batch[start : start + per_worker]
        if chunk:
            chunks.append((i, chunk))

    print(f"AGENTS={len(chunks)} urls={len(batch)} remaining={len(todo)} wave={wave_size}")
    write_progress({"batch_urls": len(batch), "workers": len(chunks), "wave_size": wave_size, "status": "running"})
    t0 = time.time()
    results = run_wave(chunks, wave_size)
    merge_shards()
    elapsed = round(time.time() - t0, 1)
    ok_workers = sum(1 for r in results if r["ok"])
    imgs = sum(r["count"] for r in results if r["ok"])
    write_progress({
        "status": "batch_done",
        "last_batch_elapsed_sec": elapsed,
        "last_batch_workers_ok": ok_workers,
        "last_batch_images": imgs,
        "imgs_per_sec": round(imgs / max(elapsed, 1), 2),
    })
    print(f"BATCH DONE ok={ok_workers}/{len(results)} imgs={imgs} elapsed={elapsed}s rate={imgs/max(elapsed,1):.1f}/s")
    return True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=100, help="Total worker agents")
    ap.add_argument("--per-worker", type=int, default=100, help="URLs per agent")
    ap.add_argument("--wave", type=int, default=15, help="Concurrent agents per wave")
    ap.add_argument("--loop", action="store_true", help="Keep running until done")
    ap.add_argument("--merge-only", action="store_true")
    args = ap.parse_args()

    if args.merge_only:
        merge_shards()
        return

    wave = min(args.wave, args.workers, max(4, (os.cpu_count() or 4) * 2))

    if args.loop:
        rnd = 0
        while run_batch(args.workers, args.per_worker, wave):
            rnd += 1
            print(f"=== ROUND {rnd} COMPLETE ===")
        write_progress({"status": "complete"})
        print("ALL 50K IMAGES PROCESSED")
        return

    run_batch(args.workers, args.per_worker, wave)


if __name__ == "__main__":
    main()